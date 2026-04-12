# Routing

## What

The Huly mobile app uses expo-router v6 for all navigation. Every file in `app/` becomes a route. Route groups `(auth)` and `(app)` separate unauthenticated and authenticated flows. The tab navigator provides four primary sections: Inbox, Tracker, Chat, and Settings. All navigation uses `router.push()`, `router.replace()`, and `router.back()` -- never `navigation.navigate()` from `@react-navigation`.

### Route map

| Route file | URL path | Screen |
|---|---|---|
| `app/_layout.tsx` | -- | Root layout: providers, font loading, splash |
| `app/+not-found.tsx` | -- | 404 fallback |
| `app/(auth)/_layout.tsx` | -- | Auth stack (no tabs) |
| `app/(auth)/login.tsx` | `/login` | Email + password login |
| `app/(auth)/workspace-select.tsx` | `/workspace-select` | Workspace picker |
| `app/(app)/_layout.tsx` | -- | Auth guard + providers |
| `app/(app)/(tabs)/_layout.tsx` | -- | Tab bar (Inbox, Tracker, Chat, Settings) |
| `app/(app)/(tabs)/inbox/index.tsx` | `/inbox` | Notification list |
| `app/(app)/(tabs)/inbox/[id].tsx` | `/inbox/:id` | Notification detail |
| `app/(app)/(tabs)/tracker/index.tsx` | `/tracker` | Issue list |
| `app/(app)/(tabs)/tracker/[id].tsx` | `/tracker/:id` | Issue detail |
| `app/(app)/(tabs)/tracker/create.tsx` | `/tracker/create` | Create issue |
| `app/(app)/(tabs)/chat/index.tsx` | `/chat` | Channel list |
| `app/(app)/(tabs)/chat/[id].tsx` | `/chat/:id` | Channel messages |
| `app/(app)/(tabs)/settings/index.tsx` | `/settings` | Settings menu |
| `app/(app)/modal/issue-create.tsx` | `/modal/issue-create` | Quick issue modal |

### Typed routes

With `experiments.typedRoutes: true` in `app.json`, expo-router generates route types. The router enforces valid paths at compile time:

```typescript
import { router } from 'expo-router';

router.push('/tracker/ISSUE-123');          // typed, validated at compile time
router.push(`/chat/${channelId}`);          // dynamic segment
router.replace('/(auth)/login');            // replace current screen
```

## How

### Root layout -- providers, fonts, splash

```tsx
// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';

import '../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout(): React.ReactNode {
  const [fontsLoaded] = useFonts({
    'IBMPlexSans-Regular': require('../assets/fonts/IBMPlexSans-Regular.ttf'),
    'IBMPlexSans-Medium': require('../assets/fonts/IBMPlexSans-Medium.ttf'),
    'IBMPlexSans-SemiBold': require('../assets/fonts/IBMPlexSans-SemiBold.ttf'),
    'IBMPlexSans-Bold': require('../assets/fonts/IBMPlexSans-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </QueryClientProvider>
  );
}
```

### Auth guard in (app) layout

```tsx
// app/(app)/_layout.tsx
import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth';

export default function AppLayout(): React.ReactNode {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasWorkspace = useAuthStore((s) => s.selectedWorkspace !== null);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasWorkspace) {
    return <Redirect href="/(auth)/workspace-select" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="modal/issue-create"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}
```

### Tab navigator

```tsx
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useInboxBadgeCount } from '@/hooks/use-inbox';

export default function TabLayout(): React.ReactNode {
  const badgeCount = useInboxBadgeCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#161719',
          borderTopColor: '#2D2E33',
        },
        tabBarActiveTintColor: '#205DC2',
        tabBarInactiveTintColor: '#77818B',
      }}
    >
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: badgeCount > 0 ? badgeCount : undefined,
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
  );
}
```

### Dynamic route with parameter validation

```tsx
// app/(app)/(tabs)/tracker/[id].tsx
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text } from 'react-native';

import { useIssue } from '@/hooks/use-issues';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';
import { IssueDetailView } from '@/components/features/issue-detail-view';

export default function IssueDetailScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    router.back();
    return null;
  }

  const { data: issue, isLoading, error, refetch } = useIssue(id);

  if (isLoading) {
    return <Spinner />;
  }

  if (error || !issue) {
    return <ErrorState message="Issue not found" onRetry={refetch} />;
  }

  return <IssueDetailView issue={issue} />;
}
```

### Deep linking configuration

The `huly` URL scheme is declared in `app.json`. Deep links follow this pattern:

| Deep link | Route |
|---|---|
| `huly://login` | `/(auth)/login` |
| `huly://tracker/{issueId}` | `/(app)/(tabs)/tracker/[id]` |
| `huly://chat/{channelId}` | `/(app)/(tabs)/chat/[id]` |
| `huly://inbox/{notificationId}` | `/(app)/(tabs)/inbox/[id]` |

expo-router handles deep link mapping automatically when the URL scheme matches route segments. For universal links (HTTPS), configure `extra.router.origin` in `app.json` and set up Apple App Site Association / Android App Links.

### Modal presentation

```tsx
// app/(app)/modal/issue-create.tsx
import { router } from 'expo-router';
import { View } from 'react-native';

import { IssueCreateForm } from '@/components/features/issue-create-form';

export default function IssueCreateModal(): React.ReactNode {
  function handleSuccess(issueId: string): void {
    router.dismiss();                         // Close modal
    router.push(`/tracker/${issueId}`);       // Navigate to new issue
  }

  function handleCancel(): void {
    router.dismiss();
  }

  return (
    <View className="flex-1 bg-surface-primary">
      <IssueCreateForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </View>
  );
}
```

### Stack navigator within a tab

```tsx
// app/(app)/(tabs)/tracker/_layout.tsx
import { Stack } from 'expo-router';

export default function TrackerLayout(): React.ReactNode {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#161719' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'IBMPlexSans-SemiBold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Issues' }} />
      <Stack.Screen name="[id]" options={{ title: 'Issue' }} />
      <Stack.Screen name="create" options={{ title: 'New Issue' }} />
    </Stack>
  );
}
```

## When

### Navigation method decision tree

| Scenario | Method | Why |
|---|---|---|
| Go to a new screen (keep back stack) | `router.push('/path')` | Pushes onto stack, back button returns |
| Replace current screen (no back) | `router.replace('/path')` | Replaces stack entry. Use for login --> workspace transitions |
| Go back one screen | `router.back()` | Pops stack. Never use `router.push()` to go "back" |
| Close a modal | `router.dismiss()` | Dismisses presented modal |
| Close all modals | `router.dismissAll()` | Returns to the underlying screen |
| Navigate after auth state change | `<Redirect href="..." />` | Declarative redirect in layout. No imperative call needed |
| Open external URL | `Linking.openURL(url)` | System browser, not in-app |

### When to use route groups

| Group | Purpose |
|---|---|
| `(auth)` | Login, OTP, workspace selection -- no tab bar, minimal layout |
| `(app)` | Authenticated screens -- auth guard in layout, tab bar |
| `(tabs)` | Tab navigator -- inbox, tracker, chat, settings |

### When to use modal presentation

Use modal when the user is performing a focused task that should overlay the current context: creating an issue, previewing an attachment, or selecting from a picker. Use stack push for full navigation to a new context.

### When to use `useLocalSearchParams` vs `useGlobalSearchParams`

| Hook | Use case |
|---|---|
| `useLocalSearchParams` | Default. Reads params from the current route segment only. |
| `useGlobalSearchParams` | When a parent layout needs to read a child route's dynamic segment. Rare. |

## Never

- **Never import from `@react-navigation` directly.**

```typescript
// WRONG -- direct react-navigation import
import { useNavigation } from '@react-navigation/native';
const navigation = useNavigation();
navigation.navigate('IssueDetail', { id: '123' });

// RIGHT -- expo-router
import { router } from 'expo-router';
router.push(`/tracker/${id}`);
```

- **Never use `router.push()` to go back.**

```typescript
// WRONG -- pushes a new stack entry
router.push('/tracker');

// RIGHT -- pops the current screen
router.back();
```

- **Never put auth logic in individual screens.** The auth guard lives in `(app)/_layout.tsx` using `<Redirect>`. Screens inside `(app)` can assume the user is authenticated.

- **Never omit `_layout.tsx` from route groups.** Every group directory (`(auth)`, `(app)`, `(tabs)`, `inbox/`, `tracker/`, etc.) needs a layout file. Missing layouts cause undefined navigation behavior.

- **Never use string-based navigation without typed routes.** Enable `experiments.typedRoutes: true` in `app.json` and let TypeScript catch invalid paths.

- **Never navigate imperatively in response to auth state changes.** Use `<Redirect>` in layouts. Imperative navigation during render causes React warnings and race conditions.

```tsx
// WRONG -- imperative navigation in render
export default function AppLayout() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (!isAuth) router.replace('/login');
  }, [isAuth]);
  return <Stack />;
}

// RIGHT -- declarative redirect
export default function AppLayout() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  if (!isAuth) return <Redirect href="/(auth)/login" />;
  return <Stack />;
}
```

- **Never nest tab navigators.** One `Tabs` component at `(tabs)/_layout.tsx`. Nested tabs create confusing UX and navigation bugs.
- **Never use `href` with objects for simple routes.** Use template literal strings: `router.push(`/tracker/${id}`)`.
