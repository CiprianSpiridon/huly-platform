import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { useConnectionStore } from '@/store/connection'

/**
 * Settings screen with logout action.
 */
export default function SettingsScreen(): React.ReactNode {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace)
  const disconnect = useConnectionStore((s) => s.disconnect)

  const handleLogout = async (): Promise<void> => {
    disconnect()
    await clearWorkspace()
    await clearAuth()
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1 px-4 pt-4">
        <Pressable
          className="bg-surface-accent rounded-md p-4 active:opacity-80"
          onPress={() => void handleLogout()}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Text className="font-sans-medium text-base text-negative text-center">
            Log Out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
