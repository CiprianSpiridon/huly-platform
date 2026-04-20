/**
 * TanStack Query hooks for chat messages.
 *
 * useMessages: infinite query for inverted message list.
 * useSendMessage: mutation with optimistic update (insert at top, rollback on error).
 * useToggleReaction: mutation for adding/removing reactions.
 */

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type InfiniteData,
} from '@tanstack/react-query'

import { useConnectionStore } from '@/store/connection'
import { useWebSocketStore } from '@/store/websocket'
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  addReaction,
  removeReaction,
  type CursorPaginatedResult,
  type MessageItem,
} from '@/repositories/chat'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MESSAGES_STALE_TIME = 10_000           // 10 seconds (polling fallback)
const MESSAGES_STALE_TIME_WS = 5 * 60_000   // 5 minutes (WS connected)
const MESSAGES_GC_TIME = 2 * 60_000          // 2 minutes

// ---------------------------------------------------------------------------
// useMessages (infinite query, inverted)
// ---------------------------------------------------------------------------

export function useMessages(
  spaceId: string | undefined
): UseInfiniteQueryResult<CursorPaginatedResult<MessageItem>, Error> {
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')
  const clientReady = useConnectionStore((s) => s.status === 'connected')

  return useInfiniteQuery<
    CursorPaginatedResult<MessageItem>,
    Error,
    CursorPaginatedResult<MessageItem>,
    readonly unknown[],
    string | undefined
  >({
    queryKey: ['chat', 'messages', spaceId] as const,
    queryFn: ({ pageParam }) =>
      getMessages(spaceId!, { cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: wsConnected ? MESSAGES_STALE_TIME_WS : MESSAGES_STALE_TIME,
    gcTime: MESSAGES_GC_TIME,
    enabled: spaceId !== undefined && clientReady,
    select: (data) => {
      // Flatten all pages into a single result, newest first
      const allItems = data.pages.flatMap((page) => page.items)
      const lastPage = data.pages[data.pages.length - 1]
      return {
        items: allItems,
        nextCursor: lastPage?.nextCursor,
        hasMore: lastPage?.hasMore ?? false,
      }
    },
  })
}

// ---------------------------------------------------------------------------
// useSendMessage (optimistic)
// ---------------------------------------------------------------------------

interface SendMessageParams {
  spaceId: string
  content: string
  attachmentIds?: string[]
}

interface SendMessageContext {
  previousData: unknown
}

export function useSendMessage(): UseMutationResult<MessageItem, Error, SendMessageParams, SendMessageContext> {
  const queryClient = useQueryClient()

  return useMutation<MessageItem, Error, SendMessageParams, SendMessageContext>({
    mutationFn: (params) => sendMessage(params.spaceId, params.content, params.attachmentIds),

    onMutate: async (variables) => {
      // Cancel any outgoing refetches for this channel's messages
      await queryClient.cancelQueries({ queryKey: ['chat', 'messages', variables.spaceId] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['chat', 'messages', variables.spaceId])

      // Read currentSocialId fresh from the store to avoid stale closure captures.
      // If we don't know the current social id yet, fall back to non-optimistic
      // behaviour so we never stamp a message with 'unknown' (which breaks
      // sender-equality checks downstream).
      const currentSocialId = useConnectionStore.getState().currentSocialId
      if (currentSocialId == null) {
        return { previousData }
      }

      // Optimistically add the new message at the top (newest first)
      const optimisticMessage: MessageItem = {
        _id: `optimistic-${Date.now()}`,
        content: variables.content,
        sender: currentSocialId,
        senderName: 'You',
        createdOn: Date.now(),
        modifiedOn: Date.now(),
        space: variables.spaceId,
        reactions: [],
        replyCount: 0,
        threadLastReply: 0,
        pinned: false,
        attachments: [],
      }

      queryClient.setQueryData<InfiniteData<CursorPaginatedResult<MessageItem>>>(
        ['chat', 'messages', variables.spaceId],
        (old) => {
          if (old == null) return old
          const firstPage = old.pages[0]
          if (firstPage == null) return old
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                items: [optimisticMessage, ...firstPage.items],
              },
              ...old.pages.slice(1),
            ],
          }
        }
      )

      return { previousData }
    },

    onError: (_error, variables, context) => {
      // Roll back to the previous value
      if (context?.previousData != null) {
        queryClient.setQueryData(
          ['chat', 'messages', variables.spaceId],
          context.previousData
        )
      }
    },

    onSettled: (_data, _error, variables) => {
      // Always refetch after mutation to sync with server
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', variables.spaceId],
      })
      // Also refresh channel list (last message preview may have changed)
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'channels'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useToggleReaction
// ---------------------------------------------------------------------------

interface ToggleReactionParams {
  messageId: string
  spaceId: string
  emoji: string
  /** Whether the current user already reacted with this emoji. */
  hasReacted: boolean
}

interface ToggleReactionContext {
  previousData: unknown
  previousThreadData: Array<[readonly unknown[], unknown]>
}

export function useToggleReaction(): UseMutationResult<void, Error, ToggleReactionParams, ToggleReactionContext> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ToggleReactionParams, ToggleReactionContext>({
    mutationFn: async (params) => {
      if (params.hasReacted) {
        await removeReaction(params.messageId, params.emoji)
      } else {
        await addReaction(params.messageId, params.emoji)
      }
    },

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['chat', 'messages', variables.spaceId] })
      const previousData = queryClient.getQueryData(['chat', 'messages', variables.spaceId])

      // Read currentSocialId fresh from the store to avoid stale closure captures.
      // If we don't know who we are yet, skip the optimistic update entirely
      // rather than attributing the reaction to 'unknown' and corrupting the
      // userIds list on conflict.
      const currentSocialId = useConnectionStore.getState().currentSocialId
      if (currentSocialId == null) {
        return { previousData, previousThreadData: [] }
      }

      // Optimistically update reaction counts
      queryClient.setQueryData<InfiniteData<CursorPaginatedResult<MessageItem>>>(
        ['chat', 'messages', variables.spaceId],
        (old) => {
          if (old == null) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((msg) => {
                if (msg._id !== variables.messageId) return msg
                const reactions = [...msg.reactions]
                const existingIdx = reactions.findIndex((r) => r.emoji === variables.emoji)

                if (variables.hasReacted) {
                  // Remove reaction
                  if (existingIdx >= 0) {
                    const existing = reactions[existingIdx]!
                    if (existing.count <= 1) {
                      reactions.splice(existingIdx, 1)
                    } else {
                      reactions[existingIdx] = {
                        ...existing,
                        count: existing.count - 1,
                        userIds: existing.userIds.filter((id) => id !== currentSocialId),
                      }
                    }
                  }
                } else {
                  // Add reaction
                  if (existingIdx >= 0) {
                    const existing = reactions[existingIdx]!
                    reactions[existingIdx] = {
                      ...existing,
                      count: existing.count + 1,
                      userIds: [...existing.userIds, currentSocialId],
                    }
                  } else {
                    reactions.push({
                      emoji: variables.emoji,
                      count: 1,
                      userIds: [currentSocialId],
                    })
                  }
                }

                return { ...msg, reactions }
              }),
            })),
          }
        }
      )

      const threadQueries = queryClient.getQueriesData<{ parent: MessageItem; replies: MessageItem[] }>({ queryKey: ['chat', 'thread'] })
      const previousThreadData: Array<[readonly unknown[], unknown]> = threadQueries.map(
        // Hermes lacks structuredClone; JSON round-trip is sufficient here because
        // the cached thread data is already a plain JSON-serializable shape.
        ([key, data]) => [key, data != null ? JSON.parse(JSON.stringify(data)) as unknown : data] as [readonly unknown[], unknown]
      )
      for (const [key, data] of threadQueries) {
        if (!data) continue
        const allMessages = [data.parent, ...data.replies]
        const target = allMessages.find((m) => m._id === variables.messageId)
        if (target) {
          const updatedMessages = allMessages.map((m) => {
            if (m._id !== variables.messageId) return m
            const reactions = [...m.reactions]
            const existingIdx = reactions.findIndex((r) => r.emoji === variables.emoji)

            if (variables.hasReacted) {
              if (existingIdx >= 0) {
                const existing = reactions[existingIdx]!
                if (existing.count <= 1) {
                  reactions.splice(existingIdx, 1)
                } else {
                  reactions[existingIdx] = {
                    ...existing,
                    count: existing.count - 1,
                    userIds: existing.userIds.filter((uid) => uid !== currentSocialId),
                  }
                }
              }
            } else {
              if (existingIdx >= 0) {
                const existing = reactions[existingIdx]!
                reactions[existingIdx] = {
                  ...existing,
                  count: existing.count + 1,
                  userIds: [...existing.userIds, currentSocialId],
                }
              } else {
                reactions.push({
                  emoji: variables.emoji,
                  count: 1,
                  userIds: [currentSocialId],
                })
              }
            }

            return { ...m, reactions }
          })
          queryClient.setQueryData(key, {
            parent: updatedMessages[0],
            replies: updatedMessages.slice(1),
          })
        }
      }

      return { previousData, previousThreadData }
    },

    onError: (_error, variables, context) => {
      if (context?.previousData != null) {
        queryClient.setQueryData(
          ['chat', 'messages', variables.spaceId],
          context.previousData
        )
      }
      if (context?.previousThreadData != null) {
        for (const [key, data] of context.previousThreadData) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', variables.spaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'thread', variables.messageId],
      })
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'chat' && query.queryKey[1] === 'thread',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useEditMessage (optimistic)
// ---------------------------------------------------------------------------

interface EditMessageParams {
  messageId: string
  spaceId: string
  content: string
}

interface EditMessageContext {
  previousData: unknown
}

export function useEditMessage(): UseMutationResult<void, Error, EditMessageParams, EditMessageContext> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, EditMessageParams, EditMessageContext>({
    mutationFn: (params) => editMessage(params.messageId, params.content),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['chat', 'messages', variables.spaceId] })
      const previousData = queryClient.getQueryData(['chat', 'messages', variables.spaceId])

      // Optimistically update the message content
      queryClient.setQueryData<InfiniteData<CursorPaginatedResult<MessageItem>>>(
        ['chat', 'messages', variables.spaceId],
        (old) => {
          if (old == null) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((msg) => {
                if (msg._id !== variables.messageId) return msg
                return {
                  ...msg,
                  content: variables.content,
                  modifiedOn: Date.now(),
                }
              }),
            })),
          }
        }
      )

      return { previousData }
    },

    onError: (_error, variables, context) => {
      if (context?.previousData != null) {
        queryClient.setQueryData(
          ['chat', 'messages', variables.spaceId],
          context.previousData
        )
      }
    },

    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', variables.spaceId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useDeleteMessage (optimistic)
// ---------------------------------------------------------------------------

interface DeleteMessageParams {
  messageId: string
  spaceId: string
}

interface DeleteMessageContext {
  previousData: unknown
}

export function useDeleteMessage(): UseMutationResult<void, Error, DeleteMessageParams, DeleteMessageContext> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteMessageParams, DeleteMessageContext>({
    mutationFn: (params) => deleteMessage(params.messageId),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['chat', 'messages', variables.spaceId] })
      const previousData = queryClient.getQueryData(['chat', 'messages', variables.spaceId])

      // Optimistically remove the message
      queryClient.setQueryData<InfiniteData<CursorPaginatedResult<MessageItem>>>(
        ['chat', 'messages', variables.spaceId],
        (old) => {
          if (old == null) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((msg) => msg._id !== variables.messageId),
            })),
          }
        }
      )

      return { previousData }
    },

    onError: (_error, variables, context) => {
      if (context?.previousData != null) {
        queryClient.setQueryData(
          ['chat', 'messages', variables.spaceId],
          context.previousData
        )
      }
    },

    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', variables.spaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'channels'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// usePinMessage
// ---------------------------------------------------------------------------

interface PinMessageParams {
  messageId: string
  spaceId: string
  isPinned: boolean
}

export function usePinMessage(): UseMutationResult<void, Error, PinMessageParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, PinMessageParams>({
    mutationFn: async (params) => {
      if (params.isPinned) {
        await unpinMessage(params.messageId)
      } else {
        await pinMessage(params.messageId)
      }
    },

    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', variables.spaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'pinnedMessages', variables.spaceId],
      })
    },
  })
}
