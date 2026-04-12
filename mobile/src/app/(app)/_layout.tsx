import { Redirect, Stack } from 'expo-router'

import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'

export default function AppLayout(): React.ReactNode {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasWorkspace = useWorkspaceStore((s) => s.selectedWorkspace)

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  if (hasWorkspace === null) {
    return <Redirect href="/(auth)/workspace-select" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  )
}
