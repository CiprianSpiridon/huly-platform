import { Stack } from 'expo-router'

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
      <Stack.Screen name="index" options={{ title: 'Inbox' }} />
    </Stack>
  )
}
