import '../../global.css'

import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/client/queryClient'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { useConnectionStore } from '@/store/connection'
import { useSettingsStore } from '@/store/settings'

// Prevent the splash screen from auto-hiding before assets are loaded.
SplashScreen.preventAutoHideAsync()

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
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
            <StatusBar style="light" />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
