# Performance

## What

The Huly mobile app targets consistent 60fps scrolling, sub-200ms screen transitions, and under 2 seconds cold start time. Performance bottlenecks in React Native come from three areas: JS thread overload, bridge traffic (pre-New Architecture), and excessive re-renders. SDK 55 with New Architecture (Fabric + JSI) eliminates bridge overhead, but JS thread management and render optimization remain critical.

### Performance budget

| Metric | Target | How to measure |
|---|---|---|
| Cold start (splash to content) | < 2s | Stopwatch, Flipper startup trace |
| Screen transition | < 200ms | React DevTools Profiler |
| List scroll FPS | 60fps sustained | Perf Monitor overlay |
| JS thread frame time | < 16ms | Perf Monitor, Flipper |
| Memory (steady state) | < 300MB | Xcode Instruments, Android Studio Profiler |
| Bundle size (JS) | < 5MB | `npx expo export` then check bundle |

### Performance priority stack

| Priority | Area | Impact |
|---|---|---|
| 1 | List virtualization | Largest impact on scroll performance |
| 2 | Image optimization | Memory pressure, load times |
| 3 | Re-render prevention | JS thread frame drops |
| 4 | Bundle size | Cold start time |
| 5 | Animation thread | Visual fluidity |

## How

### FlashList for all scrollable lists

```tsx
// src/components/features/issue-list.tsx
import { FlashList } from '@shopify/flash-list';
import { useCallback } from 'react';

import { IssueCard } from '@/components/features/issue-card';
import type { Issue } from '@hcengineering/tracker';

interface IssueListProps {
  issues: Issue[];
  onPressIssue: (issue: Issue) => void;
  onEndReached?: () => void;
  isLoadingMore?: boolean;
}

function IssueList({
  issues,
  onPressIssue,
  onEndReached,
  isLoadingMore,
}: IssueListProps): React.ReactNode {
  const renderItem = useCallback(
    ({ item }: { item: Issue }) => (
      <IssueCard issue={item} onPress={onPressIssue} />
    ),
    [onPressIssue]
  );

  const keyExtractor = useCallback(
    (item: Issue) => item._id,
    []
  );

  return (
    <FlashList
      data={issues}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={80}                 // Measure actual average height
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}            // Trigger at 50% from bottom
      ListFooterComponent={
        isLoadingMore ? <ActivityIndicator className="py-4" /> : null
      }
      drawDistance={250}                      // Pre-render 250px beyond visible area
    />
  );
}

export { IssueList };
```

### FlashList tuning parameters

| Parameter | Default | Recommended | Why |
|---|---|---|---|
| `estimatedItemSize` | Required | Actual average height | Accurate scroll indicator, fewer layout shifts |
| `drawDistance` | 250 | 250-500 | Higher = fewer blanks during fast scroll |
| `overrideItemLayout` | none | Use for variable heights | Precise layout for mixed content |
| `recyclingKey` | auto | Explicit for mixed types | Prevents recycling wrong component types |

```tsx
// Variable height items with overrideItemLayout
<FlashList
  data={mixedItems}
  renderItem={renderItem}
  estimatedItemSize={100}
  overrideItemLayout={(layout, item) => {
    layout.size = item.type === 'header' ? 48 : 80;
  }}
  getItemType={(item) => item.type}
/>
```

### React.memo for list items

```tsx
// src/components/features/issue-card.tsx
import { memo, useCallback } from 'react';

interface IssueCardProps {
  issue: Issue;
  onPress: (issue: Issue) => void;
}

function IssueCardInner({ issue, onPress }: IssueCardProps): React.ReactNode {
  const handlePress = useCallback(() => onPress(issue), [issue, onPress]);

  return (
    <Pressable onPress={handlePress} className="p-3 bg-surface-secondary rounded-lg mb-2">
      <Text className="text-content-primary font-sans-medium">{issue.title}</Text>
    </Pressable>
  );
}

const IssueCard = memo(IssueCardInner);
export { IssueCard };
```

**When memo helps:** Components rendered many times in lists (FlashList items), components receiving the same props on most parent re-renders, computationally expensive render functions.

**When memo hurts:** Components that always receive new props, components rendered once (screens, layouts), simple components (Text wrappers, dividers).

### useMemo and useCallback patterns

```tsx
// Expensive computation -- memoize
const sortedIssues = useMemo(() => {
  return [...issues].sort((a, b) => b.modifiedOn - a.modifiedOn);
}, [issues]);

// Stable callback for child components -- prevents re-renders
const handlePress = useCallback((issue: Issue) => {
  router.push(`/tracker/${issue._id}`);
}, []);

// Filtering derived data -- compute during render
const openIssues = useMemo(() => {
  return issues.filter((i) => !i.isDone);
}, [issues]);
```

### Image optimization with expo-image

```tsx
import { Image } from 'expo-image';

// Avatar in a list -- small, cached, recycled
<Image
  source={{ uri: avatarUrl }}
  style={{ width: 32, height: 32, borderRadius: 16 }}
  contentFit="cover"
  recyclingKey={userId}                    // Reuse image instance in FlashList
  cachePolicy="memory-disk"               // Cache in memory and disk
  transition={150}                         // Smooth load transition
/>

// Attachment preview -- blurhash placeholder
<Image
  source={{ uri: imageUrl }}
  className="w-full aspect-video rounded-md"
  contentFit="cover"
  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
  transition={300}
  cachePolicy="disk"                       // Disk cache for larger images
/>

// Sized image request -- do not load full resolution
const thumbnailUrl = `${baseUrl}?width=200&height=200&format=webp`;
<Image source={{ uri: thumbnailUrl }} style={{ width: 100, height: 100 }} />
```

### Reanimated for UI thread animations

```tsx
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

function CollapsibleSection({ title, children }: Props): React.ReactNode {
  const isExpanded = useSharedValue(false);
  const height = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    height: reducedMotion
      ? (isExpanded.value ? 'auto' : 0)
      : withTiming(isExpanded.value ? height.value : 0, { duration: 250 }),
    overflow: 'hidden' as const,
  }));

  function toggle(): void {
    isExpanded.value = !isExpanded.value;
  }

  return (
    <View>
      <Pressable onPress={toggle} accessibilityRole="button">
        <Text className="font-sans-semibold text-content-primary">{title}</Text>
      </Pressable>
      <Animated.View style={animatedStyle}>
        <View
          onLayout={(e) => { height.value = e.nativeEvent.layout.height; }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
```

### Avoiding JS thread pressure

```typescript
// WRONG -- heavy computation on JS thread during render
function IssueList({ issues }: { issues: Issue[] }) {
  // This runs on every render, blocking JS thread
  const grouped = issues.reduce((acc, issue) => {
    const status = getStatusLabel(issue.status);
    (acc[status] ??= []).push(issue);
    return acc;
  }, {} as Record<string, Issue[]>);
  // ...
}

// RIGHT -- memoize expensive computation
function IssueList({ issues }: { issues: Issue[] }) {
  const grouped = useMemo(() => {
    return issues.reduce((acc, issue) => {
      const status = getStatusLabel(issue.status);
      (acc[status] ??= []).push(issue);
      return acc;
    }, {} as Record<string, Issue[]>);
  }, [issues]);
  // ...
}
```

### Bundle size monitoring

```bash
# Check bundle size
npx expo export --platform ios
ls -lh dist/bundles/ios-*.js

# Analyze what is in the bundle
npx react-native-bundle-visualizer

# Tree-shakeable imports
import { format } from 'date-fns/format';       // good -- specific import
import { format } from 'date-fns';               // bad -- imports entire library
```

### Hermes engine optimizations

Hermes is the default JS engine in SDK 55. It provides:
- Bytecode precompilation (faster startup)
- Optimized garbage collector
- Reduced memory usage

Verify Hermes is active:

```tsx
const isHermes = (): boolean => !!(global as any).HermesInternal;
// Should return true on both platforms
```

### Infinite scroll with TanStack Query

```typescript
// src/hooks/use-issues.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteIssues(projectId: string) {
  return useInfiniteQuery({
    queryKey: ['issues', 'infinite', projectId],
    queryFn: ({ pageParam = 0 }) => findIssues(
      { space: projectId },
      { skip: pageParam, limit: 20 }
    ),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
    staleTime: 30_000,
  });
}

// In screen:
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteIssues(projectId);
const allIssues = data?.pages.flat() ?? [];

<FlashList
  data={allIssues}
  onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
  onEndReachedThreshold={0.5}
  ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
/>
```

## When

### When to use FlashList vs FlatList vs ScrollView

| Items | Component | Notes |
|---|---|---|
| 0-10 fixed items | `ScrollView` | Settings, detail screens |
| 10-50 items | `FlatList` | Adequate performance for small lists |
| 50+ items | `FlashList` | Mandatory for good scroll performance |
| Any list that grows | `FlashList` | Even if initially small, plan for growth |

### When to memoize

| Scenario | Memoize? | Tool |
|---|---|---|
| FlashList renderItem component | Yes | `React.memo` |
| Computed data from props | Yes if expensive | `useMemo` |
| Callback passed to child | Yes if child is memoized | `useCallback` |
| Simple string concatenation | No | Direct computation |
| Single-render component | No | No benefit |

### When to use Reanimated vs LayoutAnimation

| Animation | Tool |
|---|---|
| Continuous gesture-driven | Reanimated (`useAnimatedGestureHandler`) |
| Spring/timing transitions | Reanimated (`withSpring`, `withTiming`) |
| Simple expand/collapse | `LayoutAnimation` (simpler API) |
| Shared element transition | Reanimated + `SharedTransition` |

## Never

- **Never use ScrollView with `.map()` for dynamic lists.**

```tsx
// WRONG -- no virtualization
<ScrollView>
  {issues.map(issue => <IssueCard key={issue._id} issue={issue} />)}
</ScrollView>

// RIGHT -- virtualized
<FlashList data={issues} renderItem={...} estimatedItemSize={80} />
```

- **Never skip `keyExtractor` on lists.** Without it, React cannot efficiently reconcile items.

- **Never create new objects/functions in render without memoizing when passed to memoized children.**

```tsx
// WRONG -- new object every render, defeats memo
<IssueCard issue={issue} style={{ padding: 10 }} onPress={() => handlePress(issue)} />

// RIGHT -- stable references
const style = useMemo(() => ({ padding: 10 }), []);
const handlePress = useCallback((issue: Issue) => { ... }, []);
<IssueCard issue={issue} style={style} onPress={handlePress} />
```

- **Never load full-resolution images for thumbnails.** Always request server-side resizing:

```tsx
// WRONG -- loads 4000x3000 image for a 100x100 thumbnail
<Image source={{ uri: originalUrl }} style={{ width: 100, height: 100 }} />

// RIGHT -- request appropriately sized image
<Image source={{ uri: `${originalUrl}?width=200&format=webp` }} style={{ width: 100, height: 100 }} />
```

- **Never run heavy synchronous computation during render.** Use `useMemo` or move to a worker.
- **Never use `Animated` from `react-native` for complex animations.** Use `react-native-reanimated` for UI thread animations.
- **Never import entire utility libraries.** Use specific imports: `import { format } from 'date-fns/format'`.
- **Never use `console.log` in production code.** Console calls are synchronous and block the JS thread. Use `__DEV__` guards or remove in production.

```typescript
// WRONG
console.log('Issue loaded:', issue);

// RIGHT
if (__DEV__) {
  console.log('Issue loaded:', issue._id);
}
```
