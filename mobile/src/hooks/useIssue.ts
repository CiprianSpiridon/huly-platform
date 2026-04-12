/**
 * TanStack Query hook for a single Huly tracker issue.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Ref, WithLookup } from '@hcengineering/core'
import type { Issue } from '@hcengineering/tracker'

import { getIssue } from '@/repositories/tracker'
import { getClient } from '@/client'

const ISSUE_STALE_TIME = 30_000       // 30 seconds
const ISSUE_GC_TIME = 5 * 60_000     // 5 minutes

export function useIssue(
  issueId: string | undefined
): UseQueryResult<WithLookup<Issue> | undefined, Error> {
  return useQuery<WithLookup<Issue> | undefined, Error>({
    queryKey: ['tracker', 'issue', issueId],
    queryFn: () => getIssue(issueId as Ref<Issue>),
    staleTime: ISSUE_STALE_TIME,
    gcTime: ISSUE_GC_TIME,
    enabled: issueId !== undefined && getClient() !== null,
  })
}
