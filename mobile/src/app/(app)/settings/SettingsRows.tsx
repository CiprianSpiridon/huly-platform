/**
 * SettingsRows -- pure composition registry for the settings screen.
 *
 * Each per-feature row lives in its own file under `rows/` and is imported
 * here in display order. Later tasks add a row by creating a new file in
 * `rows/` and importing it here; they do not edit `settings/index.tsx`.
 *
 * Invariants:
 * - Renders in the same visual order as the pre-registry baseline.
 * - Owns no data fetching, no navigation, no side effects of its own.
 * - Section headers and dividers remain here to preserve layout chrome.
 *
 * Row insertion order (append-only, TASK-000 baseline is empty):
 *   - NameRow          (TASK-001)
 *   - PasswordRow      (TASK-005)
 *   - TwoFactorRow     (TASK-006)
 *   - LanguageRow      (TASK-007)
 *   - DeleteAccountRow (TASK-008)
 */

import { useCallback } from 'react'
import { View, Text, Alert, ActivityIndicator, Pressable } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, type Href } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { useProfile } from '@/hooks/useProfile'
import { useWorkspaceInfo } from '@/hooks/useWorkspaces'
import { useLogout } from '@/hooks/use-auth'
import { useImagePicker } from '@/hooks/useImagePicker'
import { useSettingsStore, type ThemePreference } from '@/store/settings'
import { ProfileHeader } from '@/components/features/ProfileHeader'
import { SettingsRow } from '@/components/features/SettingsRow'
import { updateAvatar } from '@/repositories/settings'

// ---------------------------------------------------------------------------
// Registry imports (append-only -- later tasks add new imports here)
// ---------------------------------------------------------------------------
// <registry:imports>
import { NameRow } from './rows/NameRow'
import { PasswordRow } from './rows/PasswordRow'
import { TwoFactorRow } from './rows/TwoFactorRow'
import { LanguageRow } from './rows/LanguageRow'
import { DeleteAccountRow } from './rows/DeleteAccountRow'
// </registry:imports>

// ---------------------------------------------------------------------------
// Theme segmented control
// ---------------------------------------------------------------------------

const THEME_OPTIONS: Array<{ labelKey: string; value: ThemePreference }> = [
  { labelKey: 'settings.appearance.dark', value: 'dark' },
  { labelKey: 'settings.appearance.light', value: 'light' },
  { labelKey: 'settings.appearance.system', value: 'system' },
]

function ThemeSegmentedControl({
  selected,
  onSelect,
}: {
  selected: ThemePreference
  onSelect: (theme: ThemePreference) => void
}): React.ReactNode {
  const { t } = useTranslation()
  return (
    <View
      className="flex-row bg-surface-tertiary rounded-lg p-1 mx-4"
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.appearance.accessibility')}
    >
      {THEME_OPTIONS.map((option) => {
        const isActive = selected === option.value
        const label = t(option.labelKey)
        return (
          <Pressable
            key={option.value}
            className={`flex-1 items-center justify-center py-2 rounded-md ${
              isActive ? 'bg-surface-secondary' : ''
            }`}
            onPress={() => onSelect(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t('settings.appearance.themeAccessibility', { label })}
          >
            <Text
              className={`font-sans-medium text-sm ${
                isActive ? 'text-content-primary' : 'text-content-tertiary'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function SectionHeader({ title }: { title: string }): React.ReactNode {
  return (
    <Text className="text-xs font-sans-semibold text-content-tertiary uppercase tracking-wide px-4 pt-6 pb-2">
      {title}
    </Text>
  )
}

function Divider(): React.ReactNode {
  return <View className="h-px bg-border-primary mx-4" />
}

// ---------------------------------------------------------------------------
// SettingsRows
// ---------------------------------------------------------------------------

export function SettingsRows(): React.ReactNode {
  const { t } = useTranslation()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: workspace, isLoading: workspaceLoading } = useWorkspaceInfo()
  const logout = useLogout()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const appVersion = useSettingsStore((s) => s.appVersion)
  const { pickFromGallery } = useImagePicker()
  const queryClient = useQueryClient()

  const avatarMutation = useMutation({
    mutationFn: async (picked: { uri: string; filename: string; mimeType: string }) => {
      await updateAvatar(picked.uri, picked.filename, picked.mimeType)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Avatar upload failed'
      Alert.alert('Upload failed', msg, [{ text: 'OK' }])
    },
  })

  const handleEditAvatar = useCallback(async () => {
    const picked = await pickFromGallery()
    if (picked == null) return
    avatarMutation.mutate({
      uri: picked.uri,
      filename: picked.filename,
      mimeType: picked.mimeType,
    })
  }, [pickFromGallery, avatarMutation])

  const handleThemeChange = useCallback(
    (newTheme: ThemePreference) => {
      void setTheme(newTheme)
    },
    [setTheme],
  )

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('settings.account.confirmTitle'),
      t('settings.account.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.account.confirmAction'),
          style: 'destructive',
          onPress: () => void logout(),
        },
      ],
    )
  }, [logout, t])

  const handleSwitchWorkspace = useCallback(() => {
    router.push('/(app)/settings/workspaces' as Href)
  }, [])

  const handleNotifications = useCallback(() => {
    router.push('/(app)/settings/notifications' as Href)
  }, [])

  const handleMembers = useCallback(() => {
    router.push('/(app)/settings/members' as Href)
  }, [])

  const handleAbout = useCallback(() => {
    router.push('/(app)/settings/about' as Href)
  }, [])

  return (
    <>
      {/* Profile header */}
      {profileLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color="#205DC2" />
        </View>
      ) : profile != null ? (
        <>
          <ProfileHeader
            firstName={profile.firstName}
            lastName={profile.lastName}
            email={profile.email}
            onEditAvatar={() => { void handleEditAvatar() }}
            isUploadingAvatar={avatarMutation.isPending}
          />
          {/* <registry:profile> */}
          <NameRow profile={profile} />
          {/* </registry:profile> */}
        </>
      ) : (
        <View className="items-center py-6">
          <Text className="font-sans text-sm text-content-tertiary">
            {t('settings.profile.unableToLoad')}
          </Text>
        </View>
      )}

      <Divider />

      {/* Workspace section */}
      <SectionHeader title={t('settings.sections.workspace')} />
      {workspaceLoading ? (
        <View className="px-4 py-3">
          <ActivityIndicator size="small" color="#205DC2" />
        </View>
      ) : workspace != null ? (
        <>
          <SettingsRow label={t('settings.workspace.name')} value={workspace.name} />
          <SettingsRow
            label={t('settings.workspace.members')}
            value={String(workspace.memberCount)}
            onPress={handleMembers}
            showChevron
            accessibilityLabel={t('settings.workspace.membersAccessibility')}
          />
        </>
      ) : null}
      <SettingsRow
        label={t('settings.workspace.switch')}
        onPress={handleSwitchWorkspace}
        showChevron
        accessibilityLabel={t('settings.workspace.switchAccessibility')}
      />

      <Divider />

      {/* Notifications section */}
      <SectionHeader title={t('settings.sections.notifications')} />
      <SettingsRow
        label={t('settings.notifications.preferences')}
        onPress={handleNotifications}
        showChevron
        accessibilityLabel={t('settings.notifications.preferencesAccessibility')}
      />

      <Divider />

      {/* Appearance section */}
      <SectionHeader title={t('settings.sections.appearance')} />
      <ThemeSegmentedControl selected={theme} onSelect={handleThemeChange} />
      {/* <registry:appearance> -- TASK-007 registers LanguageRow here */}
      <LanguageRow />

      <Divider />

      {/* Security section */}
      <SectionHeader title="Security" />
      {/* <registry:security> -- TASK-005 / TASK-006 register PasswordRow + TwoFactorRow here */}
      <PasswordRow />
      <TwoFactorRow />

      <Divider />

      {/* Account section */}
      <SectionHeader title={t('settings.sections.account')} />
      <SettingsRow
        label={t('settings.account.signOut')}
        onPress={handleLogout}
        destructive
        accessibilityLabel={t('settings.account.signOutAccessibility')}
      />

      {/* About section */}
      <SectionHeader title={t('settings.sections.about')} />
      <SettingsRow
        label={t('settings.about.title')}
        onPress={handleAbout}
        showChevron
        accessibilityLabel={t('settings.about.accessibility')}
      />

      {/* <registry:danger> -- TASK-008 registers DeleteAccountRow here */}
      <Divider />
      <SectionHeader title="Danger Zone" />
      <DeleteAccountRow />

      {/* App info footer */}
      <View className="items-center mt-8">
        <Text className="font-sans text-xs text-content-tertiary">
          {t('settings.footer.version', { version: appVersion })}
        </Text>
      </View>
    </>
  )
}
