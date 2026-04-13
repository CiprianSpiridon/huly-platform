/**
 * Notification preferences screen.
 *
 * Provides:
 * - Master toggle reflecting OS notification permission status
 * - Per-category toggles (Chat, Tracker, Inbox) persisted to AsyncStorage
 *
 * When the master toggle is off (OS permission denied), the per-category
 * toggles are disabled since no notifications will be delivered.
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, Switch, Alert, Linking, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getPermissionStatus, requestPermission } from '@/lib/notifications'
import { usePushStore } from '@/store/push'
import type { NotificationCategory } from '@/lib/notifications'

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

interface CategoryOption {
  key: NotificationCategory
  label: string
  description: string
}

const CATEGORIES: CategoryOption[] = [
  {
    key: 'chat',
    label: 'Chat messages',
    description: 'Messages, mentions, and reactions in channels',
  },
  {
    key: 'tracker',
    label: 'Tracker updates',
    description: 'Issue assignments, status changes, and comments',
  },
  {
    key: 'inbox',
    label: 'Inbox',
    description: 'General activity notifications',
  },
]

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function NotificationSettingsScreen(): React.ReactNode {
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [checking, setChecking] = useState(true)
  const isRegistered = usePushStore((s) => s.isRegistered)
  const pushToken = usePushStore((s) => s.expoPushToken)

  const preferences = usePushStore((s) => s.preferences)
  const togglePreference = usePushStore((s) => s.togglePreference)

  // Push is not yet configured if no token was acquired
  const pushAvailable = pushToken != null && isRegistered

  // Check current OS permission status on mount
  useEffect(() => {
    async function check(): Promise<void> {
      const status = await getPermissionStatus()
      setPermissionGranted(status === 'granted')
      setChecking(false)
    }
    void check()
  }, [])

  // Master toggle handler
  const handleMasterToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermission()
      setPermissionGranted(granted)
    } else {
      Alert.alert(
        'Disable notifications',
        'To disable notifications, go to Settings > Huly > Notifications.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ]
      )
    }
  }, [])

  // Category toggle handler
  const handleCategoryToggle = useCallback(
    (category: NotificationCategory) => {
      void togglePreference(category)
    },
    [togglePreference]
  )

  if (checking) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary items-center justify-center" edges={['bottom']}>
        <ActivityIndicator size="small" color="#205DC2" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <View className="px-4 py-4">
        {/* Not configured banner */}
        {!pushAvailable ? (
          <View className="bg-surface-tertiary rounded-lg p-4 mb-4 border border-border-primary">
            <Text className="text-sm font-sans-medium text-content-secondary">
              Push notifications are not yet configured for this build. Token registration requires a valid EAS project ID and server-side Expo push integration.
            </Text>
          </View>
        ) : null}

        {/* Master toggle */}
        <View className="bg-surface-secondary rounded-lg p-4 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-base font-sans-medium text-content-primary">
                Push notifications
              </Text>
              <Text className="text-sm font-sans text-content-secondary mt-1">
                Receive notifications for mentions, assignments, and messages.
              </Text>
            </View>
            <Switch
              value={permissionGranted}
              onValueChange={(v) => void handleMasterToggle(v)}
              trackColor={{ false: '#3D3F47', true: '#205DC2' }}
              accessibilityLabel="Toggle push notifications"
            />
          </View>
        </View>

        {/* Per-category toggles */}
        <Text className="text-xs font-sans-semibold text-content-tertiary uppercase tracking-wide pb-2">
          Categories
        </Text>
        <View className="bg-surface-secondary rounded-lg overflow-hidden">
          {CATEGORIES.map((category, index) => (
            <View key={category.key}>
              {index > 0 && <View className="h-px bg-border-primary mx-4" />}
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-1 mr-4">
                  <Text className="text-sm font-sans-medium text-content-primary">
                    {category.label}
                  </Text>
                  <Text className="text-xs font-sans text-content-secondary mt-0.5">
                    {category.description}
                  </Text>
                </View>
                <Switch
                  value={preferences[category.key]}
                  onValueChange={() => handleCategoryToggle(category.key)}
                  trackColor={{ false: '#3D3F47', true: '#205DC2' }}
                  disabled={!permissionGranted}
                  accessibilityLabel={`Toggle ${category.label} notifications`}
                />
              </View>
            </View>
          ))}
        </View>

        {!permissionGranted && (
          <Text className="text-xs font-sans text-content-tertiary mt-3 px-1">
            Enable push notifications above to configure per-category preferences.
          </Text>
        )}
      </View>
    </SafeAreaView>
  )
}
