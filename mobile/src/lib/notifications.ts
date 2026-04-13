/**
 * Notification setup module.
 *
 * Handles push notification permissions, token acquisition, Android
 * notification channels, and foreground notification display.
 *
 * Guards against simulator (no push token available on simulators).
 */

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform, Alert, Linking } from 'react-native'
import Constants from 'expo-constants'

// ---------------------------------------------------------------------------
// Payload type
// ---------------------------------------------------------------------------

export interface HulyPushPayload {
  type: 'issue' | 'message' | 'mention' | 'inbox'
  workspaceId?: string
  objectId?: string
  objectClass?: string
  title?: string
  body?: string
}

// ---------------------------------------------------------------------------
// Android notification channels
// ---------------------------------------------------------------------------

export const NOTIFICATION_CHANNELS = {
  chat: {
    id: 'huly-chat',
    name: 'Chat messages',
    description: 'Messages and mentions in Huly channels',
  },
  tracker: {
    id: 'huly-tracker',
    name: 'Tracker updates',
    description: 'Issue assignments, status changes, and comments',
  },
  inbox: {
    id: 'huly-inbox',
    name: 'Inbox notifications',
    description: 'General notifications and activity updates',
  },
} as const

export type NotificationCategory = keyof typeof NOTIFICATION_CHANNELS

// ---------------------------------------------------------------------------
// Foreground notification handler
// ---------------------------------------------------------------------------

/**
 * Configure how notifications appear when app is in foreground.
 * Must be called at module level (before any component renders).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,  // We show our own in-app banner instead
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
})

// ---------------------------------------------------------------------------
// Permission handling
// ---------------------------------------------------------------------------

/**
 * Returns current notification permission status.
 */
export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync()
  return status
}

/**
 * Request notification permission from the user.
 *
 * On first request, shows the OS prompt. If previously denied,
 * offers to open Settings.
 *
 * Returns true if permission is now granted.
 */
export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device')
    return false
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()

  if (existingStatus === 'granted') {
    return true
  }

  if (existingStatus === 'denied') {
    Alert.alert(
      'Notifications disabled',
      'Enable notifications in Settings to receive updates from Huly.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ]
    )
    return false
  }

  // First time -- show OS prompt
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// ---------------------------------------------------------------------------
// Push token
// ---------------------------------------------------------------------------

/**
 * Get the Expo Push Token for this device.
 *
 * Returns null on simulator or if the EAS project ID is missing.
 */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device -- skipping token acquisition')
    return null
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
    if (projectId == null || projectId === 'your-eas-project-id') {
      console.warn('Missing or placeholder EAS project ID for push notifications')
      return null
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    return tokenData.data
  } catch (error) {
    console.error('Failed to get push token:', error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Android channels
// ---------------------------------------------------------------------------

/**
 * Create Android notification channels.
 * No-op on iOS. Must be called before any notification is delivered on Android.
 */
export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return

  for (const channel of Object.values(NOTIFICATION_CHANNELS)) {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      description: channel.description,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#205DC2',
      sound: 'default',
    })
  }
}

// ---------------------------------------------------------------------------
// Full registration flow
// ---------------------------------------------------------------------------

/**
 * Complete registration flow:
 * 1. Request permission
 * 2. Set up Android channels
 * 3. Get push token
 *
 * Returns the Expo Push Token string, or null if any step fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const granted = await requestPermission()
  if (!granted) return null

  await setupAndroidChannels()

  return await getPushToken()
}

// ---------------------------------------------------------------------------
// Badge management
// ---------------------------------------------------------------------------

/**
 * Set the app icon badge count.
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count)
}

/**
 * Clear the app icon badge.
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0)
}
