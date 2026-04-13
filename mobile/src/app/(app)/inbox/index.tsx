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

import { useCallback, useState, useMemo } from 'react'
import { View, Text, RefreshControl, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Ionicons } from '@expo/vector-icons'

import { useNotifications, useMarkAsRead, useArchiveNotifications } from '@/hooks/useNotifications'
import { useInboxStore } from '@/store/inbox'
import { NotificationFilters } from '@/components/features/NotificationFilters'
import { NotificationRow } from '@/components/features/NotificationRow'
import { BulkActionBar } from '@/components/features/BulkActionBar'
import { resolveNotificationRoute } from '@/lib/notificationRouter'
import type { NotificationItem } from '@/repositories/notification'
import type { InboxFilter } from '@/store/inbox'

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
  } = useNotifications(activeFilter)

  // Mutations
  const markAsReadMutation = useMarkAsRead()
  const archiveMutation = useArchiveNotifications()

  // Local state
  const [refreshing, setRefreshing] = useState(false)

  // Derived
  const items = useMemo(() => notifications?.items ?? [], [notifications])
  const isOffline = fetchStatus === 'paused'

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

  const handleArchive = useCallback(
    (id: string) => {
      archiveMutation.mutate([id])
    },
    [archiveMutation]
  )

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

  const handleSelectAll = useCallback(() => {
    selectAll(items.map((item) => item._id))
  }, [selectAll, items])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // ------ Render helpers ------

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <NotificationRow
        notification={item}
        isSelected={selectedIds.has(item._id)}
        isSelectionMode={isSelectionMode}
        onPress={handleNotificationPress}
        onLongPress={handleLongPress}
        onArchive={handleArchive}
      />
    ),
    [selectedIds, isSelectionMode, handleNotificationPress, handleLongPress, handleArchive]
  )

  const keyExtractor = useCallback((item: NotificationItem) => item._id, [])

  // ------ Loading state ------

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <ScreenHeader />
        <NotificationFilters activeFilter={activeFilter} onFilterChange={handleFilterChange} />
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
        <ScreenHeader />
        <NotificationFilters activeFilter={activeFilter} onFilterChange={handleFilterChange} />
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
        <ScreenHeader />
        <NotificationFilters activeFilter={activeFilter} onFilterChange={handleFilterChange} />
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
      <ScreenHeader />

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
        />
      )}

      {/* Filter chips */}
      <NotificationFilters activeFilter={activeFilter} onFilterChange={handleFilterChange} />

      {/* Notification list */}
      <FlashList
        data={items}
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

function ScreenHeader(): React.ReactNode {
  return (
    <View className="px-4 pt-2 pb-1">
      <Text className="font-sans-bold text-xl text-caption">Inbox</Text>
    </View>
  )
}
