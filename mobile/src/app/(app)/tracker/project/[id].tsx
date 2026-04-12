import { useCallback, useMemo, useState } from 'react'
import { View, Text, ActivityIndicator, RefreshControl, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Ref, Space } from '@hcengineering/core'
import type { Issue } from '@hcengineering/tracker'

import { useIssues } from '@/hooks/useIssues'
import { useTrackerStore } from '@/store/tracker'
import { IssueRow } from '@/components/features/IssueRow'
import { IssueFilterControls } from '@/components/features/IssueFilters'

/**
 * Issue list screen for a specific project.
 *
 * Uses useIssues infinite query with FlashList. Supports filters, sort,
 * and kanban/list toggle.
 */
export default function IssueListScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const filters = useTrackerStore((s) => s.issueFilters)
  const sort = useTrackerStore((s) => s.issueSort)
  const viewMode = useTrackerStore((s) => s.viewMode)

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    fetchStatus,
  } = useIssues(id, filters, sort)

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleIssuePress = useCallback((issueId: string) => {
    router.push(`/(app)/tracker/issue/${issueId}` as Href)
  }, [])

  const handleCreatePress = useCallback(() => {
    // Set project context so create screen knows which project to create in
    useTrackerStore.getState().setSelectedProjectId(id as Ref<Space>)
    router.push('/(app)/tracker/create' as Href)
  }, [id])

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (!id) {
    router.back()
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Issues' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
          <Text className="font-sans text-sm text-content mt-3">
            Loading issues...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Issues' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            Failed to load issues
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            {error.message}
          </Text>
          <Pressable
            className="bg-primary rounded-md px-6 py-3 mt-4 min-h-[44px] items-center justify-center"
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading issues"
          >
            <Text className="font-sans-medium text-sm text-on-accent">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const items = data?.items ?? []
  const isOffline = fetchStatus === 'paused'

  // Empty state
  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Issues' }} />
        <IssueFilterControls />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="document-outline" size={48} color="#77818B" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            No issues
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            No issues match the current filters.
          </Text>
          <Pressable
            className="bg-primary rounded-md px-6 py-3 mt-4 min-h-[44px] items-center justify-center"
            onPress={handleCreatePress}
            accessibilityRole="button"
            accessibilityLabel="Create new issue"
          >
            <Text className="font-sans-medium text-sm text-on-accent">Create Issue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // Kanban view
  if (viewMode === 'kanban') {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Issues' }} />
        <IssueFilterControls />
        <KanbanView items={items} onIssuePress={handleIssuePress} />
      </SafeAreaView>
    )
  }

  // List view (default)
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Stack.Screen options={{ title: 'Issues' }} />
      {isOffline ? (
        <View className="bg-priority-medium/15 px-4 py-2">
          <Text className="font-sans-medium text-xs text-priority-medium text-center">
            You are offline. Showing cached data.
          </Text>
        </View>
      ) : null}
      <IssueFilterControls />
      <FlashList
        data={items}
        renderItem={({ item }) => (
          <IssueRow
            id={item._id}
            identifier={item.identifier}
            title={item.title}
            priority={item.priority}
            statusName={
              (item as unknown as Record<string, unknown>).$lookup != null
                ? ((item as unknown as Record<string, unknown>).$lookup as Record<string, Record<string, string>>)?.status?.name ?? 'Unknown'
                : 'Unknown'
            }
            assigneeName={
              (item as unknown as Record<string, unknown>).$lookup != null
                ? ((item as unknown as Record<string, unknown>).$lookup as Record<string, Record<string, string>>)?.assignee?.name
                : undefined
            }
            onPress={handleIssuePress}
          />
        )}
        keyExtractor={(item) => item._id}

        contentContainerStyle={{ paddingHorizontal: 16 }}
        onEndReached={handleEndReached}
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
              <ActivityIndicator size="small" color="#205DC2" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Kanban sub-component (inline, single use)
// ---------------------------------------------------------------------------

interface KanbanViewProps {
  items: Issue[]
  onIssuePress: (id: string) => void
}

function KanbanView({ items, onIssuePress }: KanbanViewProps): React.ReactNode {
  // Group issues by status
  const groups = useMemo(() => {
    const map = new Map<string, Issue[]>()
    for (const item of items) {
      const key = item.status as unknown as string
      const list = map.get(key)
      if (list !== undefined) {
        list.push(item)
      } else {
        map.set(key, [item])
      }
    }
    return Array.from(map.entries())
  }, [items])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      {groups.map(([status, statusItems]) => (
        <View key={status} className="w-72 mr-3">
          <View className="bg-surface-accent rounded-sm px-3 py-2 mb-2">
            <Text className="font-sans-semibold text-xs text-caption">
              {status}
            </Text>
            <Text className="font-sans text-xs text-dark">
              {statusItems.length} issue{statusItems.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {statusItems.map((item) => (
            <IssueRow
              key={item._id}
              id={item._id}
              identifier={item.identifier}
              title={item.title}
              priority={item.priority}
              statusName={status}
              onPress={onIssuePress}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  )
}
