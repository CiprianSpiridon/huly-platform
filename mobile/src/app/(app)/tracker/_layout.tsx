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
      <Stack.Screen
        name="project/new"
        options={{
          title: 'New Project',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="project/edit/[id]"
        options={{
          title: 'Edit Project',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="issue/[id]" options={{ title: 'Issue' }} />
      <Stack.Screen
        name="create"
        options={{
          title: 'New Issue',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: 'Edit Issue',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="search" options={{ title: 'Search Issues' }} />
      <Stack.Screen
        name="project/[id]/components"
        options={{ title: 'Components' }}
      />
      <Stack.Screen
        name="project/[id]/components/new"
        options={{
          title: 'New Component',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="project/[id]/components/[componentId]"
        options={{
          title: 'Edit Component',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="project/[id]/milestones"
        options={{ title: 'Milestones' }}
      />
      <Stack.Screen
        name="project/[id]/milestones/new"
        options={{
          title: 'New Milestone',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="project/[id]/milestones/[milestoneId]"
        options={{
          title: 'Edit Milestone',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  )
}
