# Notifications

## What

The Huly mobile app uses `expo-notifications` for push notifications. Push tokens are registered with the Huly backend on login and workspace selection. Incoming notifications deep link into the appropriate screen using expo-router. Badge counts reflect unread items in the Huly inbox. Notification permissions must be requested at an appropriate time (after onboarding, not on first launch), and denial must be handled gracefully.

### Notification flow

| Step | Component | Action |
|---|---|---|
| 1. Permission request | App (settings or onboarding) | Request push permission |
| 2. Token registration | `expo-notifications` | Get Expo Push Token |
| 3. Backend registration | Huly account service | Send token to backend for this workspace |
| 4. Push delivery | Huly backend + APNs/FCM | Backend sends notification via Expo Push Service |
| 5. Foreground handling | `expo-notifications` listener | Show in-app banner or badge |
| 6. Background/tap handling | `expo-notifications` response listener | Deep link to relevant screen |
| 7. Badge management | `expo-notifications` | Set/clear app icon badge |

### Notification payload structure

```typescript
interface HulyNotificationPayload {
  type: 'issue' | 'message' | 'mention' | 'inbox';
  workspaceId: string;
  objectId: string;         // Issue ID, message ID, etc.
  title: string;            // Shown in push banner
  body: string;             // Shown in push banner
  deepLink?: string;        // e.g., "huly://tracker/ISSUE-123"
}
```

## How

### Notification setup module

```typescript
// src/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  if (existingStatus === 'denied') {
    // Permission was previously denied -- must go to settings
    Alert.alert(
      'Notifications disabled',
      'Enable notifications in Settings to receive updates from Huly.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // First time asking
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getPushToken(): Promise<string | null> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('Missing EAS project ID for push notifications');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  const granted = await requestPermission();
  if (!granted) return null;

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Huly notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#205DC2',
      sound: 'default',
    });
  }

  return await getPushToken();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
```

### Notification listeners in root layout

```tsx
// app/_layout.tsx (notification section)
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import type { HulyNotificationPayload } from '@/lib/notifications';

export default function RootLayout(): React.ReactNode {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Foreground notification received
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as HulyNotificationPayload;
        // Update badge count, show in-app indicator, etc.
        console.log('Foreground notification:', data.type, data.objectId);
      }
    );

    // User tapped on a notification (foreground, background, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as HulyNotificationPayload;
        handleNotificationNavigation(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // ... rest of layout
}

function handleNotificationNavigation(data: HulyNotificationPayload): void {
  switch (data.type) {
    case 'issue':
      router.push(`/tracker/${data.objectId}`);
      break;
    case 'message':
    case 'mention':
      router.push(`/chat/${data.objectId}`);
      break;
    case 'inbox':
      router.push(`/inbox/${data.objectId}`);
      break;
    default:
      router.push('/inbox');
  }
}
```

### Push token registration with backend

```typescript
// src/hooks/use-push-registration.ts
import { useEffect } from 'react';

import { registerForPushNotifications } from '@/lib/notifications';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';
import { getOrCreateAccountClient } from '@/client/account';

export function usePushRegistration(): void {
  const token = useAuthStore((s) => s.token);
  const workspace = useWorkspaceStore((s) => s.selectedWorkspace);

  useEffect(() => {
    if (!token || !workspace) return;

    let cancelled = false;

    async function register(): Promise<void> {
      try {
        const pushToken = await registerForPushNotifications();
        if (pushToken && !cancelled) {
          const client = await getOrCreateAccountClient(token ?? undefined);
          // Register push token with Huly backend
          // This API depends on Huly's push notification service integration
          await client.registerPushToken?.(pushToken, workspace);
        }
      } catch (error) {
        console.error('Push registration failed:', error);
      }
    }

    register();

    return () => {
      cancelled = true;
    };
  }, [token, workspace]);
}
```

### Notification preferences screen

```tsx
// app/(app)/(tabs)/settings/notifications.tsx
import { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { getPermissionStatus, requestPermission } from '@/lib/notifications';

export default function NotificationSettingsScreen(): React.ReactNode {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check(): Promise<void> {
      const status = await getPermissionStatus();
      setPermissionGranted(status === 'granted');
      setChecking(false);
    }
    check();
  }, []);

  const handleToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermission();
      setPermissionGranted(granted);
    } else {
      Alert.alert(
        'Disable notifications',
        'To disable notifications, go to Settings > Huly > Notifications.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between bg-surface-secondary rounded-lg p-4">
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
            onValueChange={handleToggle}
            trackColor={{ false: '#3D3F47', true: '#205DC2' }}
            disabled={checking}
            accessibilityLabel="Toggle push notifications"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
```

## When

### When to request notification permissions

| Timing | Good practice |
|---|---|
| On first launch | No -- user has no context yet |
| After successful login | Maybe -- only if notifications are core to the experience |
| When user opens notification settings | Yes -- user explicitly expressed interest |
| When user performs an action that benefits from notifications | Yes -- contextual request with explanation |

### When to show in-app vs system notifications

| App state | Behavior |
|---|---|
| Foreground, same screen | In-app banner / toast only (suppress system push) |
| Foreground, different screen | In-app banner with "tap to navigate" |
| Background | System push notification |
| Killed / terminated | System push notification |

### When to update badge count

- On notification received: increment
- On notification list viewed: decrement for viewed items
- On app foreground: sync with server count
- On logout: clear to 0

## Never

- **Never request notification permissions on first launch.** Wait for an appropriate context.
- **Never assume permissions are granted.** Always check status before sending push token to backend.
- **Never forget to clean up notification listeners.**

```typescript
// WRONG -- memory leak
useEffect(() => {
  Notifications.addNotificationReceivedListener(handler);
}, []);

// RIGHT -- cleanup on unmount
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(handler);
  return () => subscription.remove();
}, []);
```

- **Never hardcode the EAS project ID.** Read from `Constants.expoConfig.extra.eas.projectId`.
- **Never skip the Android notification channel.** Without it, notifications are silent on Android 8+.
- **Never navigate without checking auth state first.** A notification tap might arrive when the user is logged out. Check auth before deep linking.
- **Never log notification content in production.** Notifications may contain sensitive data.
