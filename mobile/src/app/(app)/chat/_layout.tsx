import { Stack } from 'expo-router'

/**
 * Chat stack navigator within the tab.
 *
 * Provides header styling and screen definitions for all chat routes:
 * - index: Channel list
 * - channel/[id]: Channel detail (messages)
 * - channel/[id]/settings: Channel settings
 * - thread/[id]: Thread replies
 * - create: Create new channel
 * - new-dm: Create new DM / group DM
 */
export default function ChatLayout(): React.ReactNode {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#161719' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'IBMPlexSans-SemiBold' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Chat' }} />
      <Stack.Screen name="channel/[id]" options={{ title: 'Channel' }} />
      <Stack.Screen name="channel/[id]/settings" options={{ title: 'Settings', presentation: 'modal' }} />
      <Stack.Screen name="thread/[id]" options={{ title: 'Thread' }} />
      <Stack.Screen name="create" options={{ title: 'New Channel', presentation: 'modal' }} />
      <Stack.Screen name="new-dm" options={{ title: 'New Message', presentation: 'modal' }} />
    </Stack>
  )
}
