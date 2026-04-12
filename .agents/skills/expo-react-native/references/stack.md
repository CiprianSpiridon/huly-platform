# Stack -- Locked Decisions & Build Toolchain

Every other reference file assumes these decisions. Do not deviate.

## What

| Dependency | Version | Notes |
|---|---|---|
| Expo SDK | 55 | Managed workflow. No bare workflow. |
| React Native | 0.83.1 | New Architecture enabled by default |
| React | 19.2.0 | Concurrent features, `use()` hook |
| TypeScript | 5.9+ | Strict mode, no `any` |
| expo-router | v6 | File-based routing under `app/` |
| NativeWind | v4 | `className` on RN components directly |
| Tailwind CSS | v3 | Stable. Not v4 (NativeWind v4 requires Tailwind v3). |
| Zustand | 5.x | Client state only |
| TanStack Query | v5 | Server state only |
| expo-secure-store | latest SDK 55 | Token storage |
| Hermes | default | JS engine on both platforms |
| Rush | monorepo | App lives at `mobile/`, workspace:^ deps |

### Core runtime choices

| Concern | Choice | Why |
|---|---|---|
| Navigation | expo-router v6 | File-based, typed routes, deep linking built-in |
| Styling | NativeWind v4 + Tailwind v3 | className on RN, dark mode, design tokens |
| Client state | Zustand | Lightweight, no boilerplate, works outside React tree |
| Server state | TanStack Query v5 | Cache, retry, staleTime, mutations, offline |
| Auth tokens | expo-secure-store | Encrypted keychain/keystore, not AsyncStorage |
| HTTP client | @hcengineering/api-client | PlatformClient with findAll/createDoc/updateDoc |
| Auth client | @hcengineering/account-client | AccountClient with login/selectWorkspace |
| Lists | @shopify/flash-list | RecyclerView on Android, better than FlatList |
| Images | expo-image | Blurhash, caching, proper sizing |
| Animations | react-native-reanimated v3 | UI thread worklets |
| Fonts | IBM Plex Sans | Matches Huly web app |
| Dark mode | NativeWind useColorScheme | Dark-first, matches Huly web UI |

## How

### tsconfig.json -- complete template

```jsonc
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "moduleResolution": "bundler",
    "module": "esnext",
    "target": "esnext",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@app/*": ["./app/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts",
    "nativewind-env.d.ts"
  ],
  "exclude": ["node_modules"]
}
```

`noUncheckedIndexedAccess` is non-negotiable. Without it, array access and record lookups hide real `undefined` bugs.

### app.json -- complete template

```json
{
  "expo": {
    "name": "Huly",
    "slug": "huly-mobile",
    "version": "1.0.0",
    "scheme": "huly",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#161719"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.huly.mobile",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Huly needs camera access to attach photos to issues",
        "NSPhotoLibraryUsageDescription": "Huly needs photo library access to attach images",
        "NSFaceIDUsageDescription": "Huly uses Face ID to protect your account"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#161719"
      },
      "package": "com.huly.mobile",
      "versionCode": 1,
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE"]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      ["expo-camera", { "cameraPermission": "Huly needs camera access to attach photos" }],
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#205DC2"
      }]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "eas": { "projectId": "your-eas-project-id" },
      "router": { "origin": "https://app.huly.io" }
    }
  }
}
```

**Scheme `huly`** enables deep links: `huly://workspace/tracker/ISSUE-123`. See `references/routing.md`.

**`newArchEnabled: true`** -- SDK 55 enables New Architecture by default. Do not disable.

**`userInterfaceStyle: "automatic"`** -- respects device dark/light setting. NativeWind reads this.

### NativeWind v4 setup

Four files must be configured together. Missing any one silently breaks className support.

**metro.config.js:**
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

**babel.config.js:**
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

**tailwind.config.ts:**
```typescript
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
      // See references/styling.md for full Huly design tokens
    },
  },
  plugins: [],
} satisfies Config;
```

**global.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**nativewind-env.d.ts:**
```typescript
/// <reference types="nativewind/types" />
```

### Environment variables

| Prefix | Visibility | Example |
|---|---|---|
| `EXPO_PUBLIC_` | Bundled into JS -- visible to users | `EXPO_PUBLIC_HULY_URL` |
| _(none)_ | Build-time only -- EAS secrets, CI | `SENTRY_AUTH_TOKEN` |

**Rules:**
- Never prefix a secret with `EXPO_PUBLIC_` -- it ships in the JS bundle.
- Access via `process.env.EXPO_PUBLIC_HULY_URL` (inlined at build).
- Use EAS Secrets for signing keys, API secrets, tokens that must not be in source.
- `.env.local` is gitignored. `.env` is committed with non-secret defaults only.

### Build validation pipeline

Run in this order. Fail fast -- do not continue if a step fails.

```bash
# 1. Lint
npx eslint . --ext .ts,.tsx

# 2. Typecheck
npx tsc --noEmit

# 3. Expo doctor (SDK compatibility)
npx expo-doctor

# 4. Test
npx jest --passWithNoTests

# 5. Dev server smoke test
npx expo start --no-dev --minify
```

**Before any EAS build:** always run `npx expo-doctor` to catch version mismatches, missing native modules, and config plugin issues.

## When

### When to use New Architecture vs Legacy

| Situation | Use |
|---|---|
| Default for SDK 55 | New Architecture (enabled) |
| Third-party native module not yet compatible | Temporarily disable with `newArchEnabled: false` in app.json, file issue upstream |
| Performance-critical native views | New Architecture (Fabric renderer) |
| Bridgeless mode | New Architecture (default in SDK 55) |

### React 19.2 features available in React Native

| Feature | Available | Notes |
|---|---|---|
| `use()` hook | Yes | Unwrap promises and context |
| `useActionState` | No | Web form actions only |
| `useOptimistic` | Yes | Optimistic UI for mutations |
| Server Components | No | RN is fully client-side |
| React Compiler | Experimental | Not yet stable for RN -- keep manual memo |

**Keep `React.memo`, `useMemo`, `useCallback`** -- the React Compiler is not yet stable for React Native. Remove them only when React Compiler graduates to stable for RN.

## Never

- **No bare workflow.** Managed Expo only. Config plugins for native customization.
- **No `@react-navigation` direct imports.** Use expo-router which wraps it. See `references/routing.md`.
- **No Tailwind v4.** NativeWind v4 requires Tailwind v3. Do not upgrade Tailwind independently.
- **No StyleSheet.create for layout.** Use NativeWind className. See `references/styling.md`.
- **No AsyncStorage for tokens.** Use expo-secure-store. See `references/auth.md`.
- **No `any` in TypeScript.** Use `unknown` with type guards. Enable `strict: true`.
- **No skipping expo-doctor.** Run before every EAS build.
- **No Pages Router / getServerSideProps patterns.** This is React Native, not Next.js. No SSR.
- **No inline fetch in screens.** All data goes through repositories. See `references/data-client-pattern.md`.
- **No hardcoded colors.** Use Tailwind design tokens from `references/styling.md`.
- **No Node.js builtins in mobile code.** No `fs`, `path`, `crypto` (Node), `http`, `stream`. See `references/metro-monorepo.md`.
- **No disabling New Architecture** unless a specific native module requires it temporarily.
- **No `expo install --fix` without checking** what it changes. Review version bumps.
