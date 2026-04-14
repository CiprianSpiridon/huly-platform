/**
 * TanStack Query hooks for a single Huly tracker issue and its relations.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Ref, WithLookup } from '@hcengineering/core'
import type { Issue } from '@hcengineering/tracker'

import { getIssue, getIssueRelations, type IssueRelationItem } from '@/repositories/tracker'
import { getClient } from '@/client'
import { useWebSocketStore } from '@/store/websocket'

const ISSUE_STALE_TIME = 30_000           // 30 seconds (polling fallback)
const ISSUE_STALE_TIME_WS = 5 * 60_000   // 5 minutes (WS connected)
const ISSUE_GC_TIME = 5 * 60_000          // 5 minutes
const RELATIONS_STALE_TIME = 60_000       // 1 minute

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

export function useIssueRelations(
  issueId: string | undefined
): UseQueryResult<IssueRelationItem[], Error> {
  return useQuery<IssueRelationItem[], Error>({
    queryKey: ['tracker', 'relations', issueId],
    queryFn: () => getIssueRelations(issueId as Ref<Issue>),
    staleTime: RELATIONS_STALE_TIME,
    gcTime: ISSUE_GC_TIME,
    enabled: issueId !== undefined && getClient() !== null,
  })
}
