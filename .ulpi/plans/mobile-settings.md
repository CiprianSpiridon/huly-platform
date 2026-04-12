# Mobile Settings (Phase 6)

## Context

Build the settings and profile screen for the Huly mobile app. Profile display, workspace info,
workspace switching, theme toggle, logout, and app version. This is the lightest of the four
phases but critical for multi-workspace support and user identity.

## Stack (locked)

| Layer | Choice |
|---|---|
| Navigation | expo-router, `(app)/settings/` route group |
| Auth state | Zustand auth store (from Phase 1) |
| Client state | Zustand settings store |
| Secure storage | expo-secure-store (tokens) |
| Styling | NativeWind v4 + Huly design tokens |
| Types | `import type` from `@hcengineering/contact` |

## Mode

- **Planning mode:** HOLD
- **Default review:** claude
- **Agent:** expo-react-native-engineer
- **Prerequisites:** Phase 1-2 completed, Phase 3 TASK-004 tab layout completed

## Tasks

### TASK-001: Settings repository layer
- **Type:** feature
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none (assumes Phase 1-2 auth + API client)
- **writeScope:** [`mobile/src/repositories/settings.ts`, `mobile/src/repositories/index.ts`]
- **Description:** Create `SettingsRepository` with methods: `getProfile()` (returns name, email, avatar for current user), `getWorkspaceInfo()` (name, icon, member count), `getWorkspaces()` (list all workspaces user belongs to), `switchWorkspace(workspaceUrl)` (returns new login token), `logout()` (clears tokens). All use the account-client and api-client from Phase 1-2.
- **Acceptance Criteria:**
  1. `getProfile()` returns `{ firstName, lastName, email, avatarUrl }` or sensible defaults for missing fields
  2. `getWorkspaces()` returns array with `{ url, name, lastVisit }` sorted by lastVisit descending
  3. `logout()` clears token from expo-secure-store and returns void (never throws)
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-002: Settings Zustand store
- **Type:** feature
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none
- **writeScope:** [`mobile/src/store/settings.ts`]
- **Description:** Create `useSettingsStore`. State: `theme` ('dark' | 'light' | 'system'), `appVersion` (string from Constants.expoConfig.version). Actions: `setTheme`, `initVersion`. Theme persisted to AsyncStorage via Zustand persist middleware. On app start, reads persisted theme and applies via `Appearance.setColorScheme()`.
- **Acceptance Criteria:**
  1. `setTheme('light')` persists preference and app restarts in light mode
  2. `setTheme('system')` follows device setting; toggling device dark mode changes app theme
  3. Default theme is 'dark' when no persisted preference exists (Huly default)
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-003: Settings TanStack Query hooks
- **Type:** feature
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-001]
- **writeScope:** [`mobile/src/hooks/useProfile.ts`, `mobile/src/hooks/useWorkspaces.ts`]
- **Description:** Query hooks: `useProfile()` (staleTime: 5min, current user profile), `useWorkspaces()` (staleTime: 60s, workspace list). Mutation hook: `useSwitchWorkspace()` only. `useSwitchWorkspace` on success: (1) calls `accountClient.selectWorkspace(url)` to get new `WorkspaceLoginInfo`, (2) calls `setWorkspace(newWsInfo)` on workspace Zustand store (from auth phase) to persist new endpoint/token/id, (3) calls `disconnect()` on connection store then `connect()` with new credentials, (4) clears all TanStack Query caches, (5) navigates to `/(app)/tracker`. Logout hook already exists from auth phase (`use-auth.ts` `useLogout`).
- **Acceptance Criteria:**
  1. `useProfile` returns `{ data, isLoading, error }` with profile DTO
  2. `useSwitchWorkspace().mutate(url)` updates workspace Zustand store (all 4 keys: url, id, token, endpoint), clears query cache, reconnects API client, and navigates to `/(app)/tracker`
  3. After workspace switch, `useConnectionStore.getState().client` points to the new workspace endpoint (not stale)
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-004: Settings route group
- **Type:** feature
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none (assumes Phase 3 TASK-004 tab layout exists with Settings tab entry)
- **writeScope:** [`mobile/src/app/(app)/settings/_layout.tsx`, `mobile/src/app/(app)/settings/index.tsx`]
- **Description:** Create `settings/` route group with Stack navigator for settings list -> sub-screens (workspace picker, profile). Tab entry already exists from tracker phase.
- **Acceptance Criteria:**
  1. Settings tab shows gear icon, labeled "Settings"
  2. Tab is the rightmost in the tab bar
  3. Navigating to settings shows the settings list screen
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-005: Settings main screen
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-003, TASK-004]
- **writeScope:** [`mobile/src/app/(app)/settings/index.tsx`, `mobile/src/components/features/SettingsRow.tsx`, `mobile/src/components/features/ProfileHeader.tsx`]
- **Description:** Settings screen with sections. **Profile section** at top: avatar (large), full name, email (read-only display). **Workspace section**: workspace name + icon, member count, "Switch workspace" row. **Appearance section**: theme toggle (Dark / Light / System) using segmented control. **Account section**: "Log out" button (red, destructive) calls `useLogout` from `@/hooks/use-auth` (created in auth phase). No new logout implementation needed. **App info** at footer: app version, build number. Uses `useProfile()` and Zustand settings store.
- **Acceptance Criteria:**
  1. Profile header shows avatar with initials fallback, full name, and email
  2. Theme toggle immediately changes app appearance (dark surfaces to light surfaces)
  3. Logout button shows confirmation alert before proceeding; canceling alert does nothing
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-006: Workspace switcher screen
- **Type:** feature
- **Priority:** P1
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-003, TASK-005]
- **writeScope:** [`mobile/src/app/(app)/settings/workspaces.tsx`, `mobile/src/components/features/WorkspaceRow.tsx`]
- **Description:** Full-screen workspace list. Uses `useWorkspaces()`. Each row: workspace name, icon, "current" indicator for active workspace. Tapping a non-current workspace calls `useSwitchWorkspace()` with confirmation. Shows loading overlay during switch. Handles switch failure (expired invitation, workspace archived) with error message. Back navigates to settings.
- **Acceptance Criteria:**
  1. Current workspace has a checkmark indicator; tapping it does nothing
  2. Switching workspace shows a full-screen loading overlay with "Switching..." text
  3. If workspace is archived/unavailable, shows error alert and remains on current workspace
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

---

## Dependency Graph

