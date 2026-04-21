/**
 * Push notification Zustand store.
 *
 * Stores the Expo Push Token, permission status, registration state,
 * and per-category + per-type notification preferences.
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

/**
 * Per-type notification sub-preferences. Each category has child types the
 * user can toggle independently once the parent category is on.
 */
export interface NotificationTypePreferences {
  chat: {
    mentions: boolean
    replies: boolean
    reactions: boolean
    messages: boolean
  }
  tracker: {
    assigned: boolean
    statusChanged: boolean
    commented: boolean
  }
  inbox: {
    activity: boolean
    system: boolean
  }
}

/**
 * Union of every per-type key, prefixed by category. Used by the push
 * listener to decide whether to show a foreground banner.
 */
export type NotificationTypeKey =
  | 'chat.mentions'
  | 'chat.replies'
  | 'chat.reactions'
  | 'chat.messages'
  | 'tracker.assigned'
  | 'tracker.statusChanged'
  | 'tracker.commented'
  | 'inbox.activity'
  | 'inbox.system'

interface PushState {
  /** The Expo Push Token for this device. Null if not yet acquired. */
  expoPushToken: string | null
  /** Current OS permission status. */
  permissionStatus: PermissionStatus
  /** Whether the token has been registered with the backend for the current workspace. */
  isRegistered: boolean
  /** Per-category notification preferences. */
  preferences: NotificationPreferences
  /** Per-type (sub-category) notification preferences. */
  typePreferences: NotificationTypePreferences
  /**
   * Backup of per-type preferences captured the last time a parent category
   * was disabled. Used to restore prior state when the parent is re-enabled.
   */
  typePreferencesBackup: Partial<NotificationTypePreferences>

  setExpoPushToken: (token: string | null) => void
  setPermissionStatus: (status: PermissionStatus) => void
  setIsRegistered: (registered: boolean) => void
  togglePreference: (category: NotificationCategory) => Promise<void>
  setPreference: (category: NotificationCategory, enabled: boolean) => Promise<void>
  toggleTypePreference: (
    category: NotificationCategory,
    type: string
  ) => Promise<void>
  setTypePreference: (
    category: NotificationCategory,
    type: string,
    enabled: boolean
  ) => Promise<void>
  restorePreferences: () => Promise<void>
  reset: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFS_STORAGE_KEY = 'push_notification_preferences'
const TYPE_PREFS_STORAGE_KEY = 'push_notification_type_preferences'
const TYPE_BACKUP_STORAGE_KEY = 'push_notification_type_backup'

const DEFAULT_PREFERENCES: NotificationPreferences = {
  chat: true,
  tracker: true,
  inbox: true,
}

const DEFAULT_TYPE_PREFERENCES: NotificationTypePreferences = {
  chat: {
    mentions: true,
    replies: true,
    reactions: true,
    messages: true,
  },
  tracker: {
    assigned: true,
    statusChanged: true,
    commented: true,
  },
  inbox: {
    activity: true,
    system: true,
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function persistPreferences(prefs: NotificationPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
}

async function persistTypePreferences(
  prefs: NotificationTypePreferences
): Promise<void> {
  await AsyncStorage.setItem(TYPE_PREFS_STORAGE_KEY, JSON.stringify(prefs))
}

async function persistTypeBackup(
  backup: Partial<NotificationTypePreferences>
): Promise<void> {
  await AsyncStorage.setItem(TYPE_BACKUP_STORAGE_KEY, JSON.stringify(backup))
}

function mergeTypePreferences(
  stored: unknown
): NotificationTypePreferences {
  const result: NotificationTypePreferences = {
    chat: { ...DEFAULT_TYPE_PREFERENCES.chat },
    tracker: { ...DEFAULT_TYPE_PREFERENCES.tracker },
    inbox: { ...DEFAULT_TYPE_PREFERENCES.inbox },
  }
  if (typeof stored !== 'object' || stored === null) return result

  const record = stored as Record<string, unknown>
  for (const category of ['chat', 'tracker', 'inbox'] as const) {
    const categoryValue = record[category]
    if (typeof categoryValue === 'object' && categoryValue !== null) {
      const catRecord = categoryValue as Record<string, unknown>
      const defaults = DEFAULT_TYPE_PREFERENCES[category] as Record<string, boolean>
      const merged: Record<string, boolean> = { ...defaults }
      for (const key of Object.keys(defaults)) {
        const val = catRecord[key]
        if (typeof val === 'boolean') merged[key] = val
      }
      ;(result as Record<string, unknown>)[category] = merged
    }
  }
  return result
}

// Keep exports stable so other modules can consume the defaults.
export {
  DEFAULT_PREFERENCES,
  DEFAULT_TYPE_PREFERENCES,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePushStore = create<PushState>((set, get) => ({
  expoPushToken: null,
  permissionStatus: 'undetermined',
  isRegistered: false,
  preferences: { ...DEFAULT_PREFERENCES },
  typePreferences: {
    chat: { ...DEFAULT_TYPE_PREFERENCES.chat },
    tracker: { ...DEFAULT_TYPE_PREFERENCES.tracker },
    inbox: { ...DEFAULT_TYPE_PREFERENCES.inbox },
  },
  typePreferencesBackup: {},

  setExpoPushToken: (token) => set({ expoPushToken: token }),

  setPermissionStatus: (status) => set({ permissionStatus: status }),

  setIsRegistered: (registered) => set({ isRegistered: registered }),

  togglePreference: async (category) => {
    const current = get().preferences
    const next = !current[category]
    await get().setPreference(category, next)
  },

  setPreference: async (category, enabled) => {
    const state = get()
    const currentPrefs = state.preferences
    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      [category]: enabled,
    }

    const currentTypes = state.typePreferences
    const currentBackup = state.typePreferencesBackup
    let updatedTypes = currentTypes
    let updatedBackup: Partial<NotificationTypePreferences> = currentBackup

    if (!enabled) {
      // Disabling the parent: snapshot current child state, then set all to false.
      updatedBackup = {
        ...currentBackup,
        [category]: { ...(currentTypes[category] as Record<string, boolean>) },
      }
      const disabledChildren: Record<string, boolean> = {}
      for (const key of Object.keys(currentTypes[category])) {
        disabledChildren[key] = false
      }
      updatedTypes = {
        ...currentTypes,
        [category]: disabledChildren,
      } as NotificationTypePreferences
    } else {
      // Re-enabling the parent: restore prior child state if present,
      // otherwise reset to defaults so the user does not receive zero child toggles.
      const backupCategory = currentBackup[category]
      const restored = backupCategory !== undefined
        ? backupCategory
        : DEFAULT_TYPE_PREFERENCES[category]
      updatedTypes = {
        ...currentTypes,
        [category]: { ...(restored as Record<string, boolean>) },
      } as NotificationTypePreferences
      // Clear this category's backup once it is restored.
      const nextBackup = { ...currentBackup }
      delete nextBackup[category]
      updatedBackup = nextBackup
    }

    set({
      preferences: updatedPrefs,
      typePreferences: updatedTypes,
      typePreferencesBackup: updatedBackup,
    })
    await Promise.all([
      persistPreferences(updatedPrefs),
      persistTypePreferences(updatedTypes),
      persistTypeBackup(updatedBackup),
    ])
  },

  toggleTypePreference: async (category, type) => {
    const current = get().typePreferences[category] as Record<string, boolean>
    const currentValue = current[type]
    if (typeof currentValue !== 'boolean') return
    await get().setTypePreference(category, type, !currentValue)
  },

  setTypePreference: async (category, type, enabled) => {
    const state = get()
    // Enforce parent-child invariant: cannot enable a child if the parent category is off.
    if (enabled && !state.preferences[category]) return

    const categoryTypes = state.typePreferences[category] as Record<string, boolean>
    if (!(type in categoryTypes)) return

    const updatedCategoryTypes: Record<string, boolean> = {
      ...categoryTypes,
      [type]: enabled,
    }
    const updatedTypes: NotificationTypePreferences = {
      ...state.typePreferences,
      [category]: updatedCategoryTypes,
    } as NotificationTypePreferences

    set({ typePreferences: updatedTypes })
    await persistTypePreferences(updatedTypes)
  },

  restorePreferences: async () => {
    try {
      const [storedPrefs, storedTypes, storedBackup] = await Promise.all([
        AsyncStorage.getItem(PREFS_STORAGE_KEY),
        AsyncStorage.getItem(TYPE_PREFS_STORAGE_KEY),
        AsyncStorage.getItem(TYPE_BACKUP_STORAGE_KEY),
      ])

      if (storedPrefs != null) {
        const parsed: unknown = JSON.parse(storedPrefs)
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

      if (storedTypes != null) {
        const parsed: unknown = JSON.parse(storedTypes)
        set({ typePreferences: mergeTypePreferences(parsed) })
      }

      if (storedBackup != null) {
        const parsed: unknown = JSON.parse(storedBackup)
        if (typeof parsed === 'object' && parsed !== null) {
          set({ typePreferencesBackup: parsed as Partial<NotificationTypePreferences> })
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
      typePreferences: {
        chat: { ...DEFAULT_TYPE_PREFERENCES.chat },
        tracker: { ...DEFAULT_TYPE_PREFERENCES.tracker },
        inbox: { ...DEFAULT_TYPE_PREFERENCES.inbox },
      },
      typePreferencesBackup: {},
    })
  },
}))
