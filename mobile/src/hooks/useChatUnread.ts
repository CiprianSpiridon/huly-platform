/**
 * Chat unread count sync hook.
 *
 * Polls DocNotifyContext documents filtered by current user and
 * Channel/DirectMessage object classes. Rebuilds unread state from
 * scratch on each poll to prevent stale counts.
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Doc, Ref, Class } from '@hcengineering/core'

import { getClient } from '@/client'
import { useAuthStore } from '@/store/auth'
import { useChatStore } from '@/store/chat'
import { useWebSocketStore } from '@/store/websocket'

const NOTIFY_CONTEXT_CLASS = 'notification:class:DocNotifyContext' as Ref<Class<Doc>>
const CHANNEL_CLASS = 'chunter:class:Channel'
const DM_CLASS = 'chunter:class:DirectMessage'
const POLL_INTERVAL = 30_000         // 30 seconds (polling fallback)
const POLL_INTERVAL_WS = 2 * 60_000 // 2 minutes (WS connected)

/**
 * Polls DocNotifyContext documents to determine which channels have
 * unread messages, then rebuilds the chat Zustand store from scratch.
 *
 * Filters by:
 * - current user (account UUID)
 * - objectClass in [Channel, DirectMessage]
 * - hidden !== true
 *
 * Call this once in the authenticated app layout.
 */
export function useChatUnreadSync(): void {
  const resetAllUnread = useChatStore((s) => s.resetAllUnread)
  const setUnreadCount = useChatStore((s) => s.setUnreadCount)
  // DocNotifyContext.user is typed as AccountUuid (not PersonId / social id),
  // so we must filter using the authenticated account UUID from the auth store.
  const accountUuid = useAuthStore((s) => s.account)
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')
  const effectiveInterval = wsConnected ? POLL_INTERVAL_WS : POLL_INTERVAL

  const { data: contexts } = useQuery({
    queryKey: ['chat', 'unread-contexts', accountUuid],
    queryFn: async () => {
      const client = getClient()
      if (client === null || accountUuid == null) return []

      return await client.findAll<Doc>(
        NOTIFY_CONTEXT_CLASS,
        {
          user: accountUuid,
          objectClass: { $in: [CHANNEL_CLASS, DM_CLASS] },
          hidden: { $ne: true },
        } as Record<string, unknown>
      )
    },
    enabled: getClient() !== null && accountUuid != null,
    staleTime: effectiveInterval,
    refetchInterval: effectiveInterval,
  })

  useEffect(() => {
    if (contexts == null) return

    // Rebuild from scratch — prevents stale counts from persisting
    resetAllUnread()

    for (const ctx of contexts) {
      const record = ctx as unknown as Record<string, unknown>
      const objectId = record.objectId as string | undefined
      const lastViewed = record.lastViewedTimestamp as number | undefined
      const lastUpdate = record.lastUpdateTimestamp as number | undefined

      if (objectId != null && lastUpdate != null) {
        const hasUnread = lastViewed == null || lastUpdate > lastViewed
        if (hasUnread) {
          setUnreadCount(objectId, 1)
        }
      }
    }
  }, [contexts, resetAllUnread, setUnreadCount])
}
