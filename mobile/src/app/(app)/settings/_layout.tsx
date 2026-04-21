import { Stack } from 'expo-router'

export default function SettingsLayout(): React.ReactNode {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#161719' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'IBMPlexSans-SemiBold' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="workspaces" options={{ title: 'Switch Workspace' }} />
      <Stack.Screen name="create-workspace" options={{ title: 'Create Workspace' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="members" options={{ title: 'Members' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  )
}
