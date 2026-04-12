---
name: expo-react-native
version: 2.0.0
description: |
  Expo/React Native reference skill for the Huly Platform mobile app. Covers routing, components,
  styling, data access, auth, state management, native builds, accessibility, performance, and
  testing. Use when the task touches the mobile/ directory or any Expo/React Native code path.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
paths:
  - "mobile/**/*.ts"
  - "mobile/**/*.tsx"
  - "mobile/app/**"
  - "mobile/src/**"
  - "mobile/app.json"
  - "mobile/metro.config.js"
  - "mobile/babel.config.js"
  - "mobile/tailwind.config.ts"
  - "mobile/global.css"
  - "mobile/eas.json"
argument-hint: "[Expo screen, component, hook, build, or native task]"
arguments:
  - request
when_to_use: |
  Use when the task touches Expo/React Native screens, components, routing, styling, data access,
  auth, state, native APIs, builds, accessibility, performance, or tests. Examples: "build this
  screen", "add a tab", "wire TanStack Query", "fix navigation", "set up push notifications".
effort: high
---

<EXTREMELY-IMPORTANT>
This skill is a routing shell over the Expo/React Native reference set, not the full framework manual.

Non-negotiable rules:
1. Read `references/stack.md` first.
2. Then load only the references needed for the actual task.
3. Keep data access in the repository pattern wrapping @hcengineering/* clients.
4. Keep styling in NativeWind/Tailwind -- no inline StyleSheet unless Tailwind cannot express it.
5. Keep the heavy framework guidance in `references/`, not inline here.
</EXTREMELY-IMPORTANT>

# expo-react-native

## Inputs

- `$request`: The Expo/React Native screen, component, hook, build, or native task

## Goal

Route mobile work through the Huly mobile app conventions so implementation follows established patterns for data access, navigation, styling, and platform integration.

## Step 0: Read the stack contract

Always start with:

- `references/stack.md`

That establishes the locked decisions for runtime, config, and project-wide patterns.

**Success criteria**: The project's Expo architecture assumptions are explicit before editing.

## Step 1: Load only the relevant references

Use the routing table to pick reference files that match the task. Do not bulk-load the full reference tree.

| Task | Read |
|------|------|
| Locked versions, tsconfig, app.json, build pipeline | `references/stack.md` |
| Folder layout, file conventions, directory rules | `references/folder-structure.md` |
| Rush monorepo Metro config, package boundaries | `references/metro-monorepo.md` |
| Routes, tabs, stacks, modals, deep links, auth guard | `references/routing.md` |
| Screen template, SafeArea, keyboard, states | `references/screen-checklist.md` |
| Component tiers, file template, import order | `references/component-anatomy.md` |
| NativeWind, Tailwind, design tokens, dark mode, fonts | `references/styling.md` |
| API client, PlatformClient, repository pattern | `references/data-client-pattern.md` |
| Zustand stores, TanStack Query, state decisions | `references/state-management.md` |
| Login, token storage, session restore, auth guard | `references/auth.md` |
| File uploads, datalake, expo-image, caching | `references/storage-and-media.md` |
| Push notifications, badges, deep link handling | `references/notifications.md` |
| EAS Build, EAS Update, app signing, OTA | `references/native-builds.md` |
| Accessibility labels, roles, touch targets, focus | `references/accessibility.md` |
| FlashList, memo, image optimization, Hermes | `references/performance.md` |
| Jest, RNTL, hook tests, store tests | `references/testing-unit.md` |
| Maestro E2E flows, YAML, CI integration | `references/testing-e2e.md` |

Multiple tasks? Read multiple files. The references are self-contained.

**Success criteria**: The active context only contains the task-relevant conventions.

## Step 2: Implement with the core guardrails

Keep these rules active:

- expo-router for all navigation -- never `@react-navigation` directly
- data access uses the repository pattern wrapping @hcengineering/api-client
- styling uses NativeWind className -- no inline styles when Tailwind can express it
- screens handle loading, error, empty, and offline states
- tokens live in expo-secure-store, never AsyncStorage
- every interactive element has accessibility labels and 44pt touch targets

**Success criteria**: The change fits the Huly mobile architecture instead of generic Expo defaults.

## Step 3: Verify the affected surface

Use the narrowest relevant verification:

- `npx tsc --noEmit` for type errors
- `npx expo-doctor` for SDK compatibility
- `jest --passWithNoTests` for unit tests
- `npx expo start` for dev server smoke test
- Maestro flow for E2E critical paths

**Success criteria**: The changed surface still behaves correctly on both platforms.

## Guardrails

- Do not inline the whole Expo handbook in `SKILL.md`.
- Do not skip `references/stack.md`.
- Do not use raw fetch in screens -- wrap in repositories.
- Do not bypass the NativeWind styling conventions.
- Do not add `disable-model-invocation`; this is a normal domain skill.

## When To Load References

- `references/stack.md`
  Always.

- then only the task-relevant files under `references/`

## Output Contract

Report:

1. which references were loaded
2. the architecture pattern chosen
3. the change made
4. the verification run
5. any remaining platform, permission, or release risk
