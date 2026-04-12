import { useCallback, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Ref, Space } from '@hcengineering/core'
import type { Issue } from '@hcengineering/tracker'

import { useIssue } from '@/hooks/useIssue'
import { useUpdateIssue } from '@/hooks/useIssues'
import { IssueDetailView } from '@/components/features/IssueDetail'
import { IssueComments } from '@/components/features/IssueComments'

/**
 * Issue detail screen.
 *
 * Displays all issue fields with editable status/priority/assignee via
 * bottom sheet pickers. Includes comments section and pull-to-refresh.
 */
export default function IssueDetailScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: issue, isLoading, error, refetch } = useIssue(id)
  const updateIssue = useUpdateIssue()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleStatusPress = useCallback(() => {
    // TODO: Open status picker bottom sheet
  }, [])

  const handlePriorityPress = useCallback(() => {
    // TODO: Open priority picker bottom sheet
  }, [])

  const handleAssigneePress = useCallback(() => {
    // TODO: Open assignee picker bottom sheet
  }, [])

  if (!id) {
    router.back()
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Issue' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
        </View>
      </SafeAreaView>
    )
  }

  // Error / not found state
  if (error || !issue) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Issue' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            {error ? 'Failed to load issue' : 'Issue not found'}
          </Text>
          {error ? (
            <Text className="font-sans text-sm text-content mt-1 text-center">
              {error.message}
            </Text>
          ) : (
            <Text className="font-sans text-sm text-content mt-1 text-center">
              This issue may have been deleted.
            </Text>
          )}
          <Pressable
            className="bg-primary rounded-md px-6 py-3 mt-4 min-h-[44px] items-center justify-center"
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text className="font-sans-medium text-sm text-on-accent">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: issue.identifier,
          headerBackTitle: 'Issues',
        }}
      />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#205DC2"
            progressBackgroundColor="#1E1F23"
          />
        }
      >
        <IssueDetailView
          issue={issue}
          onStatusPress={handleStatusPress}
          onPriorityPress={handlePriorityPress}
          onAssigneePress={handleAssigneePress}
        />

        <View className="h-px bg-divider mx-4" />

        <IssueComments
          issueId={issue._id}
          commentCount={issue.comments}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
