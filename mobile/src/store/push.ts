/**
 * Push notification Zustand store.
 *
 * Stores the Expo Push Token, permission status, registration state,
 * and per-category notification preferences.
 *
 * Preferences are persisted to AsyncStorage (non-sensitive preference data).
 * The push token itself is ephemeral -- re-acquired on each app launch.
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import type { NotificationCategory } from '@/lib/notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PermissionStatus = 'undetermined' | 'granted' | 'denied'

export interface NotificationPreferences {
  chat: boolean
  tracker: boolean
  inbox: boolean
}

interface PushState {
  /** The Expo Push Token for this device. Null if not yet acquired. */
  expoPushToken: string | null
  /** Current OS permission status. */
  permissionStatus: PermissionStatus
  /** Whether the token has been registered with the backend for the current workspace. */
  isRegistered: boolean
  /** Per-category notification preferences. */
  preferences: NotificationPreferences

  setExpoPushToken: (token: string | null) => void
  setPermissionStatus: (status: PermissionStatus) => void
  setIsRegistered: (registered: boolean) => void
  togglePreference: (category: NotificationCategory) => Promise<void>
  setPreference: (category: NotificationCategory, enabled: boolean) => Promise<void>
  restorePreferences: () => Promise<void>
  reset: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFS_STORAGE_KEY = 'push_notification_preferences'

const DEFAULT_PREFERENCES: NotificationPreferences = {
  chat: true,
  tracker: true,
  inbox: true,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function persistPreferences(prefs: NotificationPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePushStore = create<PushState>((set, get) => ({
  expoPushToken: null,
  permissionStatus: 'undetermined',
  isRegistered: false,
  preferences: { ...DEFAULT_PREFERENCES },

  setExpoPushToken: (token) => set({ expoPushToken: token }),

  setPermissionStatus: (status) => set({ permissionStatus: status }),

  setIsRegistered: (registered) => set({ isRegistered: registered }),

  togglePreference: async (category) => {
    const current = get().preferences
    const updated: NotificationPreferences = {
      ...current,
      [category]: !current[category],
    }
    set({ preferences: updated })
    await persistPreferences(updated)
  },

  setPreference: async (category, enabled) => {
    const current = get().preferences
    const updated: NotificationPreferences = {
      ...current,
      [category]: enabled,
    }
    set({ preferences: updated })
    await persistPreferences(updated)
  },

  restorePreferences: async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_STORAGE_KEY)
      if (stored != null) {
        const parsed: unknown = JSON.parse(stored)
        if (typeof parsed === 'object' && parsed !== null) {
          const record = parsed as Record<string, unknown>
          set({
            preferences: {
              chat: typeof record.chat === 'boolean' ? record.chat : true,
              tracker: typeof record.tracker === 'boolean' ? record.tracker : true,
              inbox: typeof record.inbox === 'boolean' ? record.inbox : true,
            },
          })
        }
      }
    } catch {
      // AsyncStorage read failure -- keep defaults
    }
  },

  reset: () => {
    set({
      expoPushToken: null,
      permissionStatus: 'undetermined',
      isRegistered: false,
      preferences: { ...DEFAULT_PREFERENCES },
    })
  },
}))
