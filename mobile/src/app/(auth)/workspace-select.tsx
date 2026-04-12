import { useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import type { WorkspaceInfoWithStatus } from '@hcengineering/core'

import { useWorkspaces, useSelectWorkspace } from '@/hooks/use-workspace'

export default function WorkspaceSelectScreen(): React.ReactNode {
  const { data: workspaces, isLoading, error, refetch } = useWorkspaces()
  const { selectWorkspace, isSelecting } = useSelectWorkspace()

  // Filter to only active workspaces
  const activeWorkspaces = workspaces?.filter(
    (ws) => ws.mode !== 'archived' && ws.mode !== 'pending-deletion',
  )

  const handleSelect = useCallback(
    async (ws: WorkspaceInfoWithStatus) => {
      try {
        await selectWorkspace(ws.url)
        router.replace('/(app)')
      } catch {
        Alert.alert('Error', 'Failed to connect to workspace. Please try again.')
      }
    },
    [selectWorkspace],
  )

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color="#205DC2" />
        <Text className="font-sans text-sm text-content mt-4">
          Loading workspaces...
        </Text>
      </SafeAreaView>
    )
  }

  if (error != null) {
    return (
      <SafeAreaView className="flex-1 bg-surface justify-center items-center px-6">
        <Text className="font-sans-bold text-lg text-caption mb-2">
          Failed to load workspaces
        </Text>
        <Text className="font-sans text-sm text-content text-center mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
        <Pressable
          className="rounded-md bg-primary px-6 p-3"
          onPress={() => { void refetch() }}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text className="font-sans-medium text-base text-white">
            Retry
          </Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  if (activeWorkspaces == null || activeWorkspaces.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface justify-center items-center px-6">
        <Text className="font-sans-bold text-lg text-caption mb-2">
          No workspaces
        </Text>
        <Text className="font-sans text-sm text-content text-center">
          You don't have any active workspaces. Create one on the web first.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="px-6 pt-8 pb-4">
        <Text className="font-sans-bold text-2xl text-caption">
          Choose workspace
        </Text>
      </View>
      <FlatList
        data={activeWorkspaces}
        keyExtractor={(item) => item.uuid}
        contentContainerClassName="px-4 pb-4"
        renderItem={({ item }) => (
          <Pressable
            className="mb-3 rounded-md bg-surface-panel p-4 active:opacity-80"
            onPress={() => { void handleSelect(item) }}
            disabled={isSelecting}
            accessibilityRole="button"
            accessibilityLabel={`Select workspace ${item.name}`}
          >
            <Text className="font-sans-semibold text-lg text-caption">
              {item.name}
            </Text>
            <Text className="font-sans text-sm text-content mt-1">
              {item.url}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}
