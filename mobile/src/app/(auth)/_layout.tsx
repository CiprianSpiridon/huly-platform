import { Redirect, Stack } from 'expo-router'

import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'

export default function AuthLayout(): React.ReactNode {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasWorkspace = useWorkspaceStore((s) => s.selectedWorkspace)

  // Already authenticated with a workspace -- redirect to the app
  if (isAuthenticated && hasWorkspace !== null) {
    return <Redirect href="/(app)" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
