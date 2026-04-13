/**
 * TanStack Query hooks for chat threads.
 *
 * useThread: fetch parent message + replies.
 * useSendThreadReply: mutation with cache invalidation.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'

import { useConnectionStore } from '@/store/connection'

import {
  getThread,
  sendThreadReply,
  type MessageItem,
} from '@/repositories/chat'
import { getClient } from '@/client'
import { useWebSocketStore } from '@/store/websocket'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THREAD_STALE_TIME = 10_000           // 10 seconds (polling fallback)
const THREAD_STALE_TIME_WS = 5 * 60_000   // 5 minutes (WS connected)
const THREAD_GC_TIME = 2 * 60_000          // 2 minutes

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThreadData {
  parent: MessageItem
  replies: MessageItem[]
}

// ---------------------------------------------------------------------------
// useThread
// ---------------------------------------------------------------------------

export function useThread(
  messageId: string | undefined
): UseQueryResult<ThreadData, Error> {
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')

  return useQuery<ThreadData, Error>({
    queryKey: ['chat', 'thread', messageId],
    queryFn: () => getThread(messageId!),
    staleTime: wsConnected ? THREAD_STALE_TIME_WS : THREAD_STALE_TIME,
    gcTime: THREAD_GC_TIME,
    enabled: messageId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useSendThreadReply
// ---------------------------------------------------------------------------

interface SendThreadReplyParams {
  messageId: string
  spaceId: string
  content: string
  attachmentIds?: string[]
}

interface SendThreadReplyContext {
  previousData: ThreadData | undefined
}

export function useSendThreadReply(): UseMutationResult<MessageItem, Error, SendThreadReplyParams, SendThreadReplyContext> {
  const queryClient = useQueryClient()
  const currentSocialId = useConnectionStore((s) => s.currentSocialId) ?? 'unknown'

  return useMutation<MessageItem, Error, SendThreadReplyParams, SendThreadReplyContext>({
    mutationFn: (params) => sendThreadReply(params.messageId, params.content, params.attachmentIds),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['chat', 'thread', variables.messageId] })
      const previousData = queryClient.getQueryData<ThreadData>(['chat', 'thread', variables.messageId])

      // Optimistically add the reply
      if (previousData != null) {
        const optimisticReply: MessageItem = {
          _id: `optimistic-reply-${Date.now()}`,
          content: variables.content,
          sender: currentSocialId,
          senderName: 'You',
          createdOn: Date.now(),
          modifiedOn: Date.now(),
          space: variables.spaceId,
          reactions: [],
          replyCount: 0,
          threadLastReply: 0,
          attachedTo: variables.messageId,
          attachments: [],
        }

        queryClient.setQueryData<ThreadData>(
          ['chat', 'thread', variables.messageId],
          {
            parent: previousData.parent,
            replies: [...previousData.replies, optimisticReply],
          }
        )
      }

      return { previousData }
    },

    onError: (_error, variables, context) => {
      if (context?.previousData != null) {
        queryClient.setQueryData(
          ['chat', 'thread', variables.messageId],
          context.previousData
        )
      }
    },

    onSettled: (_data, _error, variables) => {
      // Refresh thread
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'thread', variables.messageId],
      })
      // Refresh channel messages (reply count may have changed)
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', variables.spaceId],
      })
    },
  })
}
