# Component Anatomy

## What

A component is a single `.tsx` file with one named export. Every component follows the same structure: imports, props interface, function, export. Components live in one of three tiers that determine what they are allowed to do. Unlike Next.js, React Native has no server/client boundary -- all components are client components. The distinction is between stateless primitives, stateful features, and route-specific components.

### Component tiers

| Tier | Location | Allowed | Forbidden |
|---|---|---|---|
| Primitives | `src/components/ui/` | Props only, NativeWind styling, `ref` forwarding, simple `useState` for UI (pressed state) | Hooks with side effects, data fetching, navigation, business logic |
| Features | `src/components/features/` | Compose ui/ primitives, use hooks (`useState`, `useCallback`), navigate via `router`, use feature hooks | Direct API calls, raw fetch, inline TanStack Query |
| Route-specific | `app/**/_components/` | Everything: use data hooks, compose any tier | Reuse outside its route. If needed in 2+ routes, promote to features/ |

### File template

```tsx
import { memo, forwardRef } from 'react';             // 1a. React
import { View, Text, Pressable } from 'react-native'; // 1b. React Native
import { router } from 'expo-router';                  // 1c. Expo

import { Image } from 'expo-image';                    // 2. Third-party

import { Avatar } from '@/components/ui/avatar';       // 3a. @/ internal -- ui
import { PriorityIcon } from '@/components/features/priority-icon'; // 3b. @/ internal -- features
import { formatRelativeTime } from '@/lib/format';     // 3c. @/ internal -- lib

import type { IssueCardProps } from './issue-card.types'; // 4. Relative (co-located types only)

interface IssueCardProps {                              // 5. Props interface -- explicit, no any
  title: string;
  identifier: string;
  priority: number;
  assigneeAvatar?: string;
  updatedAt: number;
  onPress: () => void;
}

function IssueCard({                                   // 6. Component function
  title,
  identifier,
  priority,
  assigneeAvatar,
  updatedAt,
  onPress,
}: IssueCardProps): React.ReactNode {
  return (
    <Pressable
      className="flex-row items-center bg-surface-secondary rounded-lg p-3 mb-2 active:opacity-80"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Issue ${identifier}: ${title}`}
    >
      {/* content */}
    </Pressable>
  );
}

export { IssueCard };                                  // 7. Named export
```

**Import order:** React/RN --> Expo --> third-party --> `@/` internal --> relative `./`. Blank line between groups. Never `../../` -- cross-directory imports always use `@/`.

**Exports:** Named exports for all components. Default exports ONLY for route files (`_layout.tsx`, screen files like `index.tsx`, `[id].tsx`, `+not-found.tsx`). One component per file.

## How

### Primitive -- Button (ui tier)

```tsx
// src/components/ui/button.tsx
import { forwardRef } from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

const sizeClasses = {
  sm: 'px-3 py-1.5 min-h-[32px]',
  md: 'px-4 py-2.5 min-h-[44px]',
  lg: 'px-6 py-3.5 min-h-[52px]',
} as const;

const variantClasses = {
  primary: 'bg-accent-primary active:bg-accent-primary/80',
  secondary: 'bg-surface-secondary active:bg-surface-secondary/80 border border-border-primary',
  ghost: 'bg-transparent active:bg-surface-secondary',
} as const;

const textVariantClasses = {
  primary: 'text-on-accent',
  secondary: 'text-content-primary',
  ghost: 'text-accent-primary',
} as const;

const Button = forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  function Button(
    { title, onPress, variant = 'primary', size = 'md', disabled = false, loading = false, accessibilityLabel },
    ref
  ) {
    return (
      <Pressable
        ref={ref}
        className={`flex-row items-center justify-center rounded-md ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? 'opacity-50' : ''}`}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: disabled || loading }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#FFFFFF' : '#205DC2'}
          />
        ) : (
          <Text
            className={`font-sans-semibold text-sm ${textVariantClasses[variant]}`}
          >
            {title}
          </Text>
        )}
      </Pressable>
    );
  }
);

export { Button };
export type { ButtonProps };
```

Note: props-only, no side effects, `forwardRef` for parent access, minimum 44px touch target via `min-h-[44px]`, accessibility role and state, NativeWind className only, loading state built in.

### Feature component -- IssueCard (features tier)

```tsx
// src/components/features/issue-card.tsx
import { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { PriorityIcon } from '@/components/features/priority-icon';
import { StatusBadge } from '@/components/features/status-badge';
import { formatRelativeTime } from '@/lib/format';
import type { Ref } from '@hcengineering/core';
import type { Issue } from '@hcengineering/tracker';

interface IssueCardProps {
  issue: Issue;
  onPress: (issue: Issue) => void;
}

function IssueCardInner({ issue, onPress }: IssueCardProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onPress(issue);
  }, [issue, onPress]);

  return (
    <Pressable
      className="bg-surface-secondary rounded-lg p-3 mb-2 active:opacity-80"
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Issue ${issue.identifier}: ${issue.title}`}
      accessibilityHint="Opens issue details"
    >
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center gap-2">
          <PriorityIcon priority={issue.priority} />
          <Text className="text-content-secondary text-xs font-sans-medium">
            {issue.identifier}
          </Text>
        </View>
        <StatusBadge status={issue.status} />
      </View>

      <Text
        className="text-content-primary text-sm font-sans-medium mb-2"
        numberOfLines={2}
      >
        {issue.title}
      </Text>

      <View className="flex-row items-center justify-between">
        {issue.assignee && (
          <Avatar
            name={issue.assignee.toString()}
            size={20}
          />
        )}
        <Text className="text-content-tertiary text-xs font-sans">
          {formatRelativeTime(issue.modifiedOn)}
        </Text>
      </View>
    </Pressable>
  );
}

const IssueCard = memo(IssueCardInner);

export { IssueCard };
export type { IssueCardProps };
```

Note: wrapped in `memo` because it is rendered inside FlashList (many instances), uses feature components and ui primitives, `useCallback` for press handler, `numberOfLines` for text truncation, no data fetching (receives `issue` via props).

### expo-image patterns

| Scenario | Pattern |
|---|---|
| User avatar | `<Image source={{ uri: avatarUrl }} style={{ width: 32, height: 32 }} contentFit="cover" recyclingKey={userId} />` |
| Attachment thumbnail | `<Image source={{ uri: thumbUrl }} className="w-full aspect-video rounded-md" contentFit="cover" placeholder={{ blurhash }} />` |
| Static image | `<Image source={require('@/assets/images/logo.png')} className="w-24 h-24" contentFit="contain" />` |

Always use `expo-image` instead of React Native's `Image` component. It provides caching, blurhash placeholders, and better memory management.

### Custom font usage

```tsx
// Fonts are loaded in the root layout via useFonts
// Then referenced in NativeWind via tailwind.config.ts:

// tailwind.config.ts
theme: {
  extend: {
    fontFamily: {
      sans: ['IBMPlexSans-Regular'],
      'sans-medium': ['IBMPlexSans-Medium'],
      'sans-semibold': ['IBMPlexSans-SemiBold'],
      'sans-bold': ['IBMPlexSans-Bold'],
    },
  },
}

// Usage in components:
<Text className="font-sans">Regular text</Text>
<Text className="font-sans-medium">Medium text</Text>
<Text className="font-sans-semibold">SemiBold text</Text>
<Text className="font-sans-bold">Bold text</Text>
```

## When

### Component tier decision tree

| Question | Answer | Tier |
|---|---|---|
| Does it accept only props and render UI? | Yes | `ui/` primitive |
| Does it use hooks or compose other components with logic? | Yes | `features/` |
| Is it used in only one route? | Yes | `app/_components/` |
| Is a route-specific component used in 2+ routes? | Promote | Move to `features/` |

### When to use `memo`

| Situation | Use `memo` |
|---|---|
| FlashList/FlatList `renderItem` component | Yes -- prevents re-renders of off-screen items |
| Component receiving stable props from a parent | No -- memo overhead > re-render cost |
| Component in a list of 3-5 items | No -- insignificant performance impact |
| Component receiving complex objects as props | Yes + ensure parent uses `useCallback`/`useMemo` |

### When to use `forwardRef`

| Situation | Use `forwardRef` |
|---|---|
| ui/ primitive that may need focus management | Yes -- `ref.current?.focus()` |
| Feature component | No -- features are not forwarded |
| Any component using `Pressable` or `TextInput` as root | Yes -- enables parent ref access |

### When to split a component

- File exceeds 150 lines
- Component has more than 5 conditional render branches
- A `View` block is repeated with different data
- Two developers would independently identify a reusable piece

## Never

### Multi-component files

```tsx
// WRONG -- two components in one file
export function IssueCard({ ... }) { ... }
export function IssueBadge({ ... }) { ... }

// RIGHT -- one component per file
// issue-card.tsx -> export { IssueCard }
// issue-badge.tsx -> export { IssueBadge }
```

### Default exports on non-route files

```tsx
// WRONG -- default export on a component
export default function IssueCard({ ... }) { ... }

// RIGHT -- named export
function IssueCard({ ... }: IssueCardProps): React.ReactNode { ... }
export { IssueCard };
```

### Data fetching in components

```tsx
// WRONG -- inline query in a component
import { useQuery } from '@tanstack/react-query';

function IssueCard({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => fetch(`/api/issues/${id}`),
  });
  // ...
}

// RIGHT -- use hook from src/hooks/
import { useIssue } from '@/hooks/use-issues';

// In the screen file:
const { data: issue } = useIssue(id);
// Pass data to component:
<IssueCard issue={issue} />
```

### Deep relative imports

```tsx
// WRONG
import { Button } from '../../../components/ui/button';

// RIGHT
import { Button } from '@/components/ui/button';
```

### Inline styles when Tailwind has it

```tsx
// WRONG -- inline style for something Tailwind handles
<View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>

// RIGHT -- NativeWind className
<View className="flex-row items-center p-4">
```

### Other anti-patterns

- **Max 150 lines per component file.** If larger, decompose into sub-components.
- **Never `any` in props.** Define explicit TypeScript interfaces.
- **Never use `StyleSheet.create` for layout.** NativeWind className for everything Tailwind can express. StyleSheet only for truly dynamic values computed at runtime.
- **Never put navigation logic in ui/ primitives.** Navigation belongs in features/ or route-specific components.
- **Never skip `accessibilityRole` on interactive elements.** Pressable, TouchableOpacity, and custom buttons all need it. See `references/accessibility.md`.
