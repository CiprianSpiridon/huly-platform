/**
 * Bulk action bar for the inbox notification list.
 *
 * Appears when the user enters selection mode (via long-press).
 * Provides "Mark as Read" and "Archive" buttons with a count badge.
 * Also includes "Select All" and "Cancel" actions.
 *
 * Haptic feedback is provided via the shared expo-haptics wrapper which
 * respects Reduce Motion and gracefully no-ops on unsupported hardware.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { lightImpact, mediumImpact, selection } from '@/lib/haptics'

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
}: BulkActionBarProps): React.ReactNode {
  const handleMarkAsRead = useCallback(() => {
    lightImpact()
    onMarkAsRead()
  }, [onMarkAsRead])

  const handleArchive = useCallback(() => {
    // Bulk archive is destructive -- use a stronger tap for confirmation.
    mediumImpact()
    onArchive()
  }, [onArchive])

  const handleSelectAll = useCallback(() => {
    selection()
    onSelectAll()
  }, [onSelectAll])

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
      </View>
    </View>
  )
}

const BulkActionBar = memo(BulkActionBarInner)

export { BulkActionBar }
export type { BulkActionBarProps }
