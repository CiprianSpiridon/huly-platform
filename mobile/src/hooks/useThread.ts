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

import {
  getThread,
  sendThreadReply,
  type MessageItem,
} from '@/repositories/chat'
import { getClient } from '@/client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THREAD_STALE_TIME = 10_000   // 10 seconds
const THREAD_GC_TIME = 2 * 60_000 // 2 minutes

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
  return useQuery<ThreadData, Error>({
    queryKey: ['chat', 'thread', messageId],
    queryFn: () => getThread(messageId!),
    staleTime: THREAD_STALE_TIME,
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
}

interface SendThreadReplyContext {
  previousData: ThreadData | undefined
}

export function useSendThreadReply(): UseMutationResult<MessageItem, Error, SendThreadReplyParams, SendThreadReplyContext> {
  const queryClient = useQueryClient()

  return useMutation<MessageItem, Error, SendThreadReplyParams, SendThreadReplyContext>({
    mutationFn: (params) => sendThreadReply(params.messageId, params.content),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['chat', 'thread', variables.messageId] })
      const previousData = queryClient.getQueryData<ThreadData>(['chat', 'thread', variables.messageId])

      // Optimistically add the reply
      if (previousData != null) {
        const optimisticReply: MessageItem = {
          _id: `optimistic-reply-${Date.now()}`,
          content: variables.content,
          sender: 'me',
          senderName: 'You',
          createdOn: Date.now(),
          modifiedOn: Date.now(),
          space: variables.spaceId,
          reactions: [],
          replyCount: 0,
          threadLastReply: 0,
          attachedTo: variables.messageId,
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
