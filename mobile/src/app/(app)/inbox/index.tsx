/**
 * Inbox notification list screen.
 *
 * Displays notifications sorted newest-first in a FlashList with:
 * - Filter chips (All, Mentions, Reactions, Updates)
 * - Swipe-to-archive on each row
 * - Bulk action bar (long-press to enter selection mode)
 * - Pull-to-refresh
 * - Empty state per active filter
 * - Unread count polling for tab badge
 *
 * Handles all five required states: loading, success, empty, error, offline.
 */

import { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { View, Text, RefreshControl, Pressable, Alert, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  useNotifications,
  useMarkAsRead,
  useArchiveNotifications,
  useMarkAllAsRead,
  useArchiveAll,
  useUnarchiveNotifications,
  notificationKeys,
} from '@/hooks/useNotifications'
import { useInboxStore } from '@/store/inbox'
import { NotificationFilters } from '@/components/features/NotificationFilters'
import { NotificationRow } from '@/components/features/NotificationRow'
import { BulkActionBar } from '@/components/features/BulkActionBar'
import {
  NotificationGroupCard,
  type NotificationGroup,
} from '@/components/features/NotificationGroupCard'
import { resolveNotificationRoute } from '@/lib/notificationRouter'
import {
  deleteNotifications,
  getNotifyContextsByIds,
  humanizeObjectClass,
  type NotificationItem,
  type NotifyContextInfo,
} from '@/repositories/notification'
import type { InboxFilter, InboxReadStatusFilter } from '@/store/inbox'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_STATE_MESSAGES: Record<InboxFilter, { title: string; description: string }> = {
  all: {
    title: 'All caught up',
    description: 'No notifications right now. We\'ll let you know when something happens.',
  },
  mentions: {
    title: 'No mentions',
    description: 'You haven\'t been mentioned in any conversations yet.',
  },
  reactions: {
    title: 'No reactions',
    description: 'No one has reacted to your messages yet.',
  },
  updates: {
    title: 'No updates',
    description: 'No activity updates to show right now.',
  },
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function InboxScreen(): React.ReactNode {
  // Store state
  const activeFilter = useInboxStore((s) => s.activeFilter)
  const setFilter = useInboxStore((s) => s.setFilter)
  const readStatusFilter = useInboxStore((s) => s.readStatusFilter)
  const setReadStatusFilter = useInboxStore((s) => s.setReadStatusFilter)
  const selectedIds = useInboxStore((s) => s.selectedIds)
  const isSelectionMode = useInboxStore((s) => s.isSelectionMode)
  const toggleSelected = useInboxStore((s) => s.toggleSelected)
  const selectAll = useInboxStore((s) => s.selectAll)
  const clearSelection = useInboxStore((s) => s.clearSelection)
  const enterSelectionMode = useInboxStore((s) => s.enterSelectionMode)

  // Server state
  const {
    data: notifications,
    isLoading,
    error,
    refetch,
    fetchStatus,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(activeFilter, readStatusFilter)

  // Mutations
  const queryClient = useQueryClient()
  const markAsReadMutation = useMarkAsRead()
  const archiveMutation = useArchiveNotifications()
  const markAllAsReadMutation = useMarkAllAsRead()
  const archiveAllMutation = useArchiveAll()
  const unarchiveMutation = useUnarchiveNotifications()
  const deleteMutation = useMutation<void, Error, string[]>({
    mutationFn: (ids) => deleteNotifications(ids),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    },
  })

  // Local state
  const [refreshing, setRefreshing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [undoToast, setUndoToast] = useState<{ id: string; title: string } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derived
  const items = useMemo(() => notifications?.items ?? [], [notifications])
  const isOffline = fetchStatus === 'paused'
  const hasItems = items.length > 0
  const hasUnread = useMemo(() => items.some((item) => item.isViewed !== true), [items])

  // Collect unique docNotifyContext IDs for title resolution. Stable string
  // key lets TanStack dedupe repeated renders.
  const contextIds = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) {
      if (item.docNotifyContext !== '') set.add(item.docNotifyContext)
    }
    return Array.from(set).sort()
  }, [items])

  const { data: contextInfo } = useQuery<Map<string, NotifyContextInfo>>({
    queryKey: ['notifications', 'contextInfo', contextIds.join(',')],
    queryFn: () => getNotifyContextsByIds(contextIds),
    enabled: contextIds.length > 0,
    staleTime: 60_000,
  })

  // Group notifications by docNotifyContext. Items without a context ID land
  // in a synthetic group keyed by their objectId (or a sentinel for truly
  // detached notifications) so they still appear in the list.
  const groups = useMemo<NotificationGroup[]>(() => {
    const byKey = new Map<string, NotificationGroup>()
    for (const item of items) {
      const key = item.docNotifyContext !== ''
        ? item.docNotifyContext
        : `_object:${item.objectId !== '' ? item.objectId : item._id}`
      const info = item.docNotifyContext !== '' ? contextInfo?.get(item.docNotifyContext) : undefined
      const resolvedTitle = info?.title
      const hasResolvedTitle = typeof resolvedTitle === 'string' && resolvedTitle !== ''
      const objectClass = info?.objectClass !== undefined && info.objectClass !== ''
        ? info.objectClass
        : item.objectClass
      const label = hasResolvedTitle
        ? (resolvedTitle as string)
        : humanizeObjectClass(objectClass)

      const existing = byKey.get(key)
      if (existing !== undefined) {
        existing.items.push(item)
        // If we later encounter a resolved title for the same group, upgrade the label.
        if (hasResolvedTitle && !existing.hasResolvedTitle) {
          existing.label = resolvedTitle as string
          existing.hasResolvedTitle = true
        }
      } else {
        byKey.set(key, {
          contextId: key,
          label,
          hasResolvedTitle,
          objectClass,
          items: [item],
        })
      }
    }

    // Preserve the server ordering (newest first) by using the first item's
    // modifiedOn as the group sort key.
    return Array.from(byKey.values()).sort(
      (a, b) => (b.items[0]?.modifiedOn ?? 0) - (a.items[0]?.modifiedOn ?? 0)
    )
  }, [items, contextInfo])

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())

  const handleToggleExpand = useCallback((contextId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(contextId)) next.delete(contextId)
      else next.add(contextId)
      return next
    })
  }, [])

  // ------ Handlers ------

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const handleFilterChange = useCallback(
    (filter: InboxFilter) => {
      clearSelection()
      setFilter(filter)
    },
    [clearSelection, setFilter]
  )

  const handleReadStatusChange = useCallback(
    (status: InboxReadStatusFilter) => {
      // Do not clear the type filter or selection -- the two filters compose.
      setReadStatusFilter(status)
    },
    [setReadStatusFilter]
  )

  const handleNotificationPress = useCallback(
    (notification: NotificationItem) => {
      if (isSelectionMode) {
        toggleSelected(notification._id)
        return
      }

      // Mark as read
      if (!notification.isViewed) {
        markAsReadMutation.mutate([notification._id])
      }

      // Navigate to the source or to the detail screen
      const result = resolveNotificationRoute(notification.objectClass, notification.objectId, notification._id)
      router.push(result.path as never)
    },
    [isSelectionMode, toggleSelected, markAsReadMutation]
  )

  const handleLongPress = useCallback(
    (notification: NotificationItem) => {
      if (!isSelectionMode) {
        enterSelectionMode(notification._id)
      }
    },
    [isSelectionMode, enterSelectionMode]
  )

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current != null) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
  }, [])

  const handleArchive = useCallback(
    (id: string) => {
      // Capture the row title so we can surface a meaningful undo toast.
      const row = items.find((item) => item._id === id)
      archiveMutation.mutate([id])

      // Show undo toast (3s window). Replace any existing toast.
      clearUndoTimer()
      setUndoToast({ id, title: row?.title !== undefined && row.title !== '' ? row.title : 'Notification' })
      undoTimerRef.current = setTimeout(() => {
        setUndoToast(null)
        undoTimerRef.current = null
      }, 3_000)
    },
    [archiveMutation, items, clearUndoTimer]
  )

  const handleUndoArchive = useCallback(() => {
    if (undoToast === null) return
    const { id } = undoToast
    clearUndoTimer()
    setUndoToast(null)
    // Invalidation in useUnarchiveNotifications refetches the list and puts
    // the item back in its original modifiedOn-sorted position.
    unarchiveMutation.mutate([id])
  }, [undoToast, unarchiveMutation, clearUndoTimer])

  // Clear any pending undo timer on unmount to avoid a stale setState.
  useEffect(() => {
    return () => {
      if (undoTimerRef.current != null) {
        clearTimeout(undoTimerRef.current)
        undoTimerRef.current = null
      }
    }
  }, [])

  const handleBulkMarkAsRead = useCallback(() => {
    const ids = Array.from(selectedIds)
    markAsReadMutation.mutate(ids)
    clearSelection()
  }, [selectedIds, markAsReadMutation, clearSelection])

  const handleBulkArchive = useCallback(() => {
    const ids = Array.from(selectedIds)
    archiveMutation.mutate(ids)
    clearSelection()
  }, [selectedIds, archiveMutation, clearSelection])

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    Alert.alert(
      'Delete notifications',
      `Permanently delete ${ids.length} notification${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Repo silently drops IDs that were already removed on the server,
            // so stale selections do not crash.
            deleteMutation.mutate(ids)
            clearSelection()
          },
        },
      ]
    )
  }, [selectedIds, deleteMutation, clearSelection])

  const handleSelectAll = useCallback(() => {
    selectAll(items.map((item) => item._id))
  }, [selectAll, items])

  const handleMarkAllAsRead = useCallback(() => {
    setMenuOpen(false)
    if (!hasUnread) return
    Alert.alert(
      'Mark all as read',
      'This will mark every notification in your inbox as read.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark all read',
          style: 'default',
          onPress: () => {
            markAllAsReadMutation.mutate()
          },
        },
      ]
    )
  }, [hasUnread, markAllAsReadMutation])

  const handleArchiveAll = useCallback(() => {
    setMenuOpen(false)
    if (!hasItems) return
    Alert.alert(
      'Archive all',
      'This will archive every notification currently in your inbox.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive all',
          style: 'destructive',
          onPress: () => {
            archiveAllMutation.mutate()
          },
        },
      ]
    )
  }, [hasItems, archiveAllMutation])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // ------ Render helpers ------

  const renderItem = useCallback(
    ({ item }: { item: NotificationGroup }) => {
      // Single-notification groups collapse to a plain row (avoid card noise).
      if (item.items.length === 1) {
        const notif = item.items[0]
        if (notif === undefined) return null
        return (
          <NotificationRow
            notification={notif}
            isSelected={selectedIds.has(notif._id)}
            isSelectionMode={isSelectionMode}
            onPress={handleNotificationPress}
            onLongPress={handleLongPress}
            onArchive={handleArchive}
          />
        )
      }
      return (
        <NotificationGroupCard
          group={item}
          isExpanded={expandedGroups.has(item.contextId)}
          onToggleExpand={handleToggleExpand}
          selectedIds={selectedIds}
          isSelectionMode={isSelectionMode}
          onNotificationPress={handleNotificationPress}
          onNotificationLongPress={handleLongPress}
          onArchive={handleArchive}
        />
      )
    },
    [
      selectedIds,
      isSelectionMode,
      handleNotificationPress,
      handleLongPress,
      handleArchive,
      expandedGroups,
      handleToggleExpand,
    ]
  )

  const keyExtractor = useCallback((group: NotificationGroup) => group.contextId, [])

  // ------ Loading state ------

  const headerProps = {
    menuOpen,
    onMenuOpen: () => setMenuOpen(true),
    onMenuClose: () => setMenuOpen(false),
    onMarkAllAsRead: handleMarkAllAsRead,
    onArchiveAll: handleArchiveAll,
    canMarkAllAsRead: hasUnread && !markAllAsReadMutation.isPending,
    canArchiveAll: hasItems && !archiveAllMutation.isPending,
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <ScreenHeader {...headerProps} />
        <NotificationFilters
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          readStatusFilter={readStatusFilter}
          onReadStatusChange={handleReadStatusChange}
        />
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-sm text-dark">Loading notifications...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // ------ Error state ------

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <ScreenHeader {...headerProps} />
        <NotificationFilters
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          readStatusFilter={readStatusFilter}
          onReadStatusChange={handleReadStatusChange}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#77818B" />
          <Text className="font-sans-semibold text-lg text-caption mt-4 text-center">
            Failed to load notifications
          </Text>
          <Text className="font-sans text-sm text-dark mt-2 text-center">
            {error.message}
          </Text>
          <Pressable
            className="mt-4 bg-accent-primary rounded-md px-6 py-3 active:opacity-80"
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading notifications"
          >
            <Text className="font-sans-medium text-sm text-on-accent">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // ------ Empty state ------

  if (items.length === 0) {
    const emptyState = EMPTY_STATE_MESSAGES[activeFilter]
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <ScreenHeader {...headerProps} />
        <NotificationFilters
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          readStatusFilter={readStatusFilter}
          onReadStatusChange={handleReadStatusChange}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="mail-open-outline" size={48} color="#77818B" />
          <Text className="font-sans-semibold text-lg text-caption mt-4 text-center">
            {emptyState.title}
          </Text>
          <Text className="font-sans text-sm text-dark mt-2 text-center">
            {emptyState.description}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // ------ Success state ------

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScreenHeader {...headerProps} />

      {/* Offline banner */}
      {isOffline && (
        <View className="bg-surface-accent px-4 py-2">
          <Text className="font-sans text-xs text-caption text-center">
            You are offline. Showing cached notifications.
          </Text>
        </View>
      )}

      {/* Bulk action bar */}
      {isSelectionMode && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={items.length}
          onMarkAsRead={handleBulkMarkAsRead}
          onArchive={handleBulkArchive}
          onSelectAll={handleSelectAll}
          onCancel={clearSelection}
          onDelete={handleBulkDelete}
        />
      )}

      {/* Filter chips */}
      <NotificationFilters
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          readStatusFilter={readStatusFilter}
          onReadStatusChange={handleReadStatusChange}
        />

      {/* Inbox-scoped undo toast for the most recent swipe-archive. */}
      {undoToast !== null && (
        <View
          className="mx-4 mt-2 mb-1 px-4 py-3 rounded-md bg-surface-raised border border-divider flex-row items-center justify-between"
          accessibilityRole="alert"
          accessibilityLabel={`Archived ${undoToast.title}. Undo available for a few seconds.`}
        >
          <Text className="flex-1 mr-3 font-sans text-sm text-caption" numberOfLines={1}>
            Archived "{undoToast.title}"
          </Text>
          <Pressable
            onPress={handleUndoArchive}
            className="px-2 py-1 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Undo archive"
          >
            <Text className="font-sans-semibold text-sm text-accent-primary">Undo</Text>
          </Pressable>
        </View>
      )}

      {/* Notification list (grouped by DocNotifyContext) */}
      <FlashList
        data={groups}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#205DC2"
            progressBackgroundColor="#1E1F23"
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <Text className="font-sans text-xs text-dark">Loading more...</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Screen header
// ---------------------------------------------------------------------------

interface ScreenHeaderProps {
  menuOpen: boolean
  onMenuOpen: () => void
  onMenuClose: () => void
  onMarkAllAsRead: () => void
  onArchiveAll: () => void
  canMarkAllAsRead: boolean
  canArchiveAll: boolean
}

function ScreenHeader(props: ScreenHeaderProps): React.ReactNode {
  const {
    menuOpen,
    onMenuOpen,
    onMenuClose,
    onMarkAllAsRead,
    onArchiveAll,
    canMarkAllAsRead,
    canArchiveAll,
  } = props

  return (
    <View className="px-4 pt-2 pb-1 flex-row items-center justify-between">
      <Text className="font-sans-bold text-xl text-caption">Inbox</Text>
      <Pressable
        onPress={onMenuOpen}
        className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Inbox actions"
        accessibilityHint="Opens menu with mark all as read and archive all actions"
      >
        <Ionicons name="ellipsis-horizontal" size={22} color="#E6E7E9" />
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={onMenuClose}
      >
        <Pressable
          className="flex-1 bg-black/30"
          onPress={onMenuClose}
          accessibilityLabel="Close menu"
          accessibilityRole="button"
        >
          <View className="absolute right-4 top-14 w-64 rounded-lg bg-surface-raised py-2 shadow-lg">
            <Pressable
              onPress={canMarkAllAsRead ? onMarkAllAsRead : undefined}
              disabled={!canMarkAllAsRead}
              className={`flex-row items-center px-4 py-3 ${canMarkAllAsRead ? 'active:bg-surface-accent' : 'opacity-40'}`}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
              accessibilityState={{ disabled: !canMarkAllAsRead }}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#E6E7E9" />
              <Text className="font-sans-medium text-sm text-caption ml-3">Mark All as Read</Text>
            </Pressable>
            <Pressable
              onPress={canArchiveAll ? onArchiveAll : undefined}
              disabled={!canArchiveAll}
              className={`flex-row items-center px-4 py-3 ${canArchiveAll ? 'active:bg-surface-accent' : 'opacity-40'}`}
              accessibilityRole="button"
              accessibilityLabel="Archive all notifications"
              accessibilityState={{ disabled: !canArchiveAll }}
            >
              <Ionicons name="archive-outline" size={20} color="#E6E7E9" />
              <Text className="font-sans-medium text-sm text-caption ml-3">Archive All</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}
