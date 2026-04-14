/**
 * TanStack Query hooks for issue comments (activity messages).
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'

import {
  getComments,
  getActivityTimeline,
  createComment,
  updateComment,
  deleteComment,
  type CommentItem,
  type ActivityItem,
} from '@/repositories/activity'
import { getClient } from '@/client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMMENTS_STALE_TIME = 15_000       // 15 seconds
const COMMENTS_GC_TIME = 5 * 60_000     // 5 minutes

// ---------------------------------------------------------------------------
// useComments
// ---------------------------------------------------------------------------

export function useComments(
  issueId: string | undefined
): UseQueryResult<CommentItem[], Error> {
  return useQuery<CommentItem[], Error>({
    queryKey: ['activity', 'comments', issueId],
    queryFn: () => getComments(issueId!),
    staleTime: COMMENTS_STALE_TIME,
    gcTime: COMMENTS_GC_TIME,
    enabled: issueId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useActivityTimeline
// ---------------------------------------------------------------------------

export function useActivityTimeline(
  issueId: string | undefined
): UseQueryResult<ActivityItem[], Error> {
  return useQuery<ActivityItem[], Error>({
    queryKey: ['activity', 'timeline', issueId],
    queryFn: () => getActivityTimeline(issueId!),
    staleTime: COMMENTS_STALE_TIME,
    gcTime: COMMENTS_GC_TIME,
    enabled: issueId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useCreateComment
// ---------------------------------------------------------------------------

export interface CreateCommentParams {
  issueId: string
  projectId: string
  message: string
}

export function useCreateComment(): UseMutationResult<string, Error, CreateCommentParams> {
  const queryClient = useQueryClient()

  return useMutation<string, Error, CreateCommentParams>({
    mutationFn: (params) =>
      createComment(params.issueId, params.projectId, params.message),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['activity', 'comments', variables.issueId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['activity', 'timeline', variables.issueId],
      })
      // Also invalidate the issue detail (comment count may change)
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issue', variables.issueId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateComment
// ---------------------------------------------------------------------------

export interface UpdateCommentParams {
  commentId: string
  issueId: string
  projectId: string
  message: string
}

export function useUpdateComment(): UseMutationResult<void, Error, UpdateCommentParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateCommentParams>({
    mutationFn: (params) =>
      updateComment(params.commentId, params.projectId, params.message),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['activity', 'comments', variables.issueId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['activity', 'timeline', variables.issueId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useDeleteComment
// ---------------------------------------------------------------------------

export interface DeleteCommentParams {
  commentId: string
  issueId: string
  projectId: string
}

export function useDeleteComment(): UseMutationResult<void, Error, DeleteCommentParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteCommentParams>({
    mutationFn: (params) =>
      deleteComment(params.commentId, params.projectId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['activity', 'comments', variables.issueId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['activity', 'timeline', variables.issueId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issue', variables.issueId],
      })
    },
  })
}
