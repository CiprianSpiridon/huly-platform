import { Stack } from 'expo-router'

/**
 * Inbox stack navigator within the tab.
 *
 * Manages the notification list and detail/deep-navigation screens.
 * The header is hidden on the list screen (it renders its own header
 * with filter chips) and shown on the detail screen.
 */
export default function InboxLayout(): React.ReactNode {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#161719' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'IBMPlexSans-SemiBold' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="notification/[id]" options={{ title: 'Notification' }} />
    </Stack>
  )
}
