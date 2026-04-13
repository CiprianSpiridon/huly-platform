/**
 * Push token registration hook.
 *
 * Runs after auth + workspace are established. Acquires the Expo Push
 * Token, registers it with the Huly backend, and stores it in the
 * push Zustand store.
 *
 * Re-registers on workspace switch. Deregisters on logout.
 */

import { useEffect, useRef } from 'react'

import { registerForPushNotifications, getPermissionStatus } from '@/lib/notifications'
import { registerPushToken, deregisterPushToken } from '@/repositories/push'
import { usePushStore } from '@/store/push'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { useConnectionStore } from '@/store/connection'

/**
 * Hook that manages the push token lifecycle:
 *
 * 1. On mount (when authenticated + connected), requests permission and
 *    acquires an Expo Push Token.
 * 2. Registers the token with the Huly backend as a PushSubscription doc.
 * 3. On workspace switch, re-registers with the new workspace.
 * 4. Stores state in the push Zustand store for the preferences screen.
 *
 * Must be called inside a component that is only rendered when the user
 * is authenticated and a workspace is selected.
 */
export function usePushRegistration(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const workspaceId = useWorkspaceStore((s) => s.selectedWorkspace)
  const connectionStatus = useConnectionStore((s) => s.status)

  const setExpoPushToken = usePushStore((s) => s.setExpoPushToken)
  const setPermissionStatus = usePushStore((s) => s.setPermissionStatus)
  const setIsRegistered = usePushStore((s) => s.setIsRegistered)
  const restorePreferences = usePushStore((s) => s.restorePreferences)

  const previousTokenRef = useRef<string | null>(null)

  // Restore persisted preferences on mount
  useEffect(() => {
    void restorePreferences()
  }, [restorePreferences])

  // Register push token when connected
  useEffect(() => {
    if (!isAuthenticated || workspaceId == null || connectionStatus !== 'connected') {
      return
    }

    let cancelled = false

    async function register(): Promise<void> {
      try {
        // Check current permission status first
        const status = await getPermissionStatus()
        if (!cancelled) {
          setPermissionStatus(
            status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined'
          )
        }

        // Only proceed with token acquisition if permission is granted
        // or undetermined (we'll request on first registration)
        if (status === 'denied') {
          return
        }

        const pushToken = await registerForPushNotifications()

        if (cancelled) return

        if (pushToken != null) {
          setExpoPushToken(pushToken)
          setPermissionStatus('granted')

          try {
            await registerPushToken(pushToken)
            if (!cancelled) {
              setIsRegistered(true)
              previousTokenRef.current = pushToken
            }
          } catch (error) {
            console.error('Failed to register push token with backend:', error)
            if (!cancelled) {
              setIsRegistered(false)
            }
          }
        }
      } catch (error) {
        console.error('Push registration failed:', error)
      }
    }

    void register()

    return () => {
      cancelled = true
    }
  }, [
    isAuthenticated,
    workspaceId,
    connectionStatus,
    setExpoPushToken,
    setPermissionStatus,
    setIsRegistered,
  ])

  // Deregister previous token on workspace switch or logout
  useEffect(() => {
    return () => {
      const token = previousTokenRef.current
      if (token != null) {
        void deregisterPushToken(token).catch(() => {
          // Best-effort deregistration -- ignore errors
        })
      }
    }
  }, [workspaceId])
}
