/**
 * TanStack Query hook for a single Huly tracker issue.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Ref, WithLookup } from '@hcengineering/core'
import type { Issue } from '@hcengineering/tracker'

import { getIssue } from '@/repositories/tracker'
import { getClient } from '@/client'
import { useWebSocketStore } from '@/store/websocket'

const ISSUE_STALE_TIME = 30_000           // 30 seconds (polling fallback)
const ISSUE_STALE_TIME_WS = 5 * 60_000   // 5 minutes (WS connected)
const ISSUE_GC_TIME = 5 * 60_000          // 5 minutes

export function useIssue(
  issueId: string | undefined
): UseQueryResult<WithLookup<Issue> | undefined, Error> {
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')

  return useQuery<WithLookup<Issue> | undefined, Error>({
    queryKey: ['tracker', 'issue', issueId],
    queryFn: () => getIssue(issueId as Ref<Issue>),
    staleTime: wsConnected ? ISSUE_STALE_TIME_WS : ISSUE_STALE_TIME,
    gcTime: ISSUE_GC_TIME,
    enabled: issueId !== undefined && getClient() !== null,
  })
}
