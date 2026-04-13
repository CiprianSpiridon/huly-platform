/**
 * About screen.
 *
 * Displays app version, build info, legal links, and a "Clear Cache"
 * action that clears TanStack Query cache without logging out.
 */

import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'

import { useSettingsStore } from '@/store/settings'
import { SettingsRow } from '@/components/features/SettingsRow'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEGAL_LINKS = {
  website: 'https://huly.io',
  privacy: 'https://huly.io/privacy',
  terms: 'https://huly.io/terms',
  github: 'https://github.com/hcengineering/platform',
} as const

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AboutScreen(): React.ReactNode {
  const appVersion = useSettingsStore((s) => s.appVersion)
  const queryClient = useQueryClient()
  const [isClearing, setIsClearing] = useState(false)

  const openLink = useCallback((url: string) => {
    void Linking.openURL(url)
  }, [])

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache',
      'This will clear locally cached data. You will NOT be signed out. Data will be re-fetched from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true)
            try {
              queryClient.clear()
            } finally {
              setIsClearing(false)
              Alert.alert('Done', 'Cache cleared successfully.')
            }
          },
        },
      ]
    )
  }, [queryClient])

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <Stack.Screen options={{ title: 'About' }} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 48 }}>
        {/* App logo and version */}
        <View className="items-center py-8">
          <View
            className="items-center justify-center bg-accent-primary rounded-2xl mb-4"
            style={{ width: 72, height: 72 }}
            accessibilityLabel="Huly app icon"
          >
            <Text className="font-sans-bold text-3xl text-on-accent">H</Text>
          </View>
          <Text className="font-sans-bold text-xl text-content-primary">
            Huly
          </Text>
          <Text className="font-sans text-sm text-content-secondary mt-1">
            Version {appVersion}
          </Text>
        </View>

        <View className="h-px bg-border-primary mx-4" />

        {/* Links section */}
        <Text className="text-xs font-sans-semibold text-content-tertiary uppercase tracking-wide px-4 pt-6 pb-2">
          Links
        </Text>
        <SettingsRow
          label="Website"
          value="huly.io"
          onPress={() => openLink(LEGAL_LINKS.website)}
          showChevron
          accessibilityLabel="Open Huly website"
        />
        <SettingsRow
          label="GitHub"
          value="Open Source"
          onPress={() => openLink(LEGAL_LINKS.github)}
          showChevron
          accessibilityLabel="Open Huly GitHub repository"
        />

        <View className="h-px bg-border-primary mx-4" />

        {/* Legal section */}
        <Text className="text-xs font-sans-semibold text-content-tertiary uppercase tracking-wide px-4 pt-6 pb-2">
          Legal
        </Text>
        <SettingsRow
          label="Privacy Policy"
          onPress={() => openLink(LEGAL_LINKS.privacy)}
          showChevron
          accessibilityLabel="Open privacy policy"
        />
        <SettingsRow
          label="Terms of Service"
          onPress={() => openLink(LEGAL_LINKS.terms)}
          showChevron
          accessibilityLabel="Open terms of service"
        />

        <View className="h-px bg-border-primary mx-4" />

        {/* Data section */}
        <Text className="text-xs font-sans-semibold text-content-tertiary uppercase tracking-wide px-4 pt-6 pb-2">
          Data
        </Text>
        {isClearing ? (
          <View className="px-4 py-3 min-h-[44px] items-center justify-center">
            <ActivityIndicator size="small" color="#205DC2" />
          </View>
        ) : (
          <SettingsRow
            label="Clear Cache"
            onPress={handleClearCache}
            accessibilityLabel="Clear locally cached data"
          />
        )}
        <Text className="font-sans text-xs text-content-tertiary px-4 mt-1">
          Clears cached data without signing out. Data will be re-fetched from the server.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
