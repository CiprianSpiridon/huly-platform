import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'

/**
 * Authenticated app layout with bottom tab navigator.
 *
 * Replaces the Phase 1 placeholder Stack. Guards access behind auth +
 * workspace selection. Four tabs: Tracker, Chat, Inbox, Settings.
 *
 * Badge counts read from future Zustand stores (useChatStore, useInboxStore)
 * via optional chaining -- they default to 0 until those phases create them.
 */
export default function AppLayout(): React.ReactNode {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasWorkspace = useWorkspaceStore((s) => s.selectedWorkspace)

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  if (hasWorkspace === null) {
    return <Redirect href="/(auth)/workspace-select" />
  }

  // Future badge counts -- default to 0 until chat/inbox phases
  const chatBadge = 0
  const inboxBadge = 0

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#161719',
          borderTopColor: '#2D2E33',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#205DC2',
        tabBarInactiveTintColor: '#77818B',
        tabBarLabelStyle: {
          fontFamily: 'IBMPlexSans-Medium',
          fontSize: 11,
        },
      }}
    >
      {/* Hide the root index redirect from the tab bar */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="tracker"
        options={{
          title: 'Tracker',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="checkbox-outline"
              size={size}
              color={color}
              accessibilityLabel="Tracker tab"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarBadge: chatBadge > 0 ? chatBadge : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="chatbubble-outline"
              size={size}
              color={color}
              accessibilityLabel="Chat tab"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: inboxBadge > 0 ? inboxBadge : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="notifications-outline"
              size={size}
              color={color}
              accessibilityLabel="Inbox tab"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={color}
              accessibilityLabel="Settings tab"
            />
          ),
        }}
      />
    </Tabs>
  )
}
