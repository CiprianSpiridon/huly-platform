/**
 * TanStack Query hooks for Huly tracker issues.
 *
 * useIssues: infinite query for paginated issue lists.
 * useCreateIssue / useUpdateIssue: mutation hooks with cache invalidation.
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
  type IssueFilters,
  type IssueSort,
  type PaginatedResult,
  type IssueSearchResult,
} from '@/repositories/tracker'
import { getClient } from '@/client'
import { useHulyCreate, useHulyUpdate, type HulyCreateParams, type HulyUpdateParams } from './useHulyMutation'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ISSUES_STALE_TIME = 30_000         // 30 seconds
const ISSUES_GC_TIME = 5 * 60_000       // 5 minutes
const SEARCH_STALE_TIME = 10_000         // 10 seconds

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
  return useInfiniteQuery<PaginatedResult<Issue>, Error, PaginatedResult<Issue>, readonly unknown[], number>({
    queryKey: ['tracker', 'issues', projectId, filters, sort] as const,
    queryFn: ({ pageParam }) =>
      getIssues(projectId as Ref<Space>, filters, sort, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    staleTime: ISSUES_STALE_TIME,
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
      const factory = new TxFactory('' as import('@hcengineering/core').PersonId)
      const tx = factory.createTxCreateDoc(
        ISSUE_CLASS as unknown as Ref<import('@hcengineering/core').Class<Issue>>,
        draft.projectId,
        {
          title: draft.title,
          description: draft.description,
          priority: draft.priority,
          status: draft.status,
          assignee: draft.assignee ?? null,
          number: 0,
          identifier: '',
          kind: '' as Ref<Doc>,
          component: null,
          milestone: null,
          estimation: 0,
          remainingTime: 0,
          reportedTime: 0,
          relations: [],
          childInfo: [],
          parents: [],
          dueDate: null,
          rank: '',
        } as unknown as import('@hcengineering/core').Data<Issue>
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
      const factory = new TxFactory('' as import('@hcengineering/core').PersonId)
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
