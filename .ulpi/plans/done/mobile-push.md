# Mobile Push Notifications (Phase 8)

## Context

Add push notifications via expo-notifications. Register Expo push tokens with the Huly notification service. Handle foreground banners, background OS notifications, deep linking from taps, badge management, and notification preferences.

## Architecture

Expo Push Service → APNs/FCM. Token stored as PushSubscription doc (endpoint=ExponentPushToken, keys={p256dh:'expo',auth:'expo'}). Server-side: new /expo-push endpoint using expo-server-sdk.

## Tasks: 10 (TASK-001 through TASK-010)

See mobile-push.json for full task DAG.

Key tasks:
- expo-notifications setup + permissions
- Push notification Zustand store
- Token registration with backend (PushSubscription doc)
- Server-side Expo push endpoint
- Foreground in-app banner
- Deep linking from notification tap (cold start + background)
- Badge count management
- Notification preferences screen

Critical path: TASK-001 → TASK-002 → TASK-005 → TASK-007 → TASK-008
