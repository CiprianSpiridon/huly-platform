/**
 * Settings Zustand store.
 *
 * Manages app-wide settings that are NOT server data:
 * - Theme preference (dark / light / system)
 * - App version string
 *
 * Theme is persisted to AsyncStorage (non-sensitive preference data).
 * Applied to the system via Appearance.setColorScheme().
 *
 * Default: 'dark' (matches Huly's dark-first web UI).
 */

import { Appearance } from 'react-native'
import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

export type ThemePreference = 'dark' | 'light' | 'system'

const THEME_STORAGE_KEY = 'settings_theme'
const ONBOARDING_KEY = 'has_completed_onboarding'

interface SettingsState {
  theme: ThemePreference
  appVersion: string
  hasCompletedOnboarding: boolean

  setTheme: (theme: ThemePreference) => Promise<void>
  completeOnboarding: () => Promise<void>
  restoreSettings: () => Promise<void>
}

/**
 * Applies the theme preference to the native Appearance API.
 * 'system' maps to 'unspecified', letting the OS control it.
 */
function applyTheme(theme: ThemePreference): void {
  if (theme === 'system') {
    Appearance.setColorScheme('unspecified')
  } else {
    Appearance.setColorScheme(theme)
  }
}

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0'
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  appVersion: getAppVersion(),
  hasCompletedOnboarding: false,

  setTheme: async (theme: ThemePreference) => {
    applyTheme(theme)
    await AsyncStorage.setItem(THEME_STORAGE_KEY, theme)
    set({ theme })
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    set({ hasCompletedOnboarding: true })
  },

  restoreSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY)
      const theme: ThemePreference =
        stored === 'dark' || stored === 'light' || stored === 'system'
          ? stored
          : 'dark'

      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY)

      applyTheme(theme)
      set({
        theme,
        hasCompletedOnboarding: onboardingDone === 'true',
      })
    } catch {
      // AsyncStorage read failure -- keep defaults
      applyTheme('dark')
    }
  },
}))
