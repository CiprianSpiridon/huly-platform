/**
 * Notification row component for list display.
 *
 * Renders: type icon, title, body preview, relative timestamp, and an
 * unread indicator dot. Supports swipe-to-archive via Reanimated gesture
 * handler and long-press to enter selection mode.
 *
 * Uses the Huly design tokens for all colors and typography.
 */

import { memo, useCallback, useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

import type { NotificationItem } from '@/repositories/notification'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationRowProps {
  notification: NotificationItem
  isSelected: boolean
  isSelectionMode: boolean
  onPress: (notification: NotificationItem) => void
  onLongPress: (notification: NotificationItem) => void
  onArchive: (id: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SWIPE_THRESHOLD = -100 // px to trigger archive
const SWIPE_ACTION_WIDTH = 80

function getTypeIcon(type: string): { name: React.ComponentProps<typeof Ionicons>['name']; color: string } {
  switch (type) {
    case 'mentions':
      return { name: 'at-outline', color: '#3B82F6' }
    case 'reactions':
      return { name: 'heart-outline', color: '#EF4444' }
    case 'updates':
      return { name: 'sync-outline', color: '#34DB80' }
    default:
      return { name: 'notifications-outline', color: '#77818B' }
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`

  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`

  const months = Math.floor(days / 30)
  return `${months}mo`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function NotificationRowInner({
  notification,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
  onArchive,
}: NotificationRowProps): React.ReactNode {
  const translateX = useSharedValue(0)
  const icon = useMemo(() => getTypeIcon(notification.notificationType), [notification.notificationType])
  const timeAgo = useMemo(() => formatRelativeTime(notification.modifiedOn), [notification.modifiedOn])

  const handlePress = useCallback(() => {
    onPress(notification)
  }, [notification, onPress])

  const handleLongPress = useCallback(() => {
    onLongPress(notification)
  }, [notification, onLongPress])

  const triggerArchive = useCallback(() => {
    onArchive(notification._id)
  }, [notification._id, onArchive])

  // Swipe gesture for archive
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Only allow left swipe
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -SWIPE_ACTION_WIDTH - 20)
      }
    })
    .onEnd((event) => {
      if (event.translationX < SWIPE_THRESHOLD) {
        // Trigger archive
        translateX.value = withTiming(-SWIPE_ACTION_WIDTH * 3, { duration: 200 })
        runOnJS(triggerArchive)()
      } else {
        // Snap back
        translateX.value = withTiming(0, { duration: 200 })
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <View className="relative overflow-hidden">
      {/* Archive action behind the row */}
      <View
        className="absolute right-0 top-0 bottom-0 justify-center items-center bg-negative"
        style={{ width: SWIPE_ACTION_WIDTH }}
      >
        <Ionicons name="archive-outline" size={22} color="#FFFFFF" />
        <Text className="font-sans text-xs text-on-accent mt-1">Archive</Text>
      </View>

      {/* Swipeable notification row */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <Pressable
            className={`bg-surface-list-row p-3 border-b border-divider active:opacity-80 ${
              isSelected ? 'bg-accent-subtle' : ''
            }`}
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={400}
            accessibilityRole="button"
            accessibilityLabel={`${notification.isViewed ? '' : 'Unread '}notification: ${notification.title || 'Notification'}. ${timeAgo}`}
            accessibilityHint="Double tap to open. Swipe left to archive."
            accessibilityState={{ selected: isSelected }}
          >
            <View className="flex-row items-start gap-3">
              {/* Selection checkbox or type icon */}
              <View className="w-8 h-8 items-center justify-center mt-0.5">
                {isSelectionMode ? (
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isSelected ? '#205DC2' : '#77818B'}
                  />
                ) : (
                  <Ionicons
                    name={icon.name}
                    size={20}
                    color={icon.color}
                  />
                )}
              </View>

              {/* Content */}
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text
                    className={`flex-1 mr-2 text-sm ${
                      notification.isViewed
                        ? 'font-sans text-caption'
                        : 'font-sans-semibold text-caption'
                    }`}
                    numberOfLines={1}
                  >
                    {notification.title || 'Notification'}
                  </Text>
                  <Text className="font-sans text-xs text-dark">
                    {timeAgo}
                  </Text>
                </View>

                {notification.body !== '' && (
                  <Text
                    className="font-sans text-xs text-dark mt-0.5"
                    numberOfLines={2}
                  >
                    {notification.body}
                  </Text>
                )}
              </View>

              {/* Unread dot */}
              {!notification.isViewed && (
                <View className="w-2.5 h-2.5 rounded-full bg-notify mt-1.5" />
              )}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const NotificationRow = memo(NotificationRowInner)

export { NotificationRow }
export type { NotificationRowProps }
