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
  deleteNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotifications,
  archiveAll,
  unarchiveNotifications,
  type NotificationFilterType,
  type NotificationItem,
  type NotificationReadStatus,
  type PaginatedNotifications,
} from '@/repositories/notification'
import { useConnectionStore } from '@/store/connection'
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
  list: (
    filter?: NotificationFilterType,
    readStatus?: NotificationReadStatus
  ) => ['notifications', 'list', filter ?? 'all', readStatus ?? 'all'] as const,
  unreadCount: ['notifications', 'unreadCount'] as const,
}

// ---------------------------------------------------------------------------
// useNotifications (infinite query)
// ---------------------------------------------------------------------------

export function useNotifications(
  filter?: NotificationFilterType,
  readStatus?: NotificationReadStatus
): UseInfiniteQueryResult<PaginatedNotifications, Error> {
  const effectiveFilter = filter === 'all' ? undefined : filter
  const effectiveReadStatus = readStatus === 'all' ? undefined : readStatus
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')
  // Reactive gate: re-enable the query as soon as the data client is connected,
  // instead of sampling getClient() once per render.
  const isConnected = useConnectionStore((s) => s.status === 'connected')

  return useInfiniteQuery<
    PaginatedNotifications,
    Error,
    PaginatedNotifications,
    readonly unknown[],
    string | undefined
  >({
    queryKey: notificationKeys.list(filter, readStatus),
    queryFn: ({ pageParam }) => {
      const hasFilter = effectiveFilter !== undefined || effectiveReadStatus !== undefined
      const filters = hasFilter
        ? {
            ...(effectiveFilter !== undefined ? { type: effectiveFilter } : {}),
            ...(effectiveReadStatus !== undefined ? { readStatus: effectiveReadStatus } : {}),
          }
        : undefined
      return getNotifications(
        filters,
        pageParam !== undefined ? { cursor: pageParam } : undefined
      )
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: wsConnected ? NOTIFICATIONS_STALE_TIME_WS : NOTIFICATIONS_STALE_TIME,
    gcTime: NOTIFICATIONS_GC_TIME,
    enabled: isConnected,
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

  return useMutation<
    void,
    Error,
    void,
    { previous: Map<string, unknown>; previousUnreadTotal: number }
  >({
    mutationFn: () => markAllAsRead(),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })

      // Snapshot every cached notification query for rollback on failure.
      const previous = new Map<string, unknown>()
      queryClient.getQueriesData({ queryKey: notificationKeys.all }).forEach(([key, data]) => {
        previous.set(JSON.stringify(key), data)
      })
      const previousUnreadTotal = useInboxStore.getState().unreadTotal

      // Optimistically flip every visible notification to viewed so individual
      // rows stop showing the unread indicator immediately (not just the badge).
      queryClient.setQueriesData(
        { queryKey: notificationKeys.all },
        (old: unknown) => {
          if (old === undefined || old === null) return old
          return optimisticallyMarkAllViewed(old)
        }
      )

      useInboxStore.getState().setUnreadTotal(0)

      return { previous, previousUnreadTotal }
    },

    onError: (_error, _vars, context) => {
      if (context === undefined) return
      context.previous.forEach((data, keyStr) => {
        const key = JSON.parse(keyStr) as string[]
        queryClient.setQueryData(key, data)
      })
      useInboxStore.getState().setUnreadTotal(context.previousUnreadTotal)
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
// useUnarchiveNotifications
// ---------------------------------------------------------------------------

export function useUnarchiveNotifications(): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string[], { previous: Map<string, unknown> }>({
    mutationFn: (ids) => unarchiveNotifications(ids),

    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })

      const previous = new Map<string, unknown>()
      queryClient.getQueriesData({ queryKey: notificationKeys.all }).forEach(([key, data]) => {
        previous.set(JSON.stringify(key), data)
      })

      // No local cache mutation on unarchive: the archived items are not in
      // the inbox cache to begin with. We rely on invalidate in onSettled to
      // re-fetch and surface the restored item in its original sort position.

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
// useDeleteNotifications
// ---------------------------------------------------------------------------

/**
 * Permanently delete notifications. Optimistically removes the items from the
 * cache and rolls back on error so deletion feels instant but recovers if the
 * server refuses the request.
 */
export function useDeleteNotifications(): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string[], { previous: Map<string, unknown> }>({
    mutationFn: (ids) => deleteNotifications(ids),

    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })

      const previous = new Map<string, unknown>()
      queryClient.getQueriesData({ queryKey: notificationKeys.all }).forEach(([key, data]) => {
        previous.set(JSON.stringify(key), data)
      })

      queryClient.setQueriesData(
        { queryKey: notificationKeys.all },
        (old: unknown) => {
          if (old === undefined || old === null) return old
          return optimisticallyRemoveItems(old, ids)
        }
      )

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
 * Optimistically set isViewed=true on every notification item in the cache.
 * Used by useMarkAllAsRead so individual rows clear their unread indicator
 * immediately instead of waiting for the onSettled invalidation.
 */
function optimisticallyMarkAllViewed(data: unknown): unknown {
  const record = data as Record<string, unknown>

  if (Array.isArray(record.pages)) {
    return {
      ...record,
      pages: (record.pages as PaginatedNotifications[]).map((page) => ({
        ...page,
        items: page.items.map((item) =>
          item.isViewed === true ? item : { ...item, isViewed: true }
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
