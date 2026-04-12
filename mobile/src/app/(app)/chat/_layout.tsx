import { Stack } from 'expo-router'

/**
 * Chat stack navigator within the tab.
 *
 * Provides header styling and screen definitions for all chat routes:
 * - index: Channel list
 * - channel/[id]: Channel detail (messages)
 * - thread/[id]: Thread replies
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
      <Stack.Screen name="thread/[id]" options={{ title: 'Thread' }} />
    </Stack>
  )
}
