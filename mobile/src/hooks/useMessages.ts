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
import {
  getMessages,
  sendMessage,
  addReaction,
  removeReaction,
  type CursorPaginatedResult,
  type MessageItem,
} from '@/repositories/chat'
import { getClient } from '@/client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MESSAGES_STALE_TIME = 10_000   // 10 seconds
const MESSAGES_GC_TIME = 2 * 60_000 // 2 minutes

// ---------------------------------------------------------------------------
// useMessages (infinite query, inverted)
// ---------------------------------------------------------------------------

export function useMessages(
  spaceId: string | undefined
): UseInfiniteQueryResult<CursorPaginatedResult<MessageItem>, Error> {
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
    staleTime: MESSAGES_STALE_TIME,
    gcTime: MESSAGES_GC_TIME,
    enabled: spaceId !== undefined && getClient() !== null,
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
}

interface SendMessageContext {
  previousData: unknown
}

export function useSendMessage(): UseMutationResult<MessageItem, Error, SendMessageParams, SendMessageContext> {
  const queryClient = useQueryClient()
  const currentSocialId = useConnectionStore((s) => s.currentSocialId) ?? 'unknown'

  return useMutation<MessageItem, Error, SendMessageParams, SendMessageContext>({
    mutationFn: (params) => sendMessage(params.spaceId, params.content),

    onMutate: async (variables) => {
      // Cancel any outgoing refetches for this channel's messages
      await queryClient.cancelQueries({ queryKey: ['chat', 'messages', variables.spaceId] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['chat', 'messages', variables.spaceId])

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
}

export function useToggleReaction(): UseMutationResult<void, Error, ToggleReactionParams, ToggleReactionContext> {
  const queryClient = useQueryClient()
  const currentSocialId = useConnectionStore((s) => s.currentSocialId) ?? 'unknown'

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
