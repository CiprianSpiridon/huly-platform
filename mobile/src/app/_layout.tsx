import '../../global.css'

import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'

// Prevent the splash screen from auto-hiding before assets are loaded.
SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

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

  useEffect(() => {
    async function restore(): Promise<void> {
      try {
        await restoreAuth()
        await restoreWorkspace()
      } catch {
        // Token expired or invalid -- user will be redirected to login
      } finally {
        setIsRestoring(false)
      }
    }
    void restore()
  }, [restoreAuth, restoreWorkspace])

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
