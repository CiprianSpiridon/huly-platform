import '../../global.css'

import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/client/queryClient'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { useConnectionStore } from '@/store/connection'

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

  useEffect(() => {
    async function restore(): Promise<void> {
      try {
        await restoreAuth()
        await restoreWorkspace()

        // If both auth and workspace restored, connect the data layer
        const { token } = useAuthStore.getState()
        const { workspaceEndpoint, selectedWorkspace, workspaceToken } =
          useWorkspaceStore.getState()
        if (token != null && workspaceEndpoint != null && selectedWorkspace != null && workspaceToken != null) {
          await connect(workspaceEndpoint, selectedWorkspace, workspaceToken)
        }
      } catch {
        // Token expired or invalid -- user will be redirected to login
      } finally {
        setIsRestoring(false)
      }
    }
    void restore()
  }, [restoreAuth, restoreWorkspace, connect])

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
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
