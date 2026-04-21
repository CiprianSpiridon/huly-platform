import '../../global.css'

import { useEffect, useRef, useState } from 'react'
import { AppState, View, Text, Pressable, Linking } from 'react-native'
import type { AppStateStatus } from 'react-native'
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
 * Hosts we accept universal-link traffic from. Kept in sync with
 * `ios.associatedDomains` and `android.intentFilters[].data[].host` in
 * `mobile/app.json`. If a new host is added there it MUST be added here
 * or incoming links will fall through to the default inbox tab.
 */
const ALLOWED_UNIVERSAL_LINK_HOSTS = new Set<string>([
  'huly.app',
  'www.huly.app',
])

/**
 * Convert an incoming universal link URL (https://huly.app/...) into an
 * in-app route using the same resolver the notification deep-link flow
 * uses. Unknown paths fall back to the default inbox tab.
 *
 * Special-cases `/login/recovery` and `/login/auth` up-front so the
 * server-emitted password-reset and OAuth redirect URLs land on their
 * dedicated capture screens instead of being treated as tab segments.
 */
function resolveUniversalLink(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl)
    const host = parsed.hostname.toLowerCase()

    // Reject foreign origins outright rather than routing to a default tab.
    // A link pointing at huly.io (not in our associatedDomains) should not
    // silently deep-link into a signed-in session on a different product.
    if (!ALLOWED_UNIVERSAL_LINK_HOSTS.has(host)) {
      return null
    }

    const rawPath = parsed.pathname.toLowerCase()
    const segments = parsed.pathname.split('/').filter((s) => s.length > 0)

    // Auth capture routes — must be handled before the tab switch because
    // `login/recovery?id=...` and `login/auth?token=...` carry query params
    // that must be preserved.
    if (rawPath === '/login/recovery' || rawPath.startsWith('/login/recovery/')) {
      const id = parsed.searchParams.get('id')
      if (id != null && id.length > 0) {
        return `/login/recovery?id=${encodeURIComponent(id)}`
      }
      return '/login/recovery'
    }
    if (rawPath === '/login/auth' || rawPath.startsWith('/login/auth/')) {
      const token = parsed.searchParams.get('token')
      if (token != null && token.length > 0) {
        return `/login/auth?token=${encodeURIComponent(token)}`
      }
      return '/login/auth'
    }

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
  // Host not in our allowlist — ignore the link silently.
  if (dest == null) return
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

  // ---------------------------------------------------------------------
  // Biometric re-lock on app resume.
  //
  // When the app comes back to the foreground from `background`, re-arm
  // the biometric lock so the user must authenticate again before the
  // protected UI is revealed. A short cooldown (BIOMETRIC_RELOCK_COOLDOWN_MS)
  // suppresses re-prompts after a brief switch so a quick trip to
  // Settings (or the OS password-manager sheet) does not turn into a
  // chain of Face ID prompts.
  // ---------------------------------------------------------------------
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    const BIOMETRIC_RELOCK_COOLDOWN_MS = 30_000

    const onChange = (next: AppStateStatus): void => {
      const prev = appStateRef.current
      appStateRef.current = next

      const becameActive = next === 'active' && prev === 'background'
      if (!becameActive) return

      const authState = useAuthStore.getState()
      if (!authState.isAuthenticated) return
      if (!authState.biometricEnabled) return
      if (authState.biometricLocked) return

      const lastUnlock = authState.lastBiometricUnlockAt ?? 0
      if (Date.now() - lastUnlock < BIOMETRIC_RELOCK_COOLDOWN_MS) return

      authState.setBiometricLocked(true)
    }

    const sub = AppState.addEventListener('change', onChange)
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
