import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { View } from 'react-native'

import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { useChatStore } from '@/store/chat'
import { useInboxStore } from '@/store/inbox'
import { useChatUnreadSync } from '@/hooks/useChatUnread'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { usePushRegistration } from '@/hooks/usePushRegistration'
import { ConnectionStatusBar } from '@/components/features/ConnectionStatusBar'
import { ErrorBoundary } from '@/components/features/ErrorBoundary'

/**
 * Authenticated app layout with bottom tab navigator.
 *
 * Auth guard checks happen in the parent component.
 * The tab shell with hooks is a separate child component
 * to avoid Rules-of-Hooks violations from conditional returns.
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

  // Render the tab shell as a child — hooks are always called inside it
  return (
    <ErrorBoundary>
      <AuthenticatedTabShell />
    </ErrorBoundary>
  )
}

/**
 * Tab shell rendered only when authenticated + workspace selected.
 * All hooks are called unconditionally here — no Rules-of-Hooks violation.
 */
function AuthenticatedTabShell(): React.ReactNode {
  // Unread sync hooks — always mounted when authenticated
  useChatUnreadSync()
  useUnreadCount()
  // Push token registration — acquires token and registers with backend
  usePushRegistration()

  const chatBadge = useChatStore((s) => s.unreadTotal)
  const inboxBadge = useInboxStore((s) => s.unreadTotal)

  return (
    <View className="flex-1">
      <ConnectionStatusBar />
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
        }}
      >
        <Tabs.Screen
          name="tracker"
          options={{
            title: 'Tracker',
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="checkmark-circle-outline"
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
                name="chatbubbles-outline"
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
        {/* Hide non-tab routes from the tab bar */}
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="onboarding" options={{ href: null }} />
        <Tabs.Screen name="search" options={{ href: null }} />
      </Tabs>
    </View>
  )
}
