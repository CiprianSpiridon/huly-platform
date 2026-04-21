/**
 * Global toast renderer.
 *
 * Renders the top-of-queue toast from `useToastStore` at the root layout.
 * Each toast auto-dismisses after `durationMs`. Additional toasts queue
 * and appear one-by-one. Tap a toast to dismiss it early.
 */

import { useEffect, useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { useToastStore, type Toast } from '@/store/toast'

const TOAST_ANIM_MS = 180

interface Palette {
  bg: string
  accent: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconColor: string
  label: string
}

function paletteFor(kind: Toast['kind']): Palette {
  switch (kind) {
    case 'error':
      return {
        bg: 'bg-surface-panel',
        accent: 'border-l-4 border-status-error',
        icon: 'alert-circle',
        iconColor: '#EF4444',
        label: 'Error',
      }
    case 'success':
      return {
        bg: 'bg-surface-panel',
        accent: 'border-l-4 border-status-success',
        icon: 'checkmark-circle',
        iconColor: '#34DB80',
        label: 'Success',
      }
    case 'info':
    default:
      return {
        bg: 'bg-surface-panel',
        accent: 'border-l-4 border-accent-primary',
        icon: 'information-circle',
        iconColor: '#205DC2',
        label: 'Info',
      }
  }
}

export function ErrorToast(): React.ReactNode {
  const queue = useToastStore((s) => s.queue)
  const dismiss = useToastStore((s) => s.dismiss)
  const insets = useSafeAreaInsets()

  const current = queue[0] ?? null
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(-16)

  // Keep effect deps limited to the toast identity so we don't re-arm the
  // dismiss timer on unrelated re-renders of the queue.
  const currentId = current?.id ?? null
  const currentDurationMs = current?.durationMs ?? 0
  useEffect(() => {
    if (currentId == null) {
      opacity.value = withTiming(0, { duration: TOAST_ANIM_MS })
      translateY.value = withTiming(-16, { duration: TOAST_ANIM_MS })
      return
    }
    opacity.value = withTiming(1, { duration: TOAST_ANIM_MS })
    translateY.value = withTiming(0, { duration: TOAST_ANIM_MS })

    const timer = setTimeout(() => {
      dismiss(currentId)
    }, currentDurationMs)
    return () => clearTimeout(timer)
  }, [currentId, currentDurationMs, dismiss, opacity, translateY])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  const palette = useMemo(
    () => (current != null ? paletteFor(current.kind) : null),
    [current],
  )

  if (current == null || palette == null) return null

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, zIndex: 9999 }, animStyle]}
    >
      <Pressable
        onPress={() => dismiss(current.id)}
        accessibilityRole="alert"
        accessibilityLabel={`${palette.label}: ${current.message}`}
        accessibilityHint="Tap to dismiss"
        className={`${palette.bg} ${palette.accent} rounded-md shadow-md flex-row items-start gap-2 px-3 py-2.5`}
      >
        <Ionicons
          name={palette.icon}
          size={20}
          color={palette.iconColor}
          style={{ marginTop: 1 }}
        />
        <View className="flex-1">
          <Text
            className="font-sans-medium text-sm text-content-primary"
            numberOfLines={2}
          >
            {current.message}
          </Text>
          {current.detail != null && current.detail.length > 0 && (
            <Text
              className="font-sans text-xs text-content-tertiary mt-0.5"
              numberOfLines={2}
            >
              {current.detail}
            </Text>
          )}
        </View>
        {queue.length > 1 && (
          <Text className="font-sans text-xs text-content-tertiary ml-2">
            +{queue.length - 1}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  )
}
