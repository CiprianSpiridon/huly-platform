import '../../global.css'

import { useEffect, useState } from 'react'
import { View, Text, Pressable, Linking } from 'react-native'
import { useFonts } from 'expo-font'
import { Stack, router } from 'expo-router'
import type { Href } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/client/queryClient'
import { initI18n } from '@/lib/i18n'
import { initSentry } from '@/lib/sentry'
import {
  installOfflineQueueWatcher,
  replayQueue,
} from '@/lib/offline-queue'
import { useOfflineStore } from '@/store/offline'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { useConnectionStore } from '@/store/connection'
import { useSettingsStore } from '@/store/settings'
import { useNotificationListeners } from '@/hooks/useNotificationListeners'
import { InAppNotificationBanner } from '@/components/features/InAppNotificationBanner'
import { ErrorBoundary } from '@/components/features/ErrorBoundary'
import { ErrorToast } from '@/components/ui/ErrorToast'
import { resolveNotificationRoute } from '@/lib/notificationRouter'

// Prevent the splash screen from auto-hiding before assets are loaded.
SplashScreen.preventAutoHideAsync()

// Initialize i18n synchronously so useTranslation() works from first render.
// English resources are bundled; additional locales load lazily via loadLocale().
initI18n()

// Initialize Sentry once, as early as possible. No-op in __DEV__ or when DSN unset.
initSentry()

// Install NetInfo watcher for the offline mutation queue; idempotent.
installOfflineQueueWatcher()

export default function RootLayout(): React.ReactNode {
  const [isRestoring, setIsRestoring] = useState(true)
  const restoreAuth = useAuthStore((s) => s.restoreAuth)
  const restoreWorkspace = useWorkspaceStore((s) => s.restoreWorkspace)

  const [fontsLoaded] = useFonts({
    'IBMPlexSans-Regular': require('../../assets/fonts/IBMPlexSans-Regular.ttf'),
    'IBMPlexSans-Medium': require('../../assets/fonts/IBMPlexSans-Medium.ttf'),
    'IBMPlexSans-SemiBold': require('../../assets/fonts/IBMPlexSans-SemiBold.ttf'),
    'IBMPlexSans-Bold': require('../../assets/fonts/IBMPlexSans-Bold.ttf'),
  })

  const connect = useConnectionStore((s) => s.connect)

  const restoreSettings = useSettingsStore((s) => s.restoreSettings)

  useEffect(() => {
    async function restore(): Promise<void> {
      try {
        await restoreAuth()
        await restoreWorkspace()
        await restoreSettings()

        // If both auth and workspace restored, connect the data layer
        const { token } = useAuthStore.getState()
        const { workspaceEndpoint, selectedWorkspace, workspaceToken } =
          useWorkspaceStore.getState()
        if (token != null && workspaceEndpoint != null && selectedWorkspace != null && workspaceToken != null) {
          try {
            await connect(workspaceEndpoint, selectedWorkspace, workspaceToken)
          } catch {
            // Connection failed — clear workspace so user re-selects
            // (auth stays valid, but workspace connection is broken)
            await useWorkspaceStore.getState().clearWorkspace()
          }
        }
      } catch {
        // Token expired or invalid -- user will be redirected to login
      } finally {
        setIsRestoring(false)
      }
    }
    void restore()
  }, [restoreAuth, restoreWorkspace, restoreSettings, connect])

  useEffect(() => {
    if (fontsLoaded && !isRestoring) {
      void SplashScreen.hideAsync()
    }
  }, [fontsLoaded, isRestoring])

  // Keep splash visible until fonts AND session restore both complete
  if (!fontsLoaded || isRestoring) {
    return null
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView className="flex-1">
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <RootLayoutContent />
              <StatusBar style="light" />
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  )
}

/**
 * Convert an incoming universal link URL (https://huly.io/...) into an
 * in-app route using the same resolver the notification deep-link flow
 * uses. Unknown paths fall back to the default inbox tab.
 */
function resolveUniversalLink(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    // Only act on our known hosts; foreign domains fall back to inbox.
    const host = parsed.hostname.toLowerCase()
    if (host !== 'huly.io' && host !== 'app.huly.io' && host !== 'www.huly.io') {
      return '/(app)/inbox'
    }

    const segments = parsed.pathname.split('/').filter((s) => s.length > 0)
    // Supported shapes:
    //   /tracker/issue/<id>        -> tracker issue
    //   /tracker/<id>              -> tracker issue (shorthand)
    //   /chat/channel/<id>         -> channel
    //   /chat/direct/<id>          -> direct message
    //   /inbox                     -> inbox tab
    //   /inbox/notification/<id>   -> inbox notification detail
    //   /settings                  -> settings
    if (segments.length === 0) return '/(app)'

    const [section, ...rest] = segments
    switch (section) {
      case 'tracker': {
        const issueId = rest.length === 2 && rest[0] === 'issue' ? rest[1]
          : rest.length === 1 ? rest[0]
          : null
        if (issueId == null) return '/(app)/tracker'
        const { path } = resolveNotificationRoute('tracker:class:Issue', issueId)
        return path
      }
      case 'chat': {
        const [kind, id] = rest
        if (id == null) return '/(app)/chat'
        if (kind === 'channel') {
          return resolveNotificationRoute('chunter:class:Channel', id).path
        }
        if (kind === 'direct' || kind === 'dm') {
          return resolveNotificationRoute('chunter:class:DirectMessage', id).path
        }
        return '/(app)/chat'
      }
      case 'inbox': {
        if (rest.length === 2 && rest[0] === 'notification') {
          return `/(app)/inbox/notification/${rest[1]}`
        }
        return '/(app)/inbox'
      }
      case 'settings':
        return '/(app)/settings'
      default:
        return '/(app)/inbox'
    }
  } catch {
    return '/(app)/inbox'
  }
}

function handleIncomingUrl(url: string | null | undefined): void {
  if (url == null || url.length === 0) return
  // Pass through huly:// custom scheme links unchanged; expo-router has them.
  if (url.startsWith('huly://')) return
  const dest = resolveUniversalLink(url)
  try {
    router.push(dest as Href)
  } catch {
    // If navigation fails (route not yet registered), land on the default tab.
    router.push('/(app)' as Href)
  }
}

/**
 * Inner layout content. Separated so notification listeners can
 * access QueryClientProvider via useQueryClient().
 */
function RootLayoutContent(): React.ReactNode {
  const { bannerNotification, dismissBanner, handleBannerPress } =
    useNotificationListeners()

  useEffect(() => {
    // Cold-start URL (universal link tapped while app was killed).
    void Linking.getInitialURL().then((url) => handleIncomingUrl(url))
    const sub = Linking.addEventListener('url', (event) => handleIncomingUrl(event.url))
    return () => sub.remove()
  }, [])

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <InAppNotificationBanner
        notification={bannerNotification}
        onPress={handleBannerPress}
        onDismiss={dismissBanner}
      />
      <OfflineQueueBanner />
      <ErrorToast />
    </>
  )
}

/**
 * Small banner that surfaces the pending offline mutation queue count
 * at the bottom of the screen. Tapping retries replay; only mounted when
 * there's at least one pending change or unresolved conflict.
 */
function OfflineQueueBanner(): React.ReactNode {
  const insets = useSafeAreaInsets()
  const queueLength = useOfflineStore((s) => s.queue.length)
  const conflictCount = useOfflineStore((s) => s.conflicts.length)
  const replaying = useOfflineStore((s) => s.replaying)

  if (queueLength === 0 && conflictCount === 0) return null

  const parts: string[] = []
  if (queueLength > 0) {
    parts.push(`${queueLength} pending change${queueLength === 1 ? '' : 's'}`)
  }
  if (conflictCount > 0) {
    parts.push(`${conflictCount} need${conflictCount === 1 ? 's' : ''} attention`)
  }

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12, zIndex: 9998 }}
    >
      <Pressable
        onPress={() => void replayQueue()}
        accessibilityRole="button"
        accessibilityLabel={parts.join(', ')}
        accessibilityHint="Tap to retry syncing"
        className="bg-surface-panel border-l-4 border-status-warning rounded-md px-3 py-2.5 shadow-md"
      >
        <Text className="font-sans-medium text-sm text-content-primary">
          {parts.join(' · ')}
        </Text>
        <Text className="font-sans text-xs text-content-tertiary mt-0.5">
          {replaying ? 'Syncing…' : 'Tap to retry'}
        </Text>
      </Pressable>
    </View>
  )
}
