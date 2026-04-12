# Styling -- NativeWind v4 + Tailwind v3

## What

The Huly mobile app uses NativeWind v4 with Tailwind CSS v3 for all styling. NativeWind compiles Tailwind classes into React Native StyleSheet objects at build time, enabling the `className` prop on all React Native components. The design system mirrors Huly's web app: dark-mode first, IBM Plex Sans typography, and a consistent color palette derived from Huly's SCSS variables.

### Locked styling decisions

| Decision | Choice | Why |
|---|---|---|
| Styling framework | NativeWind v4 + Tailwind v3 | className on RN, design tokens, dark mode |
| Tailwind version | v3 (NOT v4) | NativeWind v4 requires Tailwind v3 |
| Dark mode strategy | `darkMode: 'class'` | Matches Huly's dark-first web UI |
| Font family | IBM Plex Sans (Regular, Medium, SemiBold, Bold) | Matches Huly web app |
| Color system | Semantic tokens (surface, content, accent, border) | Consistent across light/dark |
| Spacing scale | Default Tailwind + Huly-specific additions | 4px base unit |
| Border radius | Huly-specific tokens (sm, md, lg) | Matches web card radii |

### NativeWind v4 setup files

All four files must be configured. Missing any one silently breaks `className` support.

| File | Role |
|---|---|
| `metro.config.js` | `withNativeWind()` wrapper with global.css input |
| `babel.config.js` | `nativewind/babel` plugin |
| `tailwind.config.ts` | Content paths, `nativewind/preset`, Huly tokens |
| `global.css` | `@tailwind base/components/utilities` directives |
| `nativewind-env.d.ts` | TypeScript `className` prop type declarations |

## How

### Complete tailwind.config.ts with Huly design tokens

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      // ----- Colors: Huly semantic palette -----
      colors: {
        // Surface backgrounds
        surface: {
          primary: '#161719',         // Main background (dark)
          secondary: '#1E1F23',       // Card / elevated surface
          tertiary: '#2D2E33',        // Input background, dividers
          overlay: 'rgba(0, 0, 0, 0.6)', // Modal overlays
        },
        // Text / content
        content: {
          primary: '#FFFFFF',         // Primary text
          secondary: '#A1A5AD',       // Secondary text, labels
          tertiary: '#77818B',        // Placeholder, muted text
          disabled: '#4E535B',        // Disabled text
        },
        // Accent / brand
        accent: {
          primary: '#205DC2',         // Huly blue -- buttons, links, active
          'primary-hover': '#2B6FD9', // Hover / pressed state
          secondary: '#2C6FDB',       // Secondary accent
          subtle: 'rgba(32, 93, 194, 0.15)', // Accent background tint
        },
        // Status
        status: {
          success: '#34D583',         // Green -- completed, active
          warning: '#FACC15',         // Yellow -- warnings, caution
          error: '#EF4444',           // Red -- errors, blockers
          info: '#3B82F6',            // Blue -- informational
        },
        // Warning-specific
        warning: {
          subtle: 'rgba(250, 204, 21, 0.15)',
          text: '#FACC15',
        },
        // Border
        border: {
          primary: '#2D2E33',         // Default border
          secondary: '#3D3F47',       // Emphasized border
          accent: '#205DC2',          // Focused input border
        },
        // Issue priority colors
        priority: {
          urgent: '#FF5630',          // P1 - urgent
          high: '#FF8B00',            // P2 - high
          medium: '#FACC15',          // P3 - medium
          low: '#36B37E',             // P4 - low
        },
        // On-accent (text on colored backgrounds)
        'on-accent': '#FFFFFF',
      },

      // ----- Typography -----
      fontFamily: {
        sans: ['IBMPlexSans-Regular'],
        'sans-medium': ['IBMPlexSans-Medium'],
        'sans-semibold': ['IBMPlexSans-SemiBold'],
        'sans-bold': ['IBMPlexSans-Bold'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '16px' }],
        'sm': ['13px', { lineHeight: '18px' }],
        'base': ['14px', { lineHeight: '20px' }],
        'md': ['15px', { lineHeight: '22px' }],
        'lg': ['17px', { lineHeight: '24px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },

      // ----- Spacing (extends default 4px scale) -----
      spacing: {
        '0.5': '2px',
        '1.5': '6px',
        '2.5': '10px',
        '3.5': '14px',
        '4.5': '18px',
        '18': '72px',
        '22': '88px',
      },

      // ----- Border radius -----
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },

      // ----- Shadows (iOS) / Elevation (Android) -----
      // NativeWind maps shadow classes to both platforms
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'elevated': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'modal': '0 8px 24px rgba(0, 0, 0, 0.5)',
      },

      // ----- Opacity -----
      opacity: {
        '8': '0.08',
        '15': '0.15',
        '85': '0.85',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### metro.config.js (NativeWind integration)

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// See references/metro-monorepo.md for full Rush monorepo config
module.exports = withNativeWind(config, { input: './global.css' });
```

### babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

### global.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom base styles for Huly */
@layer base {
  /* Ensure all Text inherits Huly font */
}
```

### nativewind-env.d.ts

```typescript
/// <reference types="nativewind/types" />
```

### Dark mode with NativeWind

NativeWind uses `darkMode: 'class'` which reads the device color scheme via `useColorScheme()`. Huly is dark-mode first, so the primary tokens above are for dark mode. Light mode overrides use the `dark:` prefix inverted -- since Huly defaults to dark, define light-mode colors with explicit class toggling.

```tsx
// All Huly tokens are dark-mode values by default.
// When the app supports light mode, override with NativeWind dark: variant:

<View className="bg-white dark:bg-surface-primary">
  <Text className="text-gray-900 dark:text-content-primary">
    Reads device theme
  </Text>
</View>

// For Huly's dark-first approach, components use dark tokens directly:
<View className="bg-surface-primary">
  <Text className="text-content-primary">Always dark theme</Text>
</View>
```

### Platform-specific styles

NativeWind supports `ios:` and `android:` prefixes:

```tsx
<View className="p-4 ios:pt-0 android:pt-2">
  <Text className="text-base ios:text-lg">
    Platform-adjusted text
  </Text>
</View>
```

For more complex platform differences:

```tsx
import { Platform } from 'react-native';

<View className={Platform.select({
  ios: 'shadow-card',         // iOS uses shadow
  android: 'elevation-2',    // Android uses elevation
  default: 'shadow-card',
})}>
```

### Custom font integration

Fonts are loaded in the root layout and mapped in `tailwind.config.ts`:

```tsx
// app/_layout.tsx
import { useFonts } from 'expo-font';

const [fontsLoaded] = useFonts({
  'IBMPlexSans-Regular': require('../assets/fonts/IBMPlexSans-Regular.ttf'),
  'IBMPlexSans-Medium': require('../assets/fonts/IBMPlexSans-Medium.ttf'),
  'IBMPlexSans-SemiBold': require('../assets/fonts/IBMPlexSans-SemiBold.ttf'),
  'IBMPlexSans-Bold': require('../assets/fonts/IBMPlexSans-Bold.ttf'),
});
```

Usage throughout the app:

```tsx
<Text className="font-sans text-base text-content-primary">Regular body</Text>
<Text className="font-sans-medium text-sm text-content-secondary">Medium label</Text>
<Text className="font-sans-semibold text-lg text-content-primary">SemiBold heading</Text>
<Text className="font-sans-bold text-xl text-content-primary">Bold title</Text>
```

### Responsive utilities

NativeWind supports Tailwind breakpoints via screen dimensions (not CSS media queries):

```tsx
// Tablet-aware layout
<View className="flex-col md:flex-row">
  <View className="w-full md:w-1/3">Sidebar</View>
  <View className="w-full md:w-2/3">Content</View>
</View>
```

NativeWind breakpoints in React Native correspond to device width:
- `sm`: 640px (large phones in landscape)
- `md`: 768px (tablets)
- `lg`: 1024px (large tablets, iPads in landscape)

### Common Huly component patterns

```tsx
// Card with Huly styling
<View className="bg-surface-secondary rounded-lg p-3 border border-border-primary">
  {/* content */}
</View>

// Divider
<View className="h-px bg-border-primary mx-4" />

// Section header
<Text className="text-xs font-sans-semibold text-content-tertiary uppercase tracking-wide px-4 py-2">
  Section Title
</Text>

// Input field
<TextInput
  className="bg-surface-tertiary text-content-primary font-sans text-base rounded-md px-3 py-2.5 border border-border-primary focus:border-accent-primary"
  placeholderTextColor="#77818B"
  placeholder="Enter text..."
/>

// Active/selected state
<Pressable className="bg-accent-subtle border border-accent-primary rounded-md p-3">
  <Text className="text-accent-primary font-sans-medium">Selected item</Text>
</Pressable>
```

## When

### When to use NativeWind className vs inline styles

| Situation | Use |
|---|---|
| Static layout (padding, margin, flex, border) | `className` always |
| Static colors (backgrounds, text, borders) | `className` with design tokens |
| Dynamic values computed at runtime | `style` prop (e.g., `style={{ height: animatedValue }}`) |
| Animated values from Reanimated | `useAnimatedStyle` -- cannot use className |
| Platform-specific adjustments | `className` with `ios:` / `android:` prefix |

### When to use which text size

| Context | Class | Font size |
|---|---|---|
| Screen title | `text-xl font-sans-bold` | 20px |
| Section heading | `text-lg font-sans-semibold` | 17px |
| Body text | `text-base font-sans` | 14px |
| Secondary label | `text-sm font-sans text-content-secondary` | 13px |
| Caption / timestamp | `text-xs font-sans text-content-tertiary` | 11px |

### When to create a new design token

- When a color appears in 3+ components and does not map to an existing semantic token
- When a spacing value is used consistently but is not in the default 4px scale
- When a new Huly feature introduces a distinct visual pattern (e.g., new status colors)

**Do not create tokens for one-off values.** Use Tailwind arbitrary values: `bg-[#FF5630]` for truly unique cases.

## Never

- **Never use inline styles when NativeWind can express it.**

```tsx
// WRONG
<View style={{ flexDirection: 'row', padding: 16, backgroundColor: '#161719' }}>

// RIGHT
<View className="flex-row p-4 bg-surface-primary">
```

- **Never use hardcoded color values in className.**

```tsx
// WRONG -- hardcoded hex in className
<Text className="text-[#FFFFFF]">

// RIGHT -- semantic token
<Text className="text-content-primary">
```

- **Never use `StyleSheet.create` for static layouts.**

```tsx
// WRONG
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
});

// RIGHT
<View className="flex-1 p-4">
  <Text className="text-xl font-sans-bold text-content-primary">
```

- **Never forget the `dark:` variant when adding light-mode support.** If Huly adds light mode, every color class needs both variants.

- **Never use physical padding/margin properties.**

```tsx
// WRONG -- breaks RTL
<View className="pl-4 mr-2">

// RIGHT -- NativeWind maps these correctly, but prefer consistent usage
<View className="ps-4 me-2">
```

Note: React Native does not have true RTL concerns like web CSS, but using logical properties (start/end) is a good habit for future-proofing if Huly adds RTL language support.

- **Never use `fontWeight` with IBM Plex Sans.** React Native does not support font weight mapping. Use the explicit font family variant.

```tsx
// WRONG -- fontWeight may not map to correct font file
<Text style={{ fontWeight: '600' }}>SemiBold</Text>
<Text className="font-semibold">SemiBold</Text>

// RIGHT -- explicit font family
<Text className="font-sans-semibold">SemiBold</Text>
```

- **Never import Tailwind v4.** NativeWind v4 specifically requires Tailwind CSS v3. Upgrading Tailwind to v4 breaks the entire NativeWind build pipeline.
- **Never skip the `nativewind-env.d.ts` file.** Without it, TypeScript does not recognize the `className` prop on React Native components.
- **Never use `rem` units in React Native.** Tailwind translates rem to px via NativeWind, but explicit px values in custom config prevent confusion. Define fontSize as `'14px'`, not `'0.875rem'`.
