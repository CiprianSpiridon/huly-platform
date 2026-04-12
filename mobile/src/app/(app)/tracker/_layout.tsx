import { Stack } from 'expo-router'

/**
 * Tracker stack navigator within the tab.
 *
 * Provides header styling and screen definitions for all tracker routes.
 */
export default function TrackerLayout(): React.ReactNode {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#161719' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'IBMPlexSans-SemiBold' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Projects' }} />
      <Stack.Screen name="project/[id]" options={{ title: 'Issues' }} />
      <Stack.Screen name="issue/[id]" options={{ title: 'Issue' }} />
      <Stack.Screen
        name="create"
        options={{
          title: 'New Issue',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="search" options={{ title: 'Search Issues' }} />
    </Stack>
  )
}
