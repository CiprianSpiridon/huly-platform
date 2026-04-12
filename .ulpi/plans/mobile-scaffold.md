# Mobile App Scaffold

## Context

Create the `/mobile/` directory in the Huly Platform monorepo with a working Expo SDK 55 project, NativeWind v4 + Tailwind v3 styling, Huly design tokens, IBM Plex Sans fonts, and `@hcengineering/*` package dependencies wired through Rush. The goal is a bootable Expo app that renders a placeholder screen with Huly's look and feel, ready for feature work.

## Stack (locked)

| Dependency | Version | Notes |
|---|---|---|
| Expo SDK | 55 (`expo@~55.0.0`) | Managed workflow |
| React Native | 0.83.1 | Bundled with SDK 55 |
| React | 19.2.0 | |
| expo-router | v6 | File-based routing |
| NativeWind | 4.x (`nativewind@^4.1.0`) | Stable, className on RN components |
| Tailwind CSS | 3.x (`tailwindcss@^3.4.17`) | JS config, mature |
| TypeScript | 5.9+ | `strict: true` |
| Client state | Zustand | |
| Server state | TanStack Query | (wired later, not in scaffold) |
| Token storage | expo-secure-store | (wired later) |

## Mode

- **Planning mode:** HOLD (10 tasks including shared package)
- **Default review:** claude
- **Non-goals:** Auth flow, API client, screens, WebSocket, push notifications, file uploads

## Prerequisites

- Node.js 20+
- Rush monorepo at `/Users/ciprian/work_cip/huly-platform`
- Branch: `react-native-app`

## Existing Code to Reuse

- `packages/theme/styles/_colors.scss` (31KB) — 625+ CSS color variables
- `packages/theme/styles/_vars.scss` (2.1KB) — spacing, border radius, shadows
- `packages/ui/src/colors.ts` — 24-color avatar palette, named colors
- `packages/theme/fonts/complete/woff2/` — IBM Plex Sans (woff2 only, need TTF)
- `rush.json` — 481 existing projects, desktop pattern to follow

## Dependency Safety Notes

**Plugin type packages (`tracker`, `task`, `chunter`, `contact`, `notification`, `activity`) all depend on `@hcengineering/ui` which depends on `svelte@^4.2.20`.** The imports are effectively type aliases (`AnyComponent = Resource<string>`), but some use `import` not `import type`, so Metro will try to resolve the full `@hcengineering/ui` → svelte chain.

**Mitigation for scaffold:** Do NOT add plugin packages as runtime dependencies yet. Only add `@hcengineering/core` and `@hcengineering/platform` (both clean). Plugin type packages will be added later with proper Metro `resolver.blockList` for svelte, and all imports converted to `import type`.

**`@hcengineering/api-client`** transitively pulls `@hcengineering/text` → `@tiptap/*` (rich text editor) and `@hcengineering/client-resources` → `snappyjs`. Not scaffold-safe. Defer to API client wiring task.

**Scaffold-safe packages:**
- `@hcengineering/core` — pure TS types (deps: platform, analytics, measurements, fast-equals)
- `@hcengineering/platform` — pure TS (deps: intl-messageformat)

## Conventions

- `app/` — expo-router routes only, no transport logic
- `src/client/` — API, auth, socket adapters
- `src/repositories/` — domain data access
- `src/hooks/` — screen-safe hooks
- `src/store/` — zustand client state only
- `src/components/ui/` — primitives, no data fetching
- `src/components/features/` — reusable feature widgets
- `src/lib/` — pure helpers, formatters
- `src/theme/` — design tokens as plain JS objects (extractable)
- No direct API calls in route files
- No tokens in AsyncStorage — use expo-secure-store
- expo-router owns navigation, no parallel route state

## Extraction-Ready Architecture

Primitives in `src/components/ui/` and tokens in `src/theme/` must be structured for later promotion into shared Rush packages (e.g., `packages/ui-native/`, `packages/theme-tokens/`). Rules:

1. **`src/components/ui/` is self-contained.** No imports from `src/store/`, `src/client/`, `src/hooks/`, `src/repositories/`, or `app/`. Only imports from `src/theme/`, `src/lib/`, and other `ui/` components.
2. **`src/theme/tokens.ts` exports Huly design tokens as plain JS objects** — colors, spacing, radii, typography, avatar palette. `tailwind.config.ts` imports FROM `tokens.ts`, not the other way around. This lets non-Tailwind consumers (shared packages, tests, future web components) use the same tokens.
3. **Primitives are props-only.** No React context, no global state, no navigation. Data in through props, events out through callbacks.
4. **One component per file, named export, max 150 lines.** Same rule as web components — makes extraction mechanical (move file, update imports).

---

## Tasks

### TASK-001: Init Expo project
- **Type:** scaffold
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none
- **writeScope:** `mobile/`
- **Description:** Run `npx create-expo-app@latest mobile --template default@sdk-55` from repo root. Strip template boilerplate (example tabs, tutorial screens). Keep root `_layout.tsx` and a single `index.tsx`. Verify `npx expo start` launches clean.
- **Acceptance Criteria:**
  1. `mobile/package.json` contains `"expo": "~55.0.0"` and `"react-native": "0.83.1"`
  2. `npx expo start` launches without errors
  3. Template boilerplate removed — single root layout + one placeholder screen

### TASK-002: Register in rush.json
- **Type:** config
- **Priority:** P1
- **Effort:** XS
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-001
- **writeScope:** `rush.json`, `mobile/package.json`
- **Description:** Set `mobile/package.json` name to `@hcengineering/mobile`. Add entry to `rush.json` with `shouldPublish: false`, matching the desktop pattern. Run `rush update`.
- **Acceptance Criteria:**
  1. `rush.json` has `{ "packageName": "@hcengineering/mobile", "projectFolder": "mobile", "shouldPublish": false }`
  2. `rush update` completes without errors
  3. `rush build -t @hcengineering/mobile` runs (no-op is fine)

### TASK-003: Add scaffold-safe Huly dependencies
- **Type:** config
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-002
- **writeScope:** `mobile/package.json`
- **Description:** Add ONLY scaffold-safe `workspace:^` dependencies. Plugin packages (tracker, chunter, etc.) depend on `@hcengineering/ui` → `svelte` and are NOT safe for Metro without blockList config. `api-client` pulls `@tiptap/*` transitively. These will be added in a separate task with proper Metro exclusions.
- **Scaffold-safe packages (runtime deps):**
  - `@hcengineering/core` — base types (Doc, Ref, Tx, etc.)
  - `@hcengineering/platform` — plugin system, IntlString, PlatformError
- **Deferred to API client wiring task:**
  - `@hcengineering/account-client` (safe in isolation, but pair with api-client)
  - `@hcengineering/api-client` (pulls text, tiptap, client-resources, snappyjs)
  - `@hcengineering/tracker`, `task`, `chunter`, `contact`, `notification`, `activity` (all pull `@hcengineering/ui` → `svelte`)
- **Acceptance Criteria:**
  1. `@hcengineering/core` and `@hcengineering/platform` in dependencies with `workspace:^`
  2. `rush update` resolves without errors
  3. `import type { Doc, Ref } from '@hcengineering/core'` compiles in a test file
  4. Metro bundler does NOT encounter svelte, tiptap, or Node.js module errors

### TASK-004: Install and configure NativeWind v4
- **Type:** config
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-003 (shared write to mobile/package.json — must sequence)
- **writeScope:** `mobile/package.json`, `mobile/tailwind.config.ts`, `mobile/global.css`, `mobile/metro.config.js`, `mobile/babel.config.js`
- **Description:** Install stable NativeWind v4 stack:
  - `nativewind@^4.1.0`
  - `tailwindcss@^3.4.17`
  - `react-native-reanimated`
  - `react-native-safe-area-context`
  - `prettier-plugin-tailwindcss`

  Create `tailwind.config.ts` with `nativewind/preset`, content paths `["./src/**/*.{ts,tsx}"]`.
  Create `global.css` with `@tailwind base; @tailwind components; @tailwind utilities;`.
  Update `metro.config.js` with `withNativeWind(config, { input: './global.css' })`.
  Update `babel.config.js` with `nativewind/babel` preset.
- **Acceptance Criteria:**
  1. `className="bg-red-500 text-white p-4"` renders correctly on View/Text
  2. `metro.config.js` uses `withNativeWind` wrapper
  3. `dark:bg-black` applies when colorScheme is dark

### TASK-005: Configure metro for monorepo
- **Type:** config
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-003, TASK-004
- **writeScope:** `mobile/metro.config.js`
- **Description:** Extend metro.config.js to resolve `@hcengineering/*` workspace packages:
  - Add monorepo root to `watchFolders`
  - Add `common/temp/node_modules` to `nodeModulesPaths`
  - Ensure single React instance (no duplicates)
  - Block server-only modules from leaking into Metro
  - **Configure `resolver.resolverMainFields` to `["react-native", "browser", "main"]` (exclude `"svelte"`)** — every `@hcengineering/*` foundation package has a `"svelte": "src/index.ts"` field in package.json. Without this, Metro may resolve raw `.ts` source instead of compiled `lib/` output.

  Per metro-monorepo.md convention: no importing server packages, no duplicate React, explicit watch folders.
- **Acceptance Criteria:**
  1. `import { type Doc } from '@hcengineering/core'` resolves in Metro
  2. No "duplicate React" or module resolution errors
  3. Hot reload works on `mobile/` file changes

### TASK-006a: Create @hcengineering/mobile-design-tokens shared package
- **Type:** scaffold
- **Priority:** P1
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-002 (shared write to rush.json — must sequence after TASK-002)
- **writeScope:** `packages/mobile-design-tokens/package.json`, `packages/mobile-design-tokens/tsconfig.json`, `packages/mobile-design-tokens/src/colors.ts`, `packages/mobile-design-tokens/src/spacing.ts`, `packages/mobile-design-tokens/src/typography.ts`, `packages/mobile-design-tokens/src/radii.ts`, `packages/mobile-design-tokens/src/avatars.ts`, `packages/mobile-design-tokens/src/shadows.ts`, `packages/mobile-design-tokens/src/index.ts`, `rush.json`
- **Source files to read:**
  - `packages/theme/styles/_colors.scss` — 625+ CSS color variables
  - `packages/theme/styles/_vars.scss` — spacing, border radius, shadows
  - `packages/ui/src/colors.ts` — 24-color avatar palette, named colors
- **Description:** Create `packages/mobile-design-tokens/` as a shared Rush package (`@hcengineering/mobile-design-tokens`). Zero dependencies — plain TypeScript objects only. This is the canonical source of truth for Huly's visual language, consumable by mobile (via tailwind.config.ts), desktop (future RN-macos), and eventually web (replacing SCSS variables).

  Register in `rush.json` with `shouldPublish: true`.

  **Structure:**
  ```
  packages/mobile-design-tokens/
  ├── src/
  │   ├── colors.ts       ← dark/light theme palettes, primary, surface, status, divider, overlays
  │   ├── spacing.ts      ← 2px→120px scale matching --spacing-* vars
  │   ├── typography.ts   ← font families, sizes (11-20px), weights (400-700), line heights
  │   ├── radii.ts        ← xs=2px, sm=4px, md=8px, lg=16px
  │   ├── shadows.ts      ← popover, modal, card, accent shadows (dark + light)
  │   ├── avatars.ts      ← 24-color avatar palette (dark + light variants)
  │   └── index.ts        ← barrel export
  ├── package.json        ← @hcengineering/mobile-design-tokens, zero deps
  └── tsconfig.json
  ```

  Port values from SCSS. Every export is a plain `as const` object — no runtime code, no framework imports.
- **Acceptance Criteria:**
  1. `rush.json` has `@hcengineering/mobile-design-tokens` entry
  2. `rush update && rush build -t @hcengineering/mobile-design-tokens` succeeds
  3. `import { colors, spacing } from '@hcengineering/mobile-design-tokens'` works from any Rush package
  4. Package has zero dependencies (not even `@hcengineering/platform`)

### TASK-006b: Wire design tokens into mobile tailwind config
- **Type:** config
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-004, TASK-006a
- **writeScope:** `mobile/package.json`, `mobile/tailwind.config.ts`
- **Description:** Add `@hcengineering/mobile-design-tokens` as a `workspace:^` dependency in mobile. Import tokens into `tailwind.config.ts` theme.extend — colors, spacing, borderRadius, fontSize all sourced from the shared package. No hardcoded values in the tailwind config.
- **Acceptance Criteria:**
  1. `tailwind.config.ts` imports from `@hcengineering/mobile-design-tokens`, contains zero hardcoded color/spacing values
  2. `bg-surface` renders `#161719`, `text-caption` renders `rgba(255,255,255,0.8)` in dark mode
  3. `bg-primary` renders `#205DC2`
  4. `p-1` = 8px, `p-2` = 16px, `p-3` = 24px

### TASK-007: Bundle IBM Plex Sans fonts
- **Type:** feature
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-006b (shared write to mobile/tailwind.config.ts — must sequence)
- **writeScope:** `mobile/assets/fonts/`, `mobile/tailwind.config.ts`, `mobile/src/app/_layout.tsx`
- **Description:** Huly uses IBM Plex Sans (400/500/600/700). Repo has woff2 only — need TTF for RN. Download or install TTF files. Place in `mobile/assets/fonts/`. Load with `expo-font` `useFonts()` in root layout. Map in `tailwind.config.ts` fontFamily: `sans: ["IBMPlexSans-Regular"]`, `sans-medium`, `sans-semibold`, `sans-bold`.
- **Acceptance Criteria:**
  1. `font-sans` renders IBM Plex Sans Regular on both platforms
  2. `font-sans-bold` renders IBM Plex Sans Bold
  3. Fonts load before splash screen hides (no FOUT)

### TASK-008: Create scaffold directory structure
- **Type:** scaffold
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-001
- **writeScope:** `mobile/src/`, `mobile/tsconfig.json`
- **Description:** Create the convention-compliant directory structure per folder-structure.md:
  ```
  mobile/src/client/       — API, auth, socket adapters (empty, ready)
  mobile/src/repositories/ — domain data access (empty, ready)
  mobile/src/hooks/        — screen-safe hooks (empty, ready)
  mobile/src/store/        — zustand client state (empty, ready)
  mobile/src/components/ui/       — primitives (empty, ready)
  mobile/src/components/features/ — feature widgets (empty, ready)
  mobile/src/lib/          — pure helpers (empty, ready)
  mobile/src/app/(auth)/       — auth route group (empty, ready)
  mobile/src/app/(app)/        — main app route group (empty, ready)
  ```
  Add `.gitkeep` in each empty dir. Add `tsconfig.json` with strict mode and path aliases (`@/*` → `src/*`).
- **Acceptance Criteria:**
  1. All directories exist with correct nesting
  2. `tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`, path alias `@/*`
  3. `npx tsc --noEmit` passes

### TASK-009: Create placeholder app with Huly styling
- **Type:** feature
- **Priority:** P2
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-005, TASK-006b, TASK-007, TASK-008
- **writeScope:** `mobile/src/app/_layout.tsx`, `mobile/src/app/index.tsx`
- **Description:** Wire everything together:
  - Root `_layout.tsx`: dark theme default, SafeAreaProvider, font loading via `useFonts()`, splash screen hold until fonts ready, import `global.css`
  - `index.tsx`: placeholder screen with Huly dark background (`bg-surface`), app title in IBM Plex Sans (`font-sans-bold text-xl text-caption`), primary blue accent element (`bg-primary`), proper spacing and border radius from tokens

  This proves the full stack: Expo + NativeWind + Huly tokens + fonts + monorepo resolution.
- **Acceptance Criteria:**
  1. App launches on iOS Simulator: dark bg `#161719`, white text in IBM Plex Sans, blue `#205DC2` accent
  2. Dark/light theme toggle works via `useColorScheme`
  3. No yellow box warnings or red screen errors

---

## Dependency Graph

```
TASK-001 (init expo) [P0]
├── TASK-002 (rush.json) [P1]
│   ├── TASK-003 (huly deps) [P1]
│   │   └── TASK-004 (nativewind) [P1]  ← sequenced: shared package.json write
│   │       ├── TASK-005 (metro) [P1]   ← needs TASK-003 + TASK-004
│   │       └── TASK-006b (wire tw) [P1] ← needs TASK-004 + TASK-006a
│   │           └── TASK-007 (fonts) [P1] ← sequenced: shared tailwind.config.ts write
│   └── TASK-006a (design-tokens) [P1]  ← sequenced: shared rush.json write
├── TASK-008 (dir structure) [P1]
│
└─── all join ──→ TASK-009 (placeholder app) [P2]
```

**Serialized chain (no parallel write conflicts):**
TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-006b → TASK-007
                    ↘ TASK-006a (after TASK-002, parallel with TASK-003)
TASK-001 → TASK-008 (parallel with everything above)
TASK-004 + TASK-003 → TASK-005

**Critical path:** TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-006b → TASK-007 → TASK-009

## Failure Modes & Recovery

| Failure | Detection | Recovery |
|---------|-----------|----------|
| `create-expo-app` fails (network, npm registry, SDK version mismatch) | Non-zero exit code, missing `mobile/package.json` | Retry with `--template default` (SDK 54 fallback), then manually bump to SDK 55 via `expo install expo@~55.0.0` |
| `rush update` fails after rush.json edit | Rush error output, unresolved workspace links | Revert rush.json change, verify JSON syntax, check for duplicate packageName. Run `rush update --purge` to clear cache. |
| Metro duplicate React instance | Red screen: "Invalid hook call" or "more than one copy of React" | Add explicit `resolver.extraNodeModules` mapping React to a single copy in metro.config.js. Check `nodeModulesPaths` order. |
| Metro fails to resolve `@hcengineering/*` workspace packages | "Unable to resolve module" error | Verify `watchFolders` includes monorepo root. Check symlinks exist in `common/temp/node_modules/@hcengineering/`. Run `rush update` to recreate symlinks. |
| NativeWind classes not applying | Unstyled components despite `className` | Verify: (1) `global.css` has `@tailwind` directives, (2) `metro.config.js` has `withNativeWind`, (3) `babel.config.js` has `nativewind/babel` preset, (4) `tailwind.config.ts` content paths include `./src/**`. |
| Font not rendering (IBM Plex Sans) | Default system font visible instead of IBM Plex Sans | Check TTF files exist in `assets/fonts/`. Verify `useFonts()` returns `loaded: true` before rendering. Check fontFamily names in tailwind.config.ts match exact filename stems. |
| `rush build -t @hcengineering/mobile-design-tokens` fails | TypeScript compilation error | Check `tsconfig.json` paths. Ensure `src/index.ts` barrel exports all modules. Verify `as const` objects have no type errors. |
| Partial rush.json edit (crash mid-write) | Malformed JSON | `git checkout rush.json` to restore, re-apply the entry. Always validate JSON after editing. |

## Verification

After all 10 tasks:

**Smoke checks:**
1. `cd mobile && npx expo start` — dev server launches without errors
2. App renders on iOS Simulator with Huly dark theme, IBM Plex Sans font, correct colors
3. `rush build -t @hcengineering/mobile` succeeds
4. `rush build -t @hcengineering/mobile-design-tokens` succeeds
5. `cd mobile && npx tsc --noEmit` passes with strict mode

**Artifact assertions:**
6. `mobile/package.json` contains `@hcengineering/core`, `@hcengineering/platform`, `@hcengineering/mobile-design-tokens` with `workspace:^`
7. `mobile/tailwind.config.ts` imports from `@hcengineering/mobile-design-tokens` — grep confirms zero hardcoded hex color values
8. `mobile/metro.config.js` includes `withNativeWind` call and `watchFolders` with monorepo root
9. `mobile/assets/fonts/` contains 4 IBM Plex Sans TTF files
10. All convention directories exist: `src/client/`, `src/repositories/`, `src/hooks/`, `src/store/`, `src/components/ui/`, `src/components/features/`, `src/lib/`
11. `packages/mobile-design-tokens/src/` exports `colors`, `spacing`, `typography`, `radii`, `shadows`, `avatars` — all `as const` objects with zero dependencies

**Not verified in this scaffold (deferred):**
- Plugin type package imports (tracker, chunter, etc.) — requires Metro blockList for svelte, done in API wiring task
- API client connection — requires api-client dep with transitive dep handling
- Auth flow — requires account-client integration
