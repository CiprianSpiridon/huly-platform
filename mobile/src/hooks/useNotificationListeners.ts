/**
 * Notification listener hooks.
 *
 * useNotificationListeners: Registers foreground and background/tap listeners
 * in the root layout. Handles:
 *
 * - Foreground: Shows an animated in-app banner via InAppNotificationBanner.
 * - Background/killed tap: Navigates to the relevant screen via notificationRouter.
 * - Cold start: Checks for the last notification response on mount.
 *
 * Must be mounted in the root layout (always-mounted component) to ensure
 * listeners are active even during navigation transitions.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'

import { resolveNotificationRoute } from '@/lib/notificationRouter'
import { usePushStore } from '@/store/push'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { notificationKeys } from './useNotifications'
import type { BannerNotification } from '@/components/features/InAppNotificationBanner'
import type { HulyPushPayload } from '@/lib/notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationListenerState {
  /** The notification currently shown in the in-app banner. Null when hidden. */
  bannerNotification: BannerNotification | null
  /** Dismiss the current banner. */
  dismissBanner: () => void
  /** Handle tap on the in-app banner -- navigates to the relevant screen. */
  handleBannerPress: (notification: BannerNotification) => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Sets up notification listeners for the app lifecycle.
 *
 * Returns state needed to render the InAppNotificationBanner in the
 * root layout.
 */
export function useNotificationListeners(): NotificationListenerState {
  const [bannerNotification, setBannerNotification] = useState<BannerNotification | null>(null)
  const queryClient = useQueryClient()
  const preferences = usePushStore((s) => s.preferences)
  const typePreferences = usePushStore((s) => s.typePreferences)

  const foregroundListenerRef = useRef<Notifications.Subscription | null>(null)
  const responseListenerRef = useRef<Notifications.Subscription | null>(null)

  // ---------------------------------------------------------------------------
  // Foreground notification received
  // ---------------------------------------------------------------------------

  useEffect(() => {
    foregroundListenerRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as unknown as HulyPushPayload | undefined
        const content = notification.request.content

        // Check if this notification category is enabled in preferences,
        // then enforce the per-type (sub-category) toggle.
        if (data?.type != null) {
          const category = mapTypeToCategory(data.type)
          if (category != null && !preferences[category]) {
            // User has disabled this category -- suppress the banner
            return
          }
          if (category != null) {
            const subType = mapTypeToSubType(data.type)
            if (subType != null) {
              const categoryTypes = typePreferences[category] as Record<string, boolean>
              if (categoryTypes[subType] === false) {
                // Child type disabled -- suppress the banner.
                return
              }
            }
          }
        }

        // Show in-app banner
        setBannerNotification({
          id: notification.request.identifier,
          title: content.title ?? 'Huly',
          body: content.body ?? '',
          type: data?.type,
          objectId: data?.objectId,
          objectClass: data?.objectClass,
        })

        // Invalidate notification queries to refresh the list
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
        void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
      }
    )

    return () => {
      if (foregroundListenerRef.current != null) {
        Notifications.removeNotificationSubscription(foregroundListenerRef.current)
      }
    }
  }, [queryClient, preferences, typePreferences])

  // ---------------------------------------------------------------------------
  // Notification tap (background/killed)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response)
      }
    )

    return () => {
      if (responseListenerRef.current != null) {
        Notifications.removeNotificationSubscription(responseListenerRef.current)
      }
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Cold start -- check for last notification response
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function checkColdStart(): Promise<void> {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync()
        if (lastResponse != null) {
          // Small delay to let the navigation tree mount
          setTimeout(() => {
            handleNotificationResponse(lastResponse)
          }, 500)
        }
      } catch {
        // Ignore -- not critical
      }
    }

    void checkColdStart()
  }, [])

  // ---------------------------------------------------------------------------
  // Banner interaction handlers
  // ---------------------------------------------------------------------------

  const dismissBanner = useCallback(() => {
    setBannerNotification(null)
  }, [])

  const handleBannerPress = useCallback((notification: BannerNotification) => {
    setBannerNotification(null)
    navigateToNotification(notification.objectClass, notification.objectId)
  }, [])

  return {
    bannerNotification,
    dismissBanner,
    handleBannerPress,
  }
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/**
 * Handle a notification response (user tapped on a notification).
 *
 * Checks auth state before navigating. If the user is not authenticated,
 * the auth guard will handle the redirect.
 */
function handleNotificationResponse(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data as unknown as HulyPushPayload | undefined

  if (data?.objectClass == null || data.objectId == null) {
    // No deep link data -- navigate to inbox
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    const hasWorkspace = useWorkspaceStore.getState().selectedWorkspace
    if (isAuthenticated && hasWorkspace != null) {
      router.push('/(app)/inbox' as never)
    }
    return
  }

  // Check if this notification is for a different workspace
  const currentWorkspace = useWorkspaceStore.getState().selectedWorkspace
  if (data.workspaceId != null && currentWorkspace != null && data.workspaceId !== currentWorkspace) {
    // Different workspace -- we can't navigate there yet.
    // The user would need to switch workspaces first.
    // For now, just open inbox in the current workspace.
    console.warn('Notification is for a different workspace:', data.workspaceId)
    router.push('/(app)/inbox' as never)
    return
  }

  navigateToNotification(data.objectClass, data.objectId)
}

/**
 * Navigate to the screen matching the notification's objectClass/objectId.
 */
function navigateToNotification(
  objectClass: string | undefined,
  objectId: string | undefined
): void {
  // Check auth state before navigating
  const isAuthenticated = useAuthStore.getState().isAuthenticated
  const hasWorkspace = useWorkspaceStore.getState().selectedWorkspace

  if (!isAuthenticated || hasWorkspace == null) {
    // Not authenticated -- auth guard will handle
    return
  }

  if (objectClass == null || objectId == null) {
    router.push('/(app)/inbox' as never)
    return
  }

  const route = resolveNotificationRoute(objectClass, objectId)
  router.push(route.path as never)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map push notification type to preference category.
 */
function mapTypeToCategory(type: string): 'chat' | 'tracker' | 'inbox' | null {
  switch (type) {
    case 'message':
    case 'mention':
      return 'chat'
    case 'issue':
      return 'tracker'
    case 'inbox':
      return 'inbox'
    default:
      return null
  }
}

/**
 * Map push notification type to its per-category sub-type key so that
 * per-type toggles (mentions, replies, etc.) can suppress foreground banners.
 *
 * Returns null when the incoming type does not map to a known sub-type; the
 * category-level check still applies in that case.
 */
function mapTypeToSubType(type: string): string | null {
  switch (type) {
    case 'mention':
      return 'mentions'
    case 'message':
      return 'messages'
    case 'issue':
      return 'assigned'
    case 'inbox':
      return 'activity'
    default:
      return null
  }
}
