import { Redirect, Stack } from 'expo-router'

import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'

export default function AuthLayout(): React.ReactNode {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const biometricLocked = useAuthStore((s) => s.biometricLocked)
  const hasWorkspace = useWorkspaceStore((s) => s.selectedWorkspace)

  // Already authenticated with a workspace AND not waiting on biometrics
  // -- redirect to the app. While `biometricLocked` is true we keep the
  // user on this layout so the login screen can run the unlock path.
  if (isAuthenticated && hasWorkspace !== null && !biometricLocked) {
    return <Redirect href="/(app)" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
