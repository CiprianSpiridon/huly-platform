/**
 * Unread notification count hook.
 *
 * Polls every 30 seconds and syncs the count to the Zustand inbox store
 * so the tab badge can read it without a TanStack Query subscription.
 */

import { useEffect } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { getUnreadCount } from '@/repositories/notification'
import { getClient } from '@/client'
import { useInboxStore } from '@/store/inbox'
import { useWebSocketStore } from '@/store/websocket'
import { notificationKeys } from './useNotifications'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNREAD_POLL_INTERVAL = 30_000      // 30 seconds (polling fallback)
const UNREAD_POLL_INTERVAL_WS = 120_000  // 2 minutes (WS connected -- broadcasts handle most updates)
const UNREAD_STALE_TIME = 15_000         // 15 seconds
const UNREAD_STALE_TIME_WS = 2 * 60_000 // 2 minutes (WS connected)
const UNREAD_GC_TIME = 5 * 60_000       // 5 minutes

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the current unread notification count and syncs it to
 * useInboxStore.unreadTotal on every successful fetch.
 */
export function useUnreadCount(): UseQueryResult<number, Error> {
  const setUnreadTotal = useInboxStore((s) => s.setUnreadTotal)
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')

  const query = useQuery<number, Error>({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => getUnreadCount(),
    staleTime: wsConnected ? UNREAD_STALE_TIME_WS : UNREAD_STALE_TIME,
    gcTime: UNREAD_GC_TIME,
    refetchInterval: wsConnected ? UNREAD_POLL_INTERVAL_WS : UNREAD_POLL_INTERVAL,
    enabled: getClient() !== null,
  })

  // Sync to Zustand whenever the count changes
  useEffect(() => {
    if (query.data !== undefined) {
      setUnreadTotal(query.data)
    }
  }, [query.data, setUnreadTotal])

  return query
}
