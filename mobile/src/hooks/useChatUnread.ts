/**
 * Chat unread count sync hook.
 *
 * Polls for unread message counts per channel and syncs to the chat
 * Zustand store for tab badge and channel row indicators.
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Doc, Ref, Class, Space } from '@hcengineering/core'

import { getClient } from '@/client'
import { useChatStore } from '@/store/chat'

const NOTIFY_CONTEXT_CLASS = 'notification:class:DocNotifyContext' as Ref<Class<Doc>>
const POLL_INTERVAL = 30_000 // 30 seconds

/**
 * Polls DocNotifyContext documents to determine which channels have
 * unread messages, then syncs counts to useChatStore.
 *
 * Call this once in the chat tab layout or channel list screen.
 */
export function useChatUnreadSync(): void {
  const setUnreadCount = useChatStore((s) => s.setUnreadCount)

  const { data: contexts } = useQuery({
    queryKey: ['chat', 'unread-contexts'],
    queryFn: async () => {
      const client = getClient()
      if (client === null) return []

      return await client.findAll<Doc>(
        NOTIFY_CONTEXT_CLASS,
        {} as Record<string, unknown>
      )
    },
    enabled: getClient() !== null,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
  })

  useEffect(() => {
    if (contexts == null) return

    for (const ctx of contexts) {
      const record = ctx as unknown as Record<string, unknown>
      const objectId = record.objectId as string | undefined
      const lastViewed = record.lastViewedTimestamp as number | undefined
      const lastUpdate = record.lastUpdateTimestamp as number | undefined

      if (objectId != null && lastUpdate != null) {
        const hasUnread = lastViewed == null || lastUpdate > lastViewed
        setUnreadCount(objectId, hasUnread ? 1 : 0)
      }
    }
  }, [contexts, setUnreadCount])
}
