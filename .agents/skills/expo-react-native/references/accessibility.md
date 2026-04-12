# Accessibility

## What

Every Huly mobile screen must be usable with VoiceOver (iOS) and TalkBack (Android). This means all interactive elements have labels, touch targets are large enough, focus order is logical, and the app works with Dynamic Type / font scaling. Huly's dark-first design must meet WCAG 2.1 AA contrast ratios for all text.

### Accessibility requirements table

| Requirement | Standard | Implementation |
|---|---|---|
| Touch target size | 44x44 points minimum | `min-h-[44px] min-w-[44px]` or Pressable hitSlop |
| Accessibility labels | All interactive elements | `accessibilityLabel` on every Pressable, button, icon |
| Accessibility roles | Correct semantic role | `accessibilityRole` matching element purpose |
| Accessibility state | Current state communicated | `accessibilityState` for disabled, selected, checked |
| Accessibility hints | Optional action description | `accessibilityHint` for non-obvious interactions |
| Focus order | Logical reading order | Default DOM order, `accessibilityViewIsModal` for modals |
| Dynamic Type | System font scaling support | Relative font sizes, flexible layouts |
| Color contrast | WCAG 2.1 AA (4.5:1 normal, 3:1 large) | Verified against Huly dark palette |
| Reduced motion | Respect system preference | `useReducedMotion()` from Reanimated |
| Screen reader announcements | Status changes announced | `AccessibilityInfo.announceForAccessibility()` |

### Huly dark palette contrast ratios

| Token pair | Foreground | Background | Ratio | Passes AA |
|---|---|---|---|---|
| content-primary on surface-primary | #FFFFFF | #161719 | 17.4:1 | Yes |
| content-secondary on surface-primary | #A1A5AD | #161719 | 7.5:1 | Yes |
| content-tertiary on surface-primary | #77818B | #161719 | 4.6:1 | Yes (large text only) |
| content-primary on surface-secondary | #FFFFFF | #1E1F23 | 15.8:1 | Yes |
| accent-primary on surface-primary | #205DC2 | #161719 | 3.8:1 | Large text only |
| on-accent on accent-primary | #FFFFFF | #205DC2 | 4.8:1 | Yes |
| status-error on surface-primary | #EF4444 | #161719 | 5.1:1 | Yes |
| status-success on surface-primary | #34D583 | #161719 | 8.9:1 | Yes |

**Note:** `content-tertiary` (#77818B) only passes for large text (18px+ regular or 14px+ bold). Use it for timestamps and captions only, never for primary readable content. `accent-primary` (#205DC2) as text on dark backgrounds only passes for large/bold text -- use it for buttons (which have white text on accent background) not for body text.

## How

### Pressable with full accessibility

```tsx
// Correct pattern for every interactive element
<Pressable
  className="flex-row items-center bg-surface-secondary rounded-lg p-3 min-h-[44px]"
  onPress={handlePress}
  accessibilityRole="button"
  accessibilityLabel={`Open issue ${issue.identifier}: ${issue.title}`}
  accessibilityHint="Opens the issue detail screen"
  accessibilityState={{ disabled: isLoading }}
  disabled={isLoading}
>
  <Text className="text-content-primary font-sans-medium">{issue.title}</Text>
</Pressable>
```

### Icon-only buttons

Icon-only buttons are invisible to screen readers without a label:

```tsx
// WRONG -- screen reader says nothing useful
<Pressable onPress={handleClose}>
  <Ionicons name="close" size={24} color="#FFFFFF" />
</Pressable>

// RIGHT -- screen reader says "Close"
<Pressable
  onPress={handleClose}
  accessibilityRole="button"
  accessibilityLabel="Close"
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  className="p-2 min-h-[44px] min-w-[44px] items-center justify-center"
>
  <Ionicons name="close" size={24} color="#FFFFFF" />
</Pressable>
```

### Accessibility roles reference

| Element | Role | Notes |
|---|---|---|
| Button / Pressable | `button` | Any tappable that triggers an action |
| Link / navigation | `link` | Tappable that navigates to another screen |
| TextInput | `none` (built-in) | RN TextInput has implicit role |
| Switch / Toggle | `switch` | `accessibilityState={{ checked: value }}` |
| Checkbox | `checkbox` | `accessibilityState={{ checked: value }}` |
| Image (informative) | `image` | Needs `accessibilityLabel` |
| Image (decorative) | `none` | `accessible={false}` to hide from tree |
| Header text | `header` | Section headers for navigation |
| Tab bar item | `tab` | `accessibilityState={{ selected: isActive }}` |
| Alert / status message | `alert` | Auto-announced by screen reader |
| Progress indicator | `progressbar` | `accessibilityValue={{ now, min, max }}` |

### List item accessibility

```tsx
// FlashList item with full accessibility
function IssueCard({ issue, onPress }: IssueCardProps): React.ReactNode {
  return (
    <Pressable
      className="bg-surface-secondary rounded-lg p-3 mb-2 min-h-[44px]"
      onPress={() => onPress(issue)}
      accessibilityRole="button"
      accessibilityLabel={
        `Issue ${issue.identifier}, ${issue.title}, ` +
        `priority ${getPriorityLabel(issue.priority)}, ` +
        `status ${getStatusLabel(issue.status)}`
      }
      accessibilityHint="Double tap to open issue details"
    >
      {/* Visual content -- screen reader uses the label above */}
      <View className="flex-row items-center justify-between">
        <Text className="text-content-primary font-sans-medium" numberOfLines={2}>
          {issue.title}
        </Text>
      </View>
    </Pressable>
  );
}
```

### Dynamic Type / font scaling

React Native respects system font size settings by default. Ensure layouts accommodate larger text:

```tsx
// Flexible layout that works with scaled fonts
<View className="flex-row items-center p-3 min-h-[44px]">
  <View className="flex-1 mr-3">
    <Text
      className="text-base font-sans-medium text-content-primary"
      numberOfLines={3}                   // Allow wrapping for larger text
      adjustsFontSizeToFit={false}        // Do NOT shrink -- respect user preference
    >
      {issue.title}
    </Text>
  </View>
  <Badge status={issue.status} />
</View>
```

**Test with font scaling:** iOS Settings > Accessibility > Display & Text Size > Larger Text. Android Settings > Display > Font size.

### Focus management in modals

```tsx
// Modal with proper focus management
import { useRef, useEffect } from 'react';
import { View, Text, AccessibilityInfo, findNodeHandle } from 'react-native';

function IssueCreateModal(): React.ReactNode {
  const titleInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Move focus to title input when modal opens
    const timer = setTimeout(() => {
      if (titleInputRef.current) {
        const node = findNodeHandle(titleInputRef.current);
        if (node) {
          AccessibilityInfo.setAccessibilityFocus(node);
        }
      }
    }, 500); // Delay for modal animation to complete
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      className="flex-1 bg-surface-primary"
      accessibilityViewIsModal={true}    // Restricts VoiceOver to modal content
    >
      <Text
        className="text-xl font-sans-bold text-content-primary px-4 pt-4"
        accessibilityRole="header"
      >
        New Issue
      </Text>
      <TextInput
        ref={titleInputRef}
        className="bg-surface-tertiary text-content-primary mx-4 mt-4 p-3 rounded-md"
        placeholder="Issue title"
        accessibilityLabel="Issue title"
      />
    </View>
  );
}
```

### Reduced motion support

```tsx
import { useReducedMotion } from 'react-native-reanimated';

function AnimatedCard({ children }: { children: React.ReactNode }): React.ReactNode {
  const reducedMotion = useReducedMotion();

  // Skip animation if user prefers reduced motion
  const animationDuration = reducedMotion ? 0 : 300;

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(animationDuration)}
    >
      {children}
    </Animated.View>
  );
}
```

### Screen reader announcements

```typescript
import { AccessibilityInfo } from 'react-native';

// Announce after mutation completes
function handleIssueCreated(identifier: string): void {
  AccessibilityInfo.announceForAccessibility(`Issue ${identifier} created successfully`);
  router.back();
}

// Announce loading state changes
function handleRefreshComplete(count: number): void {
  AccessibilityInfo.announceForAccessibility(`Refreshed. ${count} issues loaded.`);
}
```

### Touch target sizing

```tsx
// Minimum 44x44 touch target -- three approaches:

// 1. Padding on the element itself
<Pressable className="p-3 min-h-[44px] min-w-[44px]" onPress={handlePress}>
  <Ionicons name="add" size={20} />
</Pressable>

// 2. hitSlop for invisible touch expansion
<Pressable
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  onPress={handlePress}
>
  <Ionicons name="add" size={20} />
</Pressable>

// 3. Wrapper with minimum dimensions
<View className="min-h-[44px] min-w-[44px] items-center justify-center">
  <Pressable onPress={handlePress}>
    <Ionicons name="add" size={20} />
  </Pressable>
</View>
```

Approach 1 (padding) is preferred. It makes the touch target visible during development and does not require invisible expansion.

## When

### When to use accessibilityLabel vs accessibilityHint

| Prop | Purpose | Example |
|---|---|---|
| `accessibilityLabel` | **What** the element is | "Close button", "Issue HULY-123" |
| `accessibilityHint` | **What happens** when you interact | "Closes the modal", "Opens issue details" |

Labels are required on every interactive element. Hints are optional and should only be added when the action is not obvious from the label.

### When to hide elements from screen readers

| Element | Action |
|---|---|
| Decorative icon next to labeled text | `accessible={false}` on icon |
| Background image | `accessible={false}` |
| Redundant text inside an accessible parent | Group with `accessibilityLabel` on parent |
| Animated decorations | `accessible={false}` |

### When to use accessibilityViewIsModal

- Full-screen modals: always
- Bottom sheets: always
- Alert dialogs: always
- Dropdown menus: usually (prevents VoiceOver from reaching behind)

## Never

- **Never ship an interactive element without an accessibility label.**

```tsx
// WRONG -- button with no label
<Pressable onPress={handleDelete}>
  <Ionicons name="trash" size={20} />
</Pressable>

// RIGHT
<Pressable
  onPress={handleDelete}
  accessibilityRole="button"
  accessibilityLabel="Delete issue"
  className="min-h-[44px] min-w-[44px] items-center justify-center"
>
  <Ionicons name="trash" size={20} color="#EF4444" />
</Pressable>
```

- **Never use touch targets smaller than 44x44 points.** Apple and Google both mandate this minimum.

- **Never disable font scaling.** Users who increase system font size need it for medical reasons.

```tsx
// WRONG
<Text allowFontScaling={false}>Important text</Text>
<Text adjustsFontSizeToFit={true}>Shrinks to fit</Text>

// RIGHT
<Text numberOfLines={2}>Important text</Text>
```

- **Never use color alone to convey meaning.**

```tsx
// WRONG -- status only indicated by color
<View className="w-3 h-3 rounded-full bg-status-error" />

// RIGHT -- color + icon + label
<View className="flex-row items-center gap-1">
  <View className="w-3 h-3 rounded-full bg-status-error" />
  <Text className="text-xs text-status-error font-sans-medium">Blocked</Text>
</View>
```

- **Never forget `accessibilityViewIsModal` on modal screens.** Without it, VoiceOver can navigate to elements behind the modal.
- **Never use `accessibilityElementsHidden` on visible content.** Only use on truly hidden overlapping views.
- **Never skip testing with VoiceOver/TalkBack.** Automated tools catch some issues but miss navigation flow, focus order, and announcement quality.
