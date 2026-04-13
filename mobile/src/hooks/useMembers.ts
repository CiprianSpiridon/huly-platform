/**
 * TanStack Query hooks for workspace members.
 *
 * useMembers: cached list of all workspace members (5 min staleTime).
 * useSearchMembers: local filter over the cached member list.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getMembers, type MemberItem } from '@/repositories/members'
import { getClient } from '@/client'
import { useWebSocketStore } from '@/store/websocket'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEMBERS_STALE_TIME = 5 * 60_000       // 5 minutes
const MEMBERS_STALE_TIME_WS = 10 * 60_000   // 10 minutes (WS connected)
const MEMBERS_GC_TIME = 10 * 60_000          // 10 minutes

// ---------------------------------------------------------------------------
// useMembers
// ---------------------------------------------------------------------------

export function useMembers(): UseQueryResult<MemberItem[], Error> {
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')

  return useQuery<MemberItem[], Error>({
    queryKey: ['members'],
    queryFn: getMembers,
    staleTime: wsConnected ? MEMBERS_STALE_TIME_WS : MEMBERS_STALE_TIME,
    gcTime: MEMBERS_GC_TIME,
    enabled: getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useSearchMembers -- local filter
// ---------------------------------------------------------------------------

/**
 * Filters the cached member list by a search query. Local filter only,
 * no additional network request.
 */
export function useSearchMembers(
  members: MemberItem[] | undefined,
  searchQuery: string
): MemberItem[] {
  return useMemo(() => {
    if (members == null || members.length === 0) return []
    const q = searchQuery.toLowerCase().trim()
    if (q.length === 0) return members
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    )
  }, [members, searchQuery])
}
