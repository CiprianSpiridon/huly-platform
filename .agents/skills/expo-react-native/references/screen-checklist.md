# Screen Checklist

## What

Every screen in the Huly mobile app must handle five states, provide safe area insets, manage keyboard behavior, and meet accessibility requirements. This checklist applies to every route file under `app/`. Skipping any item creates a broken experience on at least one device or platform.

### Required states for every screen

| State | What the user sees | Implementation |
|---|---|---|
| Loading | Skeleton or spinner | TanStack Query `isLoading` + `<Spinner />` |
| Success | Content | Default render path |
| Empty | "No items" message with optional action | Check `data.length === 0` after loading |
| Error | Error message with retry button | TanStack Query `error` + `<ErrorState onRetry={refetch} />` |
| Offline | Cached data or offline banner | TanStack Query `fetchStatus === 'paused'` + banner |

### Screen checklist (verify before PR)

- [ ] Wrapped in `SafeAreaView` or uses `useSafeAreaInsets()`
- [ ] Keyboard avoidance for screens with text inputs
- [ ] Loading state with spinner or skeleton
- [ ] Error state with retry
- [ ] Empty state with message and optional CTA
- [ ] Pull-to-refresh on list screens
- [ ] Dark mode styles (all colors via Tailwind tokens)
- [ ] Accessibility labels on all interactive elements
- [ ] Back navigation works correctly
- [ ] Dynamic route params validated before use
- [ ] Status bar style matches screen background

## How

### Complete screen template

```tsx
// app/(app)/(tabs)/tracker/index.tsx
import { useCallback, useState } from 'react';
import { View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useIssues } from '@/hooks/use-issues';
import { useWorkspaceStore } from '@/store/workspace';
import { IssueCard } from '@/components/features/issue-card';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { FlashList } from '@shopify/flash-list';
import type { Issue } from '@hcengineering/tracker';

export default function IssueListScreen(): React.ReactNode {
  const projectId = useWorkspaceStore((s) => s.activeProjectId);
  const { data: issues, isLoading, error, refetch, fetchStatus } = useIssues(projectId);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePress = useCallback((issue: Issue) => {
    router.push(`/tracker/${issue._id}`);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Spinner size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
        <ErrorState
          message="Failed to load issues"
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  // Empty state
  if (!issues || issues.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
        <EmptyState
          title="No issues yet"
          description="Create your first issue to get started"
          actionLabel="Create Issue"
          onAction={() => router.push('/modal/issue-create')}
        />
      </SafeAreaView>
    );
  }

  // Offline banner
  const isOffline = fetchStatus === 'paused';

  // Success state
  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
      {isOffline && (
        <View className="bg-warning-subtle px-4 py-2">
          <Text className="text-warning-text text-sm font-sans-medium text-center">
            You are offline. Showing cached data.
          </Text>
        </View>
      )}
      <FlashList
        data={issues}
        renderItem={({ item }) => (
          <IssueCard issue={item} onPress={() => handlePress(item)} />
        )}
        keyExtractor={(item) => item._id}
        estimatedItemSize={80}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#205DC2"
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </SafeAreaView>
  );
}
```

### SafeAreaView patterns

```tsx
// Full screen with safe area on all edges
<SafeAreaView className="flex-1 bg-surface-primary">
  {/* content */}
</SafeAreaView>

// List screen -- safe area on top only (bottom handled by tab bar)
<SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
  {/* content */}
</SafeAreaView>

// Modal -- safe area on top and bottom (no tab bar)
<SafeAreaView className="flex-1 bg-surface-primary" edges={['top', 'bottom']}>
  {/* content */}
</SafeAreaView>

// When you need precise inset values (e.g., for absolute positioning)
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomHeader(): React.ReactNode {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top }} className="bg-surface-primary px-4 pb-2">
      {/* header content */}
    </View>
  );
}
```

### Keyboard avoidance

```tsx
// For screens with text inputs
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateIssueScreen(): React.ReactNode {
  return (
    <SafeAreaView className="flex-1 bg-surface-primary">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16 }}
        >
          {/* form inputs */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### Detail screen with back navigation

```tsx
// app/(app)/(tabs)/tracker/[id].tsx
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIssue } from '@/hooks/use-issues';
import { Spinner } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/error-state';

export default function IssueDetailScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    router.back();
    return null;
  }

  const { data: issue, isLoading, error, refetch } = useIssue(id);

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: issue?.identifier ?? 'Issue',
          headerBackTitle: 'Issues',
        }}
      />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner size="large" />
        </View>
      ) : error || !issue ? (
        <ErrorState message="Could not load issue" onRetry={refetch} />
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {/* Issue content */}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
```

### Pull-to-refresh pattern

```tsx
import { useState, useCallback } from 'react';
import { RefreshControl } from 'react-native';

// Inside a list screen:
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  await refetch();
  setRefreshing(false);
}, [refetch]);

<FlashList
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor="#205DC2"          // Huly blue -- visible on dark background
      progressBackgroundColor="#1E1F23"  // Android spinner background
    />
  }
  // ...
/>
```

### Status bar management

```tsx
// In root layout -- sets default for entire app
import { StatusBar } from 'expo-status-bar';

<StatusBar style="light" />   // Light text on dark background (Huly default)

// Override per-screen when needed (e.g., light background modal)
import { StatusBar } from 'expo-status-bar';

export default function LightModal(): React.ReactNode {
  return (
    <>
      <StatusBar style="dark" />
      {/* light background content */}
    </>
  );
}
```

## When

### When to use ScrollView vs FlatList vs FlashList

| Situation | Component | Why |
|---|---|---|
| Fixed content (settings, forms, detail view) | `ScrollView` | No virtualization needed, content fits in memory |
| List of 1--50 items | `FlatList` | Built-in virtualization, good enough for small lists |
| List of 50+ items or complex cells | `FlashList` | RecyclerView on Android, significantly better performance |
| Sectioned list | `FlashList` with `stickyHeaderIndices` | Better performance than SectionList |
| Infinite scroll | `FlashList` + `onEndReached` | TanStack Query `useInfiniteQuery` + FlashList |

### When to use `edges` prop on SafeAreaView

| Screen type | Edges |
|---|---|
| Tab screen (tab bar covers bottom) | `edges={['top']}` |
| Full-screen modal (no tab bar) | `edges={['top', 'bottom']}` |
| Screen with custom header | `edges={['bottom']}` |
| Settings/form with no header or tab | `edges={['top', 'bottom', 'left', 'right']}` |

### When to show skeleton vs spinner

| Content | Approach |
|---|---|
| Known layout (issue list, chat messages) | Skeleton matching the layout shape |
| Unknown layout (first load of dynamic content) | Centered spinner |
| Subsequent loads (pull-to-refresh, pagination) | Existing content + activity indicator |

## Never

- **Never render a screen without handling all five states** (loading, success, empty, error, offline).

```tsx
// WRONG -- only handles success
export default function IssueList() {
  const { data } = useIssues(projectId);
  return data.map(issue => <IssueCard key={issue._id} issue={issue} />);
}

// RIGHT -- handles all states
export default function IssueList() {
  const { data, isLoading, error, refetch, fetchStatus } = useIssues(projectId);
  if (isLoading) return <Spinner />;
  if (error) return <ErrorState message="Failed to load" onRetry={refetch} />;
  if (!data?.length) return <EmptyState title="No issues" />;
  // success path...
}
```

- **Never use `ScrollView` with `.map()` for lists that can grow.**

```tsx
// WRONG -- no virtualization, crashes with large data
<ScrollView>
  {issues.map(issue => <IssueCard key={issue._id} issue={issue} />)}
</ScrollView>

// RIGHT -- virtualized list
<FlashList
  data={issues}
  renderItem={({ item }) => <IssueCard issue={item} />}
  keyExtractor={(item) => item._id}
  estimatedItemSize={80}
/>
```

- **Never skip SafeAreaView.** Content will render under the notch, dynamic island, or system bars.
- **Never hardcode status bar height.** Use `useSafeAreaInsets()` for precise values.
- **Never forget `keyboardShouldPersistTaps="handled"`** on ScrollViews containing text inputs. Without it, tapping a button dismisses the keyboard instead of triggering the button press.
- **Never use `flex: 1` without `className="flex-1"`.** Always use NativeWind classes, not inline styles.
- **Never show a blank screen during loading.** Always show a spinner, skeleton, or preserved previous content.
