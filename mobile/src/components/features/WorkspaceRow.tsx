/**
 * Workspace row for the workspace switcher screen.
 *
 * Shows workspace name, URL, and a checkmark if it is the currently
 * selected workspace. Minimum 44px touch target.
 */

import { memo, useCallback } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { WorkspaceInfoWithStatus } from '@hcengineering/core'

interface WorkspaceRowProps {
  workspace: WorkspaceInfoWithStatus
  isCurrent: boolean
  onPress: (workspace: WorkspaceInfoWithStatus) => void
  disabled?: boolean
}

function WorkspaceRowInner({
  workspace,
  isCurrent,
  onPress,
  disabled = false,
}: WorkspaceRowProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onPress(workspace)
  }, [workspace, onPress])

  const isDisabled = isCurrent || disabled || workspace.isDisabled === true

  return (
    <Pressable
      className={`flex-row items-center px-4 min-h-[56px] py-3 ${
        isDisabled ? '' : 'active:bg-surface-tertiary'
      }`}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={`${workspace.name}${isCurrent ? ', current workspace' : ''}`}
      accessibilityState={{ selected: isCurrent, disabled: isDisabled }}
    >
      <View className="flex-1">
        <Text
          className={`font-sans-medium text-base ${
            workspace.isDisabled === true ? 'text-content-disabled' : 'text-content-primary'
          }`}
          numberOfLines={1}
        >
          {workspace.name}
        </Text>
        <Text
          className="font-sans text-sm text-content-secondary mt-0.5"
          numberOfLines={1}
        >
          {workspace.url}
        </Text>
      </View>
      {isCurrent && (
        <Ionicons
          name="checkmark"
          size={20}
          color="#205DC2"
          accessibilityLabel="Current workspace"
        />
      )}
      {workspace.isDisabled === true && (
        <Text className="font-sans text-xs text-content-tertiary ms-2">
          Archived
        </Text>
      )}
    </Pressable>
  )
}

const WorkspaceRow = memo(WorkspaceRowInner)

export { WorkspaceRow }
export type { WorkspaceRowProps }
