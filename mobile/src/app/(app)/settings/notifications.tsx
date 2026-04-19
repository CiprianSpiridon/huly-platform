/**
 * Notification preferences screen.
 *
 * Provides:
 * - Master toggle reflecting OS notification permission status
 * - Per-category toggles (Chat, Tracker, Inbox) persisted to AsyncStorage
 * - Per-type sub-toggles within each category (e.g. Chat -> mentions,
 *   replies, reactions, messages).
 *
 * Parent/child invariant: disabling a parent category disables every child
 * type and snapshots the previous child state. Re-enabling the parent
 * restores the prior child state. This is enforced in the push store.
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, Switch, Alert, Linking, ActivityIndicator, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getPermissionStatus, requestPermission } from '@/lib/notifications'
import { usePushStore } from '@/store/push'
import type { NotificationCategory } from '@/lib/notifications'

// ---------------------------------------------------------------------------
// Category + type definitions
// ---------------------------------------------------------------------------

interface TypeOption {
  key: string
  label: string
  description: string
}

interface CategoryOption {
  key: NotificationCategory
  label: string
  description: string
  types: TypeOption[]
}

const CATEGORIES: CategoryOption[] = [
  {
    key: 'chat',
    label: 'Chat messages',
    description: 'Messages, mentions, and reactions in channels',
    types: [
      { key: 'mentions', label: 'Mentions', description: 'You were @mentioned in a message' },
      { key: 'replies', label: 'Replies', description: 'Someone replied in a thread you follow' },
      { key: 'reactions', label: 'Reactions', description: 'Someone reacted to your message' },
      { key: 'messages', label: 'New messages', description: 'New messages in channels and DMs' },
    ],
  },
  {
    key: 'tracker',
    label: 'Tracker updates',
    description: 'Issue assignments, status changes, and comments',
    types: [
      { key: 'assigned', label: 'Assigned to you', description: 'An issue was assigned to you' },
      { key: 'statusChanged', label: 'Status changed', description: 'Status updates on your issues' },
      { key: 'commented', label: 'New comments', description: 'Comments on issues you follow' },
    ],
  },
  {
    key: 'inbox',
    label: 'Inbox',
    description: 'General activity notifications',
    types: [
      { key: 'activity', label: 'Activity', description: 'General activity in documents you follow' },
      { key: 'system', label: 'System', description: 'Workspace and system announcements' },
    ],
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
  const typePreferences = usePushStore((s) => s.typePreferences)
  const togglePreference = usePushStore((s) => s.togglePreference)
  const toggleTypePreference = usePushStore((s) => s.toggleTypePreference)

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

  // Per-type toggle handler
  const handleTypeToggle = useCallback(
    (category: NotificationCategory, type: string) => {
      void toggleTypePreference(category, type)
    },
    [toggleTypePreference]
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
      <ScrollView contentContainerClassName="px-4 py-4 pb-8">
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

        {/* Per-category and per-type toggles */}
        <Text className="text-xs font-sans-semibold text-content-tertiary uppercase tracking-wide pb-2">
          Categories
        </Text>

        {CATEGORIES.map((category) => {
          const parentEnabled = preferences[category.key]
          const childPrefs = typePreferences[category.key] as Record<string, boolean>
          return (
            <View
              key={category.key}
              className="bg-surface-secondary rounded-lg overflow-hidden mb-4"
            >
              {/* Parent row */}
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
                  value={parentEnabled}
                  onValueChange={() => handleCategoryToggle(category.key)}
                  trackColor={{ false: '#3D3F47', true: '#205DC2' }}
                  disabled={!permissionGranted}
                  accessibilityLabel={`Toggle ${category.label} notifications`}
                />
              </View>

              {/* Child rows */}
              {category.types.map((type, index) => {
                const childEnabled = childPrefs[type.key] === true
                const childDisabled = !permissionGranted || !parentEnabled
                return (
                  <View key={type.key}>
                    <View className="h-px bg-border-primary mx-4" />
                    <View
                      className={`flex-row items-center justify-between pl-8 pr-4 py-3 ${index === 0 ? 'pt-3' : ''}`}
                    >
                      <View className="flex-1 mr-4">
                        <Text
                          className={`text-sm font-sans-medium ${childDisabled ? 'text-content-tertiary' : 'text-content-primary'}`}
                        >
                          {type.label}
                        </Text>
                        <Text className="text-xs font-sans text-content-secondary mt-0.5">
                          {type.description}
                        </Text>
                      </View>
                      <Switch
                        value={childEnabled}
                        onValueChange={() => handleTypeToggle(category.key, type.key)}
                        trackColor={{ false: '#3D3F47', true: '#205DC2' }}
                        disabled={childDisabled}
                        accessibilityLabel={`Toggle ${category.label} ${type.label}`}
                      />
                    </View>
                  </View>
                )
              })}
            </View>
          )
        })}

        {!permissionGranted && (
          <Text className="text-xs font-sans text-content-tertiary mt-1 px-1">
            Enable push notifications above to configure per-category preferences.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
