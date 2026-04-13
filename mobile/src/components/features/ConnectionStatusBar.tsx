/**
 * Connection status indicator bar.
 *
 * Shows a banner at the top of the app when the WebSocket is not connected:
 * - "Reconnecting..." (yellow) when reconnecting
 * - "Offline" (red) when disconnected or errored
 * - Hidden when connected or idle
 *
 * Animates in/out using LayoutAnimation.
 */

import { memo, useEffect, useRef } from 'react'
import { Animated, LayoutAnimation, Platform, UIManager } from 'react-native'
import { Text, View } from 'react-native'

import { useWebSocketStore, type WsStatus } from '@/store/websocket'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental != null) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

function ConnectionStatusBarInner(): React.ReactNode {
  const status = useWebSocketStore((s) => s.status)
  const opacity = useRef(new Animated.Value(0)).current

  const shouldShow = status === 'reconnecting' || status === 'disconnected' || status === 'error'

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    Animated.timing(opacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [shouldShow, opacity])

  if (!shouldShow) {
    return null
  }

  const config = getStatusConfig(status)

  return (
    <Animated.View style={{ opacity }}>
      <View
        className={`px-4 py-2 ${config.bgClass}`}
        accessibilityRole="alert"
        accessibilityLabel={config.label}
        accessibilityLiveRegion="polite"
      >
        <Text className={`text-center text-sm font-sans-medium ${config.textClass}`}>
          {config.label}
        </Text>
      </View>
    </Animated.View>
  )
}

interface StatusConfig {
  bgClass: string
  textClass: string
  label: string
}

function getStatusConfig(status: WsStatus): StatusConfig {
  switch (status) {
    case 'reconnecting':
      return {
        bgClass: 'bg-yellow-600',
        textClass: 'text-yellow-100',
        label: 'Reconnecting...',
      }
    case 'disconnected':
    case 'error':
      return {
        bgClass: 'bg-red-700',
        textClass: 'text-red-100',
        label: 'Offline',
      }
    default:
      return {
        bgClass: 'bg-transparent',
        textClass: 'text-transparent',
        label: '',
      }
  }
}

export const ConnectionStatusBar = memo(ConnectionStatusBarInner)
