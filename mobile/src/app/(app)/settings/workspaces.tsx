/**
 * Workspace switcher screen.
 *
 * Lists all workspaces the user belongs to. Current workspace shows a
 * checkmark and is not tappable. Tapping another workspace shows a
 * confirmation alert, then switches with a full-screen loading overlay.
 * Archived/disabled workspaces show an error alert.
 */

import { useCallback, useState } from 'react'
import { View, Text, Alert, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { router, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import {
  isActiveMode,
  isArchivingMode,
  isDeletingMode,
  isMigrationMode,
  isRestoringMode,
  isUpgradingMode,
  type WorkspaceInfoWithStatus,
} from '@hcengineering/core'
import { useWorkspaces } from '@/hooks/use-workspace'
import { useSwitchWorkspace } from '@/hooks/useWorkspaces'
import { useWorkspaceStore } from '@/store/workspace'
import { WorkspaceRow } from '@/components/features/WorkspaceRow'

export default function WorkspaceSwitcherScreen(): React.ReactNode {
  const { data: workspaces, isLoading, error, refetch } = useWorkspaces()
  const { switchTo, isSwitching } = useSwitchWorkspace()
  const currentWorkspaceUrl = useWorkspaceStore((s) => s.workspaceUrl)
  const [switchingName, setSwitchingName] = useState<string | null>(null)

  const handleWorkspacePress = useCallback(
    (workspace: WorkspaceInfoWithStatus) => {
      // Guard: disabled workspaces (no access).
      if (workspace.isDisabled === true) {
        Alert.alert(
          'Workspace Unavailable',
          `"${workspace.name}" is archived and cannot be accessed.`,
          [{ text: 'OK' }],
        )
        return
      }

      // Guard: intermediate workspace states. A workspace that is mid
      // creation, deletion, archive, migration, restore, or upgrade cannot
      // safely accept a transactor connection; surface a specific message
      // instead of letting `selectWorkspace` fail with a generic error.
      const mode = workspace.mode
      if (isDeletingMode(mode)) {
        Alert.alert('Workspace Unavailable', `"${workspace.name}" is being deleted.`, [
          { text: 'OK' },
        ])
        return
      }
      if (isArchivingMode(mode) && !isActiveMode(mode)) {
        Alert.alert(
          'Workspace Unavailable',
          `"${workspace.name}" is archived or archiving.`,
          [{ text: 'OK' }],
        )
        return
      }
      if (isMigrationMode(mode) || isRestoringMode(mode) || isUpgradingMode(mode)) {
        Alert.alert(
          'Workspace Unavailable',
          `"${workspace.name}" is being maintained. Try again in a few minutes.`,
          [{ text: 'OK' }],
        )
        return
      }
      if (mode === 'manual-creation' || mode === 'pending-creation' || mode === 'creating') {
        Alert.alert(
          'Workspace Unavailable',
          `"${workspace.name}" is still being created.`,
          [{ text: 'OK' }],
        )
        return
      }

      // Guard: already on this workspace
      if (workspace.url === currentWorkspaceUrl) {
        return
      }

      Alert.alert(
        'Switch Workspace',
        `Switch to "${workspace.name}"? This will reload all data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch',
            onPress: () => {
              setSwitchingName(workspace.name)
              void switchTo(workspace.url).catch((err) => {
                setSwitchingName(null)
                const message =
                  err instanceof Error ? err.message : 'Failed to switch workspace'
                Alert.alert('Switch Failed', message, [{ text: 'OK' }])
              })
            },
          },
        ],
      )
    },
    [currentWorkspaceUrl, switchTo],
  )

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error != null) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-sans-medium text-base text-content-primary mb-2 text-center">
            Failed to load workspaces
          </Text>
          <Text className="font-sans text-sm text-content-secondary mb-4 text-center">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </Text>
          <Text
            className="font-sans-medium text-sm text-accent-primary"
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading workspaces"
          >
            Retry
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Empty state
  if (workspaces == null || workspaces.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-sans-medium text-base text-content-primary text-center">
            No workspaces found
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <FlashList
        data={workspaces}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => (
          <WorkspaceRow
            workspace={item}
            isCurrent={item.url === currentWorkspaceUrl}
            onPress={handleWorkspacePress}
            disabled={isSwitching}
          />
        )}
        ItemSeparatorComponent={ListSeparator}
        ListFooterComponent={
          <Pressable
            onPress={() => {
              router.push('/(app)/settings/create-workspace' as Href)
            }}
            disabled={isSwitching}
            className="flex-row items-center gap-3 px-4 py-4 min-h-[44px] active:bg-surface-tertiary border-t border-border-primary mt-2"
            accessibilityRole="button"
            accessibilityLabel="Create a new workspace"
          >
            <Ionicons name="add-circle-outline" size={22} color="#205DC2" />
            <Text className="font-sans-medium text-base text-accent-primary">
              Create Workspace
            </Text>
          </Pressable>
        }
      />

      {/* Full-screen loading overlay during workspace switch */}
      {isSwitching && (
        <View className="absolute inset-0 bg-surface-overlay items-center justify-center">
          <View className="bg-surface-secondary rounded-xl p-6 items-center">
            <ActivityIndicator size="large" color="#205DC2" />
            <Text className="font-sans-medium text-sm text-content-primary mt-3">
              Switching to {switchingName ?? 'workspace'}...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

function ListSeparator(): React.ReactNode {
  return <View className="h-px bg-border-primary ms-4" />
}
