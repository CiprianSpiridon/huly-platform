/**
 * Settings main screen.
 *
 * Sections:
 * - Profile header (avatar, name, email)
 * - Workspace (name, switch row)
 * - Appearance (theme segmented control: Dark / Light / System)
 * - Account (logout with confirmation)
 * - App info footer (version)
 */

import { useCallback } from 'react'
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, type Href } from 'expo-router'

import { useProfile } from '@/hooks/useProfile'
import { useWorkspaceInfo } from '@/hooks/useWorkspaces'
import { useLogout } from '@/hooks/use-auth'
import { useSettingsStore, type ThemePreference } from '@/store/settings'
import { ProfileHeader } from '@/components/features/ProfileHeader'
import { SettingsRow } from '@/components/features/SettingsRow'

// ---------------------------------------------------------------------------
// Theme segmented control
// ---------------------------------------------------------------------------

const THEME_OPTIONS: Array<{ label: string; value: ThemePreference }> = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'System', value: 'system' },
]

function ThemeSegmentedControl({
  selected,
  onSelect,
}: {
  selected: ThemePreference
  onSelect: (theme: ThemePreference) => void
}): React.ReactNode {
  return (
    <View
      className="flex-row bg-surface-tertiary rounded-lg p-1 mx-4"
      accessibilityRole="radiogroup"
      accessibilityLabel="Theme preference"
    >
      {THEME_OPTIONS.map((option) => {
        const isActive = selected === option.value
        return (
          <Pressable
            key={option.value}
            className={`flex-1 items-center justify-center py-2 rounded-md ${
              isActive ? 'bg-surface-secondary' : ''
            }`}
            onPress={() => onSelect(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${option.label} theme`}
          >
            <Text
              className={`font-sans-medium text-sm ${
                isActive ? 'text-content-primary' : 'text-content-tertiary'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }): React.ReactNode {
  return (
    <Text className="text-xs font-sans-semibold text-content-tertiary uppercase tracking-wide px-4 pt-6 pb-2">
      {title}
    </Text>
  )
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

function Divider(): React.ReactNode {
  return <View className="h-px bg-border-primary mx-4" />
}

// ---------------------------------------------------------------------------
// Settings screen
// ---------------------------------------------------------------------------

export default function SettingsScreen(): React.ReactNode {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: workspace, isLoading: workspaceLoading } = useWorkspaceInfo()
  const logout = useLogout()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const appVersion = useSettingsStore((s) => s.appVersion)

  const handleThemeChange = useCallback(
    (newTheme: ThemePreference) => {
      void setTheme(newTheme)
    },
    [setTheme],
  )

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Huly?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => void logout(),
        },
      ],
    )
  }, [logout])

  const handleSwitchWorkspace = useCallback(() => {
    router.push('/(app)/settings/workspaces' as Href)
  }, [])

  const handleNotifications = useCallback(() => {
    router.push('/(app)/settings/notifications' as Href)
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile header */}
        {profileLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="small" color="#205DC2" />
          </View>
        ) : profile != null ? (
          <ProfileHeader
            firstName={profile.firstName}
            lastName={profile.lastName}
            email={profile.email}
          />
        ) : (
          <View className="items-center py-6">
            <Text className="font-sans text-sm text-content-tertiary">
              Unable to load profile
            </Text>
          </View>
        )}

        <Divider />

        {/* Workspace section */}
        <SectionHeader title="Workspace" />
        {workspaceLoading ? (
          <View className="px-4 py-3">
            <ActivityIndicator size="small" color="#205DC2" />
          </View>
        ) : workspace != null ? (
          <>
            <SettingsRow label="Name" value={workspace.name} />
            <SettingsRow label="Members" value={String(workspace.memberCount)} />
          </>
        ) : null}
        <SettingsRow
          label="Switch Workspace"
          onPress={handleSwitchWorkspace}
          showChevron
          accessibilityLabel="Switch to a different workspace"
        />

        <Divider />

        {/* Notifications section */}
        <SectionHeader title="Notifications" />
        <SettingsRow
          label="Notification Preferences"
          onPress={handleNotifications}
          showChevron
          accessibilityLabel="Configure notification preferences"
        />

        <Divider />

        {/* Appearance section */}
        <SectionHeader title="Appearance" />
        <ThemeSegmentedControl selected={theme} onSelect={handleThemeChange} />

        <Divider />

        {/* Account section */}
        <SectionHeader title="Account" />
        <SettingsRow
          label="Sign Out"
          onPress={handleLogout}
          destructive
          accessibilityLabel="Sign out of Huly"
        />

        {/* App info footer */}
        <View className="items-center mt-8">
          <Text className="font-sans text-xs text-content-tertiary">
            Huly v{appVersion}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
