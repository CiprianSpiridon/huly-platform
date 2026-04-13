/**
 * In-app notification banner.
 *
 * Slides down from the top of the screen when a push notification
 * arrives while the app is in the foreground. Auto-dismisses after 4s.
 * Tap navigates to the relevant screen via notificationRouter.
 */

import { useEffect, useRef, useCallback } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BannerNotification {
  id: string
  title: string
  body: string
  type?: string
  objectId?: string
  objectClass?: string
}

interface InAppNotificationBannerProps {
  notification: BannerNotification | null
  onPress: (notification: BannerNotification) => void
  onDismiss: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 4000
const ANIMATION_DURATION = 300

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function InAppNotificationBanner({
  notification,
  onPress,
  onDismiss,
}: InAppNotificationBannerProps): React.ReactNode {
  const insets = useSafeAreaInsets()
  const translateY = useSharedValue(-120)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current != null) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
  }, [])

  const startDismissTimer = useCallback(() => {
    clearDismissTimer()
    dismissTimerRef.current = setTimeout(() => {
      translateY.value = withTiming(-120, {
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.ease),
      }, (finished) => {
        if (finished === true) {
          runOnJS(onDismiss)()
        }
      })
    }, AUTO_DISMISS_MS)
  }, [clearDismissTimer, onDismiss, translateY])

  useEffect(() => {
    if (notification != null) {
      // Slide in
      translateY.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
      })
      startDismissTimer()
    } else {
      // Slide out
      translateY.value = withTiming(-120, {
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.ease),
      })
      clearDismissTimer()
    }

    return clearDismissTimer
  }, [notification, translateY, startDismissTimer, clearDismissTimer])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const handlePress = useCallback(() => {
    if (notification != null) {
      clearDismissTimer()
      translateY.value = withTiming(-120, {
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.ease),
      })
      onPress(notification)
    }
  }, [notification, onPress, clearDismissTimer, translateY])

  const lastNotificationRef = useRef<BannerNotification | null>(null)
  if (notification != null) {
    lastNotificationRef.current = notification
  }
  const displayNotification = lastNotificationRef.current

  if (displayNotification == null) return null

  const iconName = getIconForType(displayNotification.type)

  return (
    <Animated.View
      pointerEvents={notification != null ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          paddingTop: insets.top,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        className="mx-3 bg-surface-secondary rounded-xl p-4 flex-row items-center shadow-lg"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Notification: ${displayNotification.title}. ${displayNotification.body}. Tap to view.`}
        accessibilityHint="Double tap to navigate to this notification"
      >
        <View className="w-9 h-9 rounded-full bg-accent-primary/20 items-center justify-center mr-3">
          <Ionicons name={iconName} size={18} color="#205DC2" />
        </View>
        <View className="flex-1 mr-2">
          <Text
            className="font-sans-semibold text-sm text-content-primary"
            numberOfLines={1}
          >
            {displayNotification.title}
          </Text>
          {displayNotification.body.length > 0 && (
            <Text
              className="font-sans text-xs text-content-secondary mt-0.5"
              numberOfLines={2}
            >
              {displayNotification.body}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={14} color="#77818B" />
      </Pressable>
    </Animated.View>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIconForType(type?: string): 'chatbubble' | 'checkmark-circle' | 'notifications' {
  switch (type) {
    case 'message':
    case 'mention':
      return 'chatbubble'
    case 'issue':
      return 'checkmark-circle'
    default:
      return 'notifications'
  }
}

export { InAppNotificationBanner }
