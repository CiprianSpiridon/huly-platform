/**
 * TanStack Query hooks for Huly tracker issues.
 *
 * useIssues: infinite query for paginated issue lists.
 * useCreateIssue / useUpdateIssue / useDeleteIssue: mutation hooks with cache invalidation.
 * useUpdateIssueField: inline field editing mutation.
 * useCreateSubIssue: create sub-issue mutation.
 * useCreateTimeReport: log time mutation.
 * useSearchIssues: debounced fulltext search.
 */

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { Ref, Space, Doc } from '@hcengineering/core'
import type { Issue, IssueStatus } from '@hcengineering/tracker'

import {
  getIssues,
  searchIssues,
  deleteIssue,
  updateIssueField,
  createSubIssue,
  createTimeReport,
  getSubIssues,
  type IssueCursor,
  type IssueFilters,
  type IssueSort,
  type PaginatedResult,
  type IssueSearchResult,
} from '@/repositories/tracker'
import { getClient } from '@/client'
import { useWebSocketStore } from '@/store/websocket'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ISSUES_STALE_TIME = 30_000             // 30 seconds (polling fallback)
const ISSUES_STALE_TIME_WS = 5 * 60_000     // 5 minutes (WS connected)
const ISSUES_GC_TIME = 5 * 60_000           // 5 minutes
const SEARCH_STALE_TIME = 10_000             // 10 seconds
const SUB_ISSUES_STALE_TIME = 60_000         // 1 minute

/**
 * Tracker class ref for Issue -- avoids value import from @hcengineering/tracker.
 */
const ISSUE_CLASS = 'tracker:class:Issue' as Ref<Doc>

// ---------------------------------------------------------------------------
// useIssues (infinite query)
// ---------------------------------------------------------------------------

export function useIssues(
  projectId: string | undefined,
  filters?: IssueFilters,
  sort?: IssueSort
): UseInfiniteQueryResult<PaginatedResult<Issue>, Error> {
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')
  const sortKey = sort?.key ?? 'modifiedOn'

  return useInfiniteQuery<PaginatedResult<Issue>, Error, PaginatedResult<Issue>, readonly unknown[], IssueCursor>({
    queryKey: ['tracker', 'issues', projectId, filters, sort] as const,
    queryFn: ({ pageParam }) =>
      getIssues(projectId as Ref<Space>, filters, sort, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined
      const lastItem = lastPage.items[lastPage.items.length - 1]
      if (lastItem == null) return undefined
      return {
        sortValue: (lastItem as unknown as Record<string, unknown>)[sortKey] as number,
        id: lastItem._id as string,
      }
    },
    staleTime: wsConnected ? ISSUES_STALE_TIME_WS : ISSUES_STALE_TIME,
    gcTime: ISSUES_GC_TIME,
    enabled: projectId !== undefined && getClient() !== null,
    select: (data) => {
      // Flatten all pages into a single PaginatedResult
      const allItems = data.pages.flatMap((page) => page.items)
      const lastPage = data.pages[data.pages.length - 1]
      return {
        items: allItems,
        total: lastPage?.total ?? 0,
        hasMore: lastPage?.hasMore ?? false,
      }
    },
  })
}

// ---------------------------------------------------------------------------
// useSubIssues
// ---------------------------------------------------------------------------

export function useSubIssues(
  parentIssueId: string | undefined
): UseQueryResult<Issue[], Error> {
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')

  return useQuery<Issue[], Error>({
    queryKey: ['tracker', 'subIssues', parentIssueId],
    queryFn: () => getSubIssues(parentIssueId as Ref<Issue>),
    staleTime: wsConnected ? ISSUES_STALE_TIME_WS : SUB_ISSUES_STALE_TIME,
    gcTime: ISSUES_GC_TIME,
    enabled: parentIssueId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useSearchIssues
// ---------------------------------------------------------------------------

export function useSearchIssues(
  query: string,
  limit: number = 20
): UseQueryResult<IssueSearchResult[], Error> {
  return useQuery<IssueSearchResult[], Error>({
    queryKey: ['tracker', 'search', query, limit],
    queryFn: () => searchIssues(query, limit),
    staleTime: SEARCH_STALE_TIME,
    enabled: query.length >= 2 && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useCreateIssue
// ---------------------------------------------------------------------------

export interface CreateIssueDraft {
  title: string
  description: string
  priority: number
  status: Ref<IssueStatus>
  assignee?: Ref<Doc> | null
  projectId: Ref<Space>
  component?: Ref<Doc> | null
  milestone?: Ref<Doc> | null
  estimation?: number
  dueDate?: number | null
  parentIssue?: Ref<Doc> | null
  labels?: string[]
}

export function useCreateIssue(): UseMutationResult<Ref<Doc>, Error, CreateIssueDraft> {
  const queryClient = useQueryClient()

  return useMutation<Ref<Doc>, Error, CreateIssueDraft>({
    mutationFn: async (draft) => {
      const client = getClient()
      if (client === null) {
        throw new Error('HulyClient not connected')
      }
      const { TxFactory } = await import('@hcengineering/core')
      // Use authenticated account's PersonId for correct modifiedBy metadata
      const account = await client.getAccount()
      const factory = new TxFactory(account.primarySocialId)
      // Only send user-owned fields — platform handles number, identifier,
      // kind, rank, and other read-only/computed fields server-side
      const attrs: Record<string, unknown> = {
          title: draft.title,
          priority: draft.priority,
        }
      // Only include optional fields if user provided them
      if (draft.description) attrs.description = draft.description
      if (draft.status != null) attrs.status = draft.status
      if (draft.assignee) attrs.assignee = draft.assignee
      if (draft.component != null) attrs.component = draft.component
      if (draft.milestone != null) attrs.milestone = draft.milestone
      if (draft.estimation != null) attrs.estimation = draft.estimation
      if (draft.dueDate != null) attrs.dueDate = draft.dueDate
      if (draft.parentIssue != null) attrs.attachedTo = draft.parentIssue

      const tx = factory.createTxCreateDoc(
        ISSUE_CLASS as unknown as Ref<import('@hcengineering/core').Class<Issue>>,
        draft.projectId,
        attrs as unknown as import('@hcengineering/core').Data<Issue>
      )
      await client.tx(tx)
      return tx.objectId as Ref<Doc>
    },
    onSuccess: (_data, variables) => {
      // Invalidate all issue lists for this project
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issues', variables.projectId],
      })
      // Also invalidate project list (issue counts may have changed)
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'projects'],
      })
      // If it has a parent, invalidate sub-issues
      if (variables.parentIssue != null) {
        void queryClient.invalidateQueries({
          queryKey: ['tracker', 'subIssues', variables.parentIssue],
        })
        void queryClient.invalidateQueries({
          queryKey: ['tracker', 'issue', variables.parentIssue],
        })
      }
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateIssue
// ---------------------------------------------------------------------------

export interface UpdateIssueParams {
  issueId: Ref<Issue>
  projectId: Ref<Space>
  update: Record<string, unknown>
}

export function useUpdateIssue(): UseMutationResult<void, Error, UpdateIssueParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateIssueParams>({
    mutationFn: async (params) => {
      const client = getClient()
      if (client === null) {
        throw new Error('HulyClient not connected')
      }
      const { TxFactory } = await import('@hcengineering/core')
      // Use authenticated account's PersonId for correct modifiedBy metadata
      const account = await client.getAccount()
      const factory = new TxFactory(account.primarySocialId)
      const tx = factory.createTxUpdateDoc(
        ISSUE_CLASS as unknown as Ref<import('@hcengineering/core').Class<Issue>>,
        params.projectId,
        params.issueId,
        params.update as import('@hcengineering/core').DocumentUpdate<Issue>
      )
      await client.tx(tx)
    },
    onSuccess: (_data, variables) => {
      // Invalidate detail and list queries
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issue', variables.issueId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issues', variables.projectId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateIssueField (convenience for single field updates)
// ---------------------------------------------------------------------------

export interface UpdateIssueFieldParams {
  issueId: Ref<Issue>
  projectId: Ref<Space>
  field: string
  value: unknown
}

export function useUpdateIssueField(): UseMutationResult<void, Error, UpdateIssueFieldParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateIssueFieldParams>({
    mutationFn: async (params) => {
      await updateIssueField(params.issueId, params.projectId, params.field, params.value)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issue', variables.issueId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issues', variables.projectId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useDeleteIssue
// ---------------------------------------------------------------------------

export interface DeleteIssueParams {
  issueId: Ref<Issue>
  projectId: Ref<Space>
}

export function useDeleteIssue(): UseMutationResult<void, Error, DeleteIssueParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteIssueParams>({
    mutationFn: async (params) => {
      await deleteIssue(params.issueId, params.projectId)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issues', variables.projectId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'projects'],
      })
      // Remove the issue from the detail cache
      queryClient.removeQueries({
        queryKey: ['tracker', 'issue', variables.issueId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useCreateSubIssue
// ---------------------------------------------------------------------------

export interface CreateSubIssueParams {
  parentIssueId: Ref<Issue>
  projectId: Ref<Space>
  title: string
  description?: string
  priority?: number
  status: Ref<IssueStatus>
  assignee?: Ref<Doc> | null
}

export function useCreateSubIssue(): UseMutationResult<Ref<Doc>, Error, CreateSubIssueParams> {
  const queryClient = useQueryClient()

  return useMutation<Ref<Doc>, Error, CreateSubIssueParams>({
    mutationFn: async (params) => {
      const data: Record<string, unknown> = {
        title: params.title,
        priority: params.priority ?? 0,
        status: params.status,
      }
      if (params.description) data.description = params.description
      if (params.assignee) data.assignee = params.assignee
      return await createSubIssue(params.parentIssueId, params.projectId, data)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'subIssues', variables.parentIssueId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issue', variables.parentIssueId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issues', variables.projectId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useCreateTimeReport
// ---------------------------------------------------------------------------

export interface CreateTimeReportParams {
  issueId: Ref<Issue>
  projectId: Ref<Space>
  value: number
  description?: string
}

export function useCreateTimeReport(): UseMutationResult<Ref<Doc>, Error, CreateTimeReportParams> {
  const queryClient = useQueryClient()

  return useMutation<Ref<Doc>, Error, CreateTimeReportParams>({
    mutationFn: async (params) => {
      return await createTimeReport(
        params.issueId,
        params.projectId,
        params.value,
        params.description
      )
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issue', variables.issueId],
      })
    },
  })
}
