/**
 * Bulk action bar for the inbox notification list.
 *
 * Appears when the user enters selection mode (via long-press).
 * Provides "Mark as Read" and "Archive" buttons with a count badge.
 * Also includes "Select All" and "Cancel" actions.
 *
 * Haptic feedback is provided via react-native-gesture-handler's
 * built-in haptics when available, or a no-op fallback.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BulkActionBarProps {
  selectedCount: number
  totalCount: number
  onMarkAsRead: () => void
  onArchive: () => void
  onSelectAll: () => void
  onCancel: () => void
  /**
   * Optional permanent-delete action. When provided, a Delete button is shown
   * alongside Mark Read and Archive. The caller is responsible for confirming
   * the action (e.g. via Alert) before invoking the mutation.
   */
  onDelete?: () => void
}

// ---------------------------------------------------------------------------
// Haptic helper
// ---------------------------------------------------------------------------

/**
 * Trigger a light haptic impact using React Native's built-in Vibration API.
 * Uses a short 10ms vibration to simulate a light haptic tap.
 */
function triggerHaptic(): void {
  try {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const { Vibration } = require('react-native') as typeof import('react-native')
      Vibration.vibrate(10)
    }
  } catch {
    // Silently skip if vibration is not available
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function BulkActionBarInner({
  selectedCount,
  totalCount,
  onMarkAsRead,
  onArchive,
  onSelectAll,
  onCancel,
  onDelete,
}: BulkActionBarProps): React.ReactNode {
  const handleMarkAsRead = useCallback(() => {
    triggerHaptic()
    onMarkAsRead()
  }, [onMarkAsRead])

  const handleArchive = useCallback(() => {
    triggerHaptic()
    onArchive()
  }, [onArchive])

  const handleSelectAll = useCallback(() => {
    triggerHaptic()
    onSelectAll()
  }, [onSelectAll])

  const handleDelete = useCallback(() => {
    triggerHaptic()
    if (onDelete !== undefined) onDelete()
  }, [onDelete])

  return (
    <View className="bg-surface-panel border-b border-divider px-4 py-2">
      {/* Top row: count + cancel */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-sans-semibold text-sm text-caption">
          {selectedCount} selected
        </Text>

        <View className="flex-row items-center gap-3">
          {selectedCount < totalCount && (
            <Pressable
              onPress={handleSelectAll}
              accessibilityRole="button"
              accessibilityLabel="Select all notifications"
              hitSlop={8}
            >
              <Text className="font-sans-medium text-sm text-accent-primary">
                Select All
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel selection"
            hitSlop={8}
          >
            <Text className="font-sans-medium text-sm text-caption">
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Action buttons */}
      <View className="flex-row gap-3">
        <Pressable
          className="flex-1 flex-row items-center justify-center bg-surface-accent rounded-md py-2.5 active:opacity-80"
          onPress={handleMarkAsRead}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${selectedCount} as read`}
        >
          <Ionicons name="checkmark-done-outline" size={18} color="#205DC2" />
          <Text className="font-sans-medium text-sm text-accent-primary ml-1.5">
            Mark Read ({selectedCount})
          </Text>
        </Pressable>

        <Pressable
          className="flex-1 flex-row items-center justify-center bg-surface-accent rounded-md py-2.5 active:opacity-80"
          onPress={handleArchive}
          accessibilityRole="button"
          accessibilityLabel={`Archive ${selectedCount} notifications`}
        >
          <Ionicons name="archive-outline" size={18} color="#EF4444" />
          <Text className="font-sans-medium text-sm text-negative ml-1.5">
            Archive ({selectedCount})
          </Text>
        </Pressable>

        {onDelete !== undefined && (
          <Pressable
            className="flex-1 flex-row items-center justify-center bg-surface-accent rounded-md py-2.5 active:opacity-80"
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${selectedCount} notifications permanently`}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text className="font-sans-medium text-sm text-negative ml-1.5">
              Delete ({selectedCount})
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const BulkActionBar = memo(BulkActionBarInner)

export { BulkActionBar }
export type { BulkActionBarProps }
