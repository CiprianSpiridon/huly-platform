/**
 * Channel list screen.
 *
 * SectionList with "Channels" and "Direct Messages" sections.
 * Each row shows name, last message preview, timestamp, and unread indicator.
 * Sorted by last activity. Pull-to-refresh supported.
 */

import { useCallback, useState, useMemo } from 'react'
import { View, Text, SectionList, RefreshControl, type SectionListRenderItemInfo } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, type Href } from 'expo-router'

import { useChannels } from '@/hooks/useChannels'
import { useChatUnreadSync } from '@/hooks/useChatUnread'
import { useChatStore } from '@/store/chat'
import { ChannelRow } from '@/components/features/ChannelRow'
import type { ChannelItem } from '@/repositories/chat'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelSection {
  title: string
  data: ChannelItem[]
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ChannelListScreen(): React.ReactNode {
  const { data, isLoading, error, refetch, fetchStatus } = useChannels()
  useChatUnreadSync() // Polls DocNotifyContext and syncs unread counts to store
  const unreadCounts = useChatStore((s) => s.unreadCounts)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleChannelPress = useCallback((channel: ChannelItem) => {
    router.push(`/(app)/chat/channel/${channel._id}` as Href)
  }, [])

  const sections: ChannelSection[] = useMemo(() => {
    if (data == null) return []

    const result: ChannelSection[] = []

    if (data.channels.length > 0) {
      result.push({ title: 'Channels', data: data.channels })
    }
    if (data.directMessages.length > 0) {
      result.push({ title: 'Direct Messages', data: data.directMessages })
    }

    return result
  }, [data])

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<ChannelItem, ChannelSection>) => (
      <ChannelRow
        channel={item}
        unreadCount={unreadCounts.get(item._id) ?? 0}
        onPress={handleChannelPress}
      />
    ),
    [unreadCounts, handleChannelPress]
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: ChannelSection }) => (
      <View className="px-4 py-2 bg-surface-primary">
        <Text className="font-sans-semibold text-xs text-content-tertiary uppercase tracking-wide">
          {section.title}
        </Text>
      </View>
    ),
    []
  )

  const renderSeparator = useCallback(
    () => <View className="h-px bg-border-primary ms-16" />,
    []
  )

  const keyExtractor = useCallback(
    (item: ChannelItem) => item._id,
    []
  )

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-sm text-content-tertiary">Loading channels...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error != null) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="font-sans-medium text-base text-content-primary mb-2">
            Failed to load channels
          </Text>
          <Text className="font-sans text-sm text-content-tertiary mb-4 text-center">
            {error.message}
          </Text>
          <Text
            className="font-sans-medium text-sm text-accent-primary"
            onPress={() => { void refetch() }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading channels"
          >
            Tap to retry
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Empty state
  if (sections.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="font-sans-medium text-lg text-content-primary mb-2">
            No conversations yet
          </Text>
          <Text className="font-sans text-sm text-content-tertiary text-center">
            Channels and direct messages will appear here
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Offline banner
  const isOffline = fetchStatus === 'paused'

  // Success state
  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
      {isOffline && (
        <View className="bg-warning-subtle px-4 py-2">
          <Text className="text-warning-text text-sm font-sans-medium text-center">
            You are offline. Showing cached data.
          </Text>
        </View>
      )}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={renderSeparator}
        keyExtractor={keyExtractor}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#205DC2"
            progressBackgroundColor="#1E1F23"
          />
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </SafeAreaView>
  )
}
