/**
 * TanStack Query hooks for Huly inbox notifications.
 *
 * useNotifications: infinite query for paginated notification list.
 * useMarkAsRead, useArchiveNotifications, useMarkAllAsRead, useArchiveAll:
 *   mutation hooks with optimistic updates.
 */

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotifications,
  archiveAll,
  type NotificationFilterType,
  type NotificationItem,
  type PaginatedNotifications,
} from '@/repositories/notification'
import { getClient } from '@/client'
import { useInboxStore } from '@/store/inbox'
import { useWebSocketStore } from '@/store/websocket'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOTIFICATIONS_STALE_TIME = 15_000          // 15 seconds (polling fallback)
const NOTIFICATIONS_STALE_TIME_WS = 2 * 60_000  // 2 minutes (WS connected)
const NOTIFICATIONS_GC_TIME = 5 * 60_000         // 5 minutes

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filter?: NotificationFilterType) => ['notifications', 'list', filter ?? 'all'] as const,
  unreadCount: ['notifications', 'unreadCount'] as const,
}

// ---------------------------------------------------------------------------
// useNotifications (infinite query)
// ---------------------------------------------------------------------------

export function useNotifications(
  filter?: NotificationFilterType
): UseInfiniteQueryResult<PaginatedNotifications, Error> {
  const effectiveFilter = filter === 'all' ? undefined : filter
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')

  return useInfiniteQuery<
    PaginatedNotifications,
    Error,
    PaginatedNotifications,
    readonly unknown[],
    string | undefined
  >({
    queryKey: notificationKeys.list(filter),
    queryFn: ({ pageParam }) =>
      getNotifications(
        effectiveFilter !== undefined ? { type: effectiveFilter } : undefined,
        pageParam !== undefined ? { cursor: pageParam } : undefined
      ),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: wsConnected ? NOTIFICATIONS_STALE_TIME_WS : NOTIFICATIONS_STALE_TIME,
    gcTime: NOTIFICATIONS_GC_TIME,
    enabled: getClient() !== null,
    select: (data) => {
      const allItems = data.pages.flatMap((page) => page.items)
      const lastPage = data.pages[data.pages.length - 1]
      return {
        items: allItems,
        total: lastPage?.total ?? 0,
        hasMore: lastPage?.hasMore ?? false,
        nextCursor: lastPage?.nextCursor,
      }
    },
  })
}

// ---------------------------------------------------------------------------
// useMarkAsRead
// ---------------------------------------------------------------------------

export function useMarkAsRead(): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string[], { previous: Map<string, unknown> }>({
    mutationFn: (ids) => markAsRead(ids),

    onMutate: async (ids) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })

      // Save previous state for rollback
      const previous = new Map<string, unknown>()
      queryClient.getQueriesData({ queryKey: notificationKeys.all }).forEach(([key, data]) => {
        previous.set(JSON.stringify(key), data)
      })

      // Optimistically mark as viewed
      queryClient.setQueriesData(
        { queryKey: notificationKeys.all },
        (old: unknown) => {
          if (old === undefined || old === null) return old
          return optimisticallyMarkViewed(old, ids)
        }
      )

      // Compute unread delta from pre-mutation snapshots (not post-mutation cache)
      // The `previous` map has the real data under ['notifications','list',...] keys
      const idSet = new Set(ids)
      let unreadDelta = 0
      previous.forEach((data) => {
        if (data == null || typeof data !== 'object') return
        const infiniteData = data as { pages?: Array<{ items?: Array<{ _id: string; isViewed?: boolean }> }> }
        if (infiniteData.pages == null) return
        for (const page of infiniteData.pages) {
          if (page.items == null) continue
          for (const item of page.items) {
            if (idSet.has(item._id) && item.isViewed !== true) {
              unreadDelta++
            }
          }
        }
      })
      if (unreadDelta === 0) unreadDelta = ids.length // fallback if no pre-mutation data found
      const currentCount = useInboxStore.getState().unreadTotal
      useInboxStore.getState().setUnreadTotal(Math.max(0, currentCount - unreadDelta))

      return { previous }
    },

    onError: (_error, _ids, context) => {
      // Rollback
      if (context?.previous !== undefined) {
        context.previous.forEach((data, keyStr) => {
          const key = JSON.parse(keyStr) as string[]
          queryClient.setQueryData(key, data)
        })
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    },
  })
}

// ---------------------------------------------------------------------------
// useArchiveNotifications
// ---------------------------------------------------------------------------

export function useArchiveNotifications(): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string[], { previous: Map<string, unknown> }>({
    mutationFn: (ids) => archiveNotifications(ids),

    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })

      const previous = new Map<string, unknown>()
      queryClient.getQueriesData({ queryKey: notificationKeys.all }).forEach(([key, data]) => {
        previous.set(JSON.stringify(key), data)
      })

      // Optimistically remove archived items from visible list
      queryClient.setQueriesData(
        { queryKey: notificationKeys.all },
        (old: unknown) => {
          if (old === undefined || old === null) return old
          return optimisticallyRemoveItems(old, ids)
        }
      )

      // Compute unread delta from pre-mutation snapshots
      const idSet = new Set(ids)
      let unreadArchived = 0
      previous.forEach((data) => {
        if (data == null || typeof data !== 'object') return
        const infiniteData = data as { pages?: Array<{ items?: Array<{ _id: string; isViewed?: boolean }> }> }
        if (infiniteData.pages == null) return
        for (const page of infiniteData.pages) {
          if (page.items == null) continue
          for (const item of page.items) {
            if (idSet.has(item._id) && item.isViewed !== true) {
              unreadArchived++
            }
          }
        }
      })
      if (unreadArchived > 0) {
        const current = useInboxStore.getState().unreadTotal
        useInboxStore.getState().setUnreadTotal(Math.max(0, current - unreadArchived))
      }

      return { previous }
    },

    onError: (_error, _ids, context) => {
      if (context?.previous !== undefined) {
        context.previous.forEach((data, keyStr) => {
          const key = JSON.parse(keyStr) as string[]
          queryClient.setQueryData(key, data)
        })
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    },
  })
}

// ---------------------------------------------------------------------------
// useMarkAllAsRead
// ---------------------------------------------------------------------------

export function useMarkAllAsRead(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: () => markAllAsRead(),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })
      useInboxStore.getState().setUnreadTotal(0)
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    },
  })
}

// ---------------------------------------------------------------------------
// useArchiveAll
// ---------------------------------------------------------------------------

export function useArchiveAll(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: () => archiveAll(),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    },
  })
}

// ---------------------------------------------------------------------------
// Optimistic update helpers
// ---------------------------------------------------------------------------

/**
 * Optimistically set isViewed=true on matching notification items.
 * Works with the infinite query data structure produced by useInfiniteQuery.
 */
function optimisticallyMarkViewed(data: unknown, ids: string[]): unknown {
  const idSet = new Set(ids)
  const record = data as Record<string, unknown>

  // Handle infinite query shape: { pages: [...], pageParams: [...] }
  if (Array.isArray(record.pages)) {
    return {
      ...record,
      pages: (record.pages as PaginatedNotifications[]).map((page) => ({
        ...page,
        items: page.items.map((item) =>
          idSet.has(item._id) ? { ...item, isViewed: true } : item
        ),
      })),
    }
  }

  return data
}

/**
 * Optimistically remove archived items from the notification list.
 */
function optimisticallyRemoveItems(data: unknown, ids: string[]): unknown {
  const idSet = new Set(ids)
  const record = data as Record<string, unknown>

  if (Array.isArray(record.pages)) {
    return {
      ...record,
      pages: (record.pages as PaginatedNotifications[]).map((page, index) => ({
        ...page,
        items: page.items.filter((item) => !idSet.has(item._id)),
        total: index === 0 ? Math.max(0, page.total - ids.length) : page.total,
      })),
    }
  }

  return data
}
