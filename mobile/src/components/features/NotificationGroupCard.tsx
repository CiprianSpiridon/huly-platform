/**
 * Notification group card.
 *
 * Collapsed state: shows a single card representing a DocNotifyContext
 * with the resolved document title (or a humanized objectClass fallback)
 * and a count of notifications within the group.
 *
 * Expanded state: hides the summary and renders the individual
 * NotificationRow components underneath, one per notification in the group.
 *
 * The component is stateless about expansion -- the parent owns the
 * expanded-group set so persistence and accessibility announcements can
 * be coordinated at the list level.
 */

import { memo, useCallback, useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { NotificationRow } from './NotificationRow'
import type { NotificationItem } from '@/repositories/notification'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationGroup {
  /** DocNotifyContext ref or synthetic key used for grouping. */
  contextId: string
  /** Human-readable label for the card (document title or class fallback). */
  label: string
  /** True when the label came from the resolved context, false when falling back. */
  hasResolvedTitle: boolean
  /** objectClass of the underlying document, used for icon selection. */
  objectClass: string
  /** Notifications included in this group, already sorted newest-first. */
  items: NotificationItem[]
}

interface NotificationGroupCardProps {
  group: NotificationGroup
  isExpanded: boolean
  onToggleExpand: (contextId: string) => void
  selectedIds: Set<string>
  isSelectionMode: boolean
  onNotificationPress: (notification: NotificationItem) => void
  onNotificationLongPress: (notification: NotificationItem) => void
  onArchive: (id: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iconForObjectClass(objectClass: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (objectClass.includes('tracker:class:Issue')) return 'bug-outline'
  if (objectClass.includes('chunter:class:Channel')) return 'chatbubbles-outline'
  if (objectClass.includes('chunter:class:DirectMessage')) return 'person-outline'
  if (objectClass.includes('document:class:Document')) return 'document-text-outline'
  if (objectClass.includes('board:class:Card')) return 'albums-outline'
  if (objectClass.includes('recruit:class:Applicant')) return 'briefcase-outline'
  if (objectClass.includes('hr:class:Department')) return 'people-outline'
  return 'file-tray-outline'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function NotificationGroupCardInner(props: NotificationGroupCardProps): React.ReactNode {
  const {
    group,
    isExpanded,
    onToggleExpand,
    selectedIds,
    isSelectionMode,
    onNotificationPress,
    onNotificationLongPress,
    onArchive,
  } = props

  const unreadCount = useMemo(
    () => group.items.reduce((n, item) => (item.isViewed ? n : n + 1), 0),
    [group.items]
  )
  const totalCount = group.items.length
  const iconName = useMemo(() => iconForObjectClass(group.objectClass), [group.objectClass])

  const handleToggle = useCallback(() => {
    onToggleExpand(group.contextId)
  }, [group.contextId, onToggleExpand])

  return (
    <View className="border-b border-divider">
      <Pressable
        onPress={handleToggle}
        className="flex-row items-center px-3 py-3 bg-surface-list-row active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel={`${group.label}. ${totalCount} notification${totalCount === 1 ? '' : 's'}${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        accessibilityHint={isExpanded ? 'Double tap to collapse group' : 'Double tap to expand group'}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View className="w-8 h-8 items-center justify-center mr-2">
          <Ionicons name={iconName} size={20} color="#77818B" />
        </View>
        <View className="flex-1">
          <Text
            className="font-sans-semibold text-sm text-caption"
            numberOfLines={1}
          >
            {group.label}
          </Text>
          <Text className="font-sans text-xs text-dark mt-0.5">
            {totalCount} notification{totalCount === 1 ? '' : 's'}
            {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View className="w-2.5 h-2.5 rounded-full bg-notify mr-2" />
        )}
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#77818B"
        />
      </Pressable>

      {isExpanded ? (
        <View className="bg-surface">
          {group.items.map((item) => (
            <View key={item._id} className="pl-6">
              <NotificationRow
                notification={item}
                isSelected={selectedIds.has(item._id)}
                isSelectionMode={isSelectionMode}
                onPress={onNotificationPress}
                onLongPress={onNotificationLongPress}
                onArchive={onArchive}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const NotificationGroupCard = memo(NotificationGroupCardInner)

export { NotificationGroupCard }
export type { NotificationGroupCardProps }
