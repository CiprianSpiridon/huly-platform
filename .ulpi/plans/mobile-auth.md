# Mobile Auth Flow

## Context

Implement the complete authentication flow for the Huly mobile app: server config loading, email+password login, OTP login, 2FA verification, workspace selection, token persistence in expo-secure-store, session restore on app launch, auth guard routing, and logout. Builds on the scaffold completed by `mobile-scaffold` plan.

## Stack (locked)

| Dependency | Version | Notes |
|---|---|---|
| Expo SDK | 55 | Managed workflow |
| React Native | 0.83.4 | New Architecture |
| expo-router | v6 | File-based routing |
| NativeWind | v4 | className on RN components |
| Zustand | 5.x | Client state (auth, workspace) |
| TanStack Query | v5 | Server state (workspace list) |
| expo-secure-store | latest SDK 55 | Token persistence |
| @hcengineering/account-client | workspace:^ | Auth API (pure fetch, RN-safe) |

## Mode

- **Planning mode:** HOLD (14 tasks)
- **Default review:** claude
- **Non-goals:** PlatformClient connection (data layer), biometric auth, push notifications, deep linking into auth, sign-up/registration flow

## Prerequisites

- `mobile-scaffold` plan fully executed (all 10 tasks complete)
- Branch: `react-native-app` (or feature branch off it)
- Node.js 20+, Rush monorepo

## Key Types (from @hcengineering/account-client)

```typescript
interface LoginInfo {
  account: AccountUuid;
  token?: string;
  tfaRequired?: boolean;
  extra?: Record<string, string>;
}

interface OtpInfo {
  sent: boolean;
  retryOn: Timestamp;
}

interface WorkspaceLoginInfo extends LoginInfo {
  workspace: WorkspaceUuid;
  workspaceUrl: string;
  endpoint: string;
  token: string;
  role: AccountRole;
}

interface ServerConfig {
  ACCOUNTS_URL: string;
  COLLABORATOR_URL: string;
  FILES_URL: string;
  UPLOAD_URL: string;
}
```

## Secure Storage Keys

| Key | Value | Written at |
|---|---|---|
| `auth_token` | Account-scoped JWT | Login success |
| `account_id` | `AccountUuid` | Login success |
| `workspace_url` | Workspace URL slug | Workspace selection |
| `workspace_id` | `WorkspaceUuid` | Workspace selection |
| `workspace_token` | Workspace-scoped JWT | Workspace selection |
| `workspace_endpoint` | Transactor endpoint URL | Workspace selection |

---

## Tasks

### TASK-100: Add auth dependencies to mobile

- **Type:** config
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none (scaffold complete)
- **writeScope:** `mobile/package.json`
- **Description:** Add runtime dependencies required for auth flow: `@hcengineering/account-client` (workspace:^), `expo-secure-store`, `zustand`, `@tanstack/react-query`. These are all RN-safe. Run `rush update` to link workspace packages.
- **Acceptance Criteria:**
  1. `mobile/package.json` contains `@hcengineering/account-client`, `expo-secure-store`, `zustand`, `@tanstack/react-query` in dependencies
  2. `rush update` completes without errors
  3. `import { getClient } from '@hcengineering/account-client'` resolves in Metro without errors
- **validateCommand:** `cd mobile && node -e "require('@hcengineering/account-client')" 2>&1 | head -5`

### TASK-101: Server config loader

- **Type:** feature
- **Priority:** P0
- **Effort:** XS
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-100
- **writeScope:** `mobile/src/client/config.ts`
- **Description:** Implement server config loading. Cannot use `loadServerConfig` from `@hcengineering/api-client` (unsafe transitive deps). Re-implement the simple fetch logic: read `EXPO_PUBLIC_HULY_URL` env var (default `https://app.huly.io`), fetch `{url}/config.json`, parse JSON, return `ServerConfig` with at minimum `ACCOUNTS_URL`. Cache in memory (re-fetch only on explicit clear). Export `getServerUrl()`, `loadServerConfig()`, `getConfig()`, and `clearConfig()`.

  ```typescript
  // WRONG -- importing from api-client pulls tiptap chain
  import { loadServerConfig } from '@hcengineering/api-client';

  // RIGHT -- self-contained fetch in mobile client layer
  export async function loadServerConfig(url: string): Promise<ServerConfig> {
    const res = await fetch(`${url}/config.json`, { keepalive: true });
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
    return (await res.json()) as ServerConfig;
  }
  ```

- **Acceptance Criteria:**
  1. `getServerUrl()` returns `EXPO_PUBLIC_HULY_URL` or `'https://app.huly.io'`
  2. `loadServerConfig()` fetches `/config.json` and returns object with `ACCOUNTS_URL`
  3. Network failure throws descriptive error (not silent null)
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-102: Account client wrapper

- **Type:** feature
- **Priority:** P0
- **Effort:** XS
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-101
- **writeScope:** `mobile/src/client/account.ts`
- **Description:** Create the AccountClient wrapper module. Export `getOrCreateAccountClient(token?)` that loads server config (via TASK-101), calls `getClient(config.ACCOUNTS_URL, token)` from `@hcengineering/account-client`, and caches the instance. Export `clearAccountClient()` to reset both cached client and config (used on logout). The wrapper ensures a single AccountClient instance per auth session and lazy-loads the server config.

  ```typescript
  // WRONG -- creating new client on every call
  async function doLogin(email: string, password: string) {
    const client = getClient(accountsUrl, undefined);
    return client.login(email, password);
  }

  // RIGHT -- cached singleton via wrapper
  const client = await getOrCreateAccountClient();
  return client.login(email, password);
  ```

- **Acceptance Criteria:**
  1. `getOrCreateAccountClient()` returns `AccountClient` with server config loaded
  2. Calling `getOrCreateAccountClient(token)` with a new token creates a fresh client
  3. `clearAccountClient()` resets state so next call re-fetches config
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-103: Auth Zustand store

- **Type:** feature
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-100
- **writeScope:** `mobile/src/store/auth.ts`
- **Description:** Create Zustand auth store following the pattern from `state-management.md` reference. State: `token: string | null`, `account: AccountUuid | null`, `isAuthenticated: boolean`, `isBootstrapping: boolean`. Actions: `setAuth(loginInfo: LoginInfo)` persists token + account to expo-secure-store and updates state; `clearAuth()` deletes all secure store keys and resets state; `restoreAuth()` reads from secure store and populates state (called on app launch). Always guard against missing `loginInfo.token` in `setAuth()`.

  ```typescript
  // WRONG -- not persisting to secure store
  setAuth: (info) => set({ token: info.token, account: info.account, isAuthenticated: true });

  // RIGHT -- persist first, then update in-memory state
  setAuth: async (info) => {
    if (!info.token) throw new Error('Login response missing token');
    await SecureStore.setItemAsync('auth_token', info.token);
    await SecureStore.setItemAsync('account_id', info.account);
    set({ token: info.token, account: info.account, isAuthenticated: true });
  };
  ```

- **Acceptance Criteria:**
  1. `setAuth()` persists `auth_token` and `account_id` to expo-secure-store
  2. `restoreAuth()` reads from secure store and sets `isAuthenticated: true` when tokens exist
  3. `setAuth()` throws if `loginInfo.token` is undefined (tfaRequired case)
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-104: Workspace Zustand store

- **Type:** feature
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-100
- **writeScope:** `mobile/src/store/workspace.ts`
- **Description:** Create Zustand workspace store following the pattern from `state-management.md`. State: `selectedWorkspace: WorkspaceUuid | null`, `workspaceUrl: string | null`, `workspaceEndpoint: string | null`, `workspaceToken: string | null`. Actions: `setWorkspace(info: WorkspaceLoginInfo)` persists 4 values to expo-secure-store; `clearWorkspace()` deletes all 4 keys; `restoreWorkspace()` reads all 4 keys from secure store. Keys: `workspace_url`, `workspace_id`, `workspace_token`, `workspace_endpoint`.

- **Acceptance Criteria:**
  1. `setWorkspace()` persists all 4 keys to expo-secure-store and updates in-memory state
  2. `restoreWorkspace()` populates state only when ALL 4 values are present (partial state = no workspace)
  3. `clearWorkspace()` removes all 4 secure store keys and resets all state fields to null
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-105: TanStack Query provider in root layout

- **Type:** feature
- **Priority:** P0
- **Effort:** XS
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-100
- **writeScope:** `mobile/src/app/_layout.tsx`
- **Description:** Add `QueryClientProvider` from TanStack Query to the root layout. Create `QueryClient` with default options: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `retry: 2`, `refetchOnWindowFocus: false`, `networkMode: 'offlineFirst'`. Wrap the existing `SafeAreaProvider > Stack > StatusBar` tree. Instantiate `QueryClient` outside the component (module scope) so it survives re-renders.

  ```typescript
  // WRONG -- QueryClient inside component (recreated on every render)
  export default function RootLayout() {
    const queryClient = new QueryClient();

  // RIGHT -- module scope
  const queryClient = new QueryClient({ ... });
  export default function RootLayout() {
  ```

- **Acceptance Criteria:**
  1. Root layout renders `QueryClientProvider` wrapping all children
  2. `QueryClient` instantiated at module scope, not inside component
  3. Default `staleTime: 30_000`, `retry: 2`, `refetchOnWindowFocus: false` set
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-106: Session restore + splash hold

- **Type:** feature
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-103, TASK-104, TASK-105
- **writeScope:** `mobile/src/app/_layout.tsx`
- **Description:** Add session restore logic to root layout. On mount, call `restoreAuth()` then `restoreWorkspace()` from their Zustand stores. If both token and workspace exist, optionally validate the token via `getLoginInfoByToken()` (fail silently -- stale token handled by 401 later). Keep splash screen visible until restore completes (`isBootstrapping` state). Only after restore finishes, hide splash and render the Stack navigator.

  ```typescript
  // WRONG -- navigating imperatively on auth state change
  useEffect(() => {
    if (!isAuth) router.replace('/login');
  }, [isAuth]);

  // RIGHT -- declarative redirect via layout guards (TASK-108)
  // Root layout just restores state; auth guard does the redirect
  ```

- **Acceptance Criteria:**
  1. Splash screen stays visible until `restoreAuth()` + `restoreWorkspace()` complete
  2. If secure store has valid tokens, `isAuthenticated` is `true` before first render
  3. If secure store is empty, `isAuthenticated` is `false` and splash hides normally
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-107: Auth stack layout

- **Type:** feature
- **Priority:** P1
- **Effort:** XS
- **Agent:** expo-react-native-engineer
- **Dependencies:** none (scaffold has `.gitkeep`)
- **writeScope:** `mobile/src/app/(auth)/_layout.tsx`
- **Description:** Create the `(auth)` route group layout. Simple Stack navigator with `headerShown: false`. This group contains login, OTP, 2FA, and workspace-select screens. No tab bar, no auth guard (this IS the unauthenticated zone). If user is already authenticated AND has a workspace, redirect to `(app)`.

- **Acceptance Criteria:**
  1. `(auth)/_layout.tsx` exports a Stack with `headerShown: false`
  2. Authenticated users with workspace are redirected to `/(app)/tracker`
  3. No tab bar visible on any (auth) screen
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-108: Auth guard in (app) layout

- **Type:** feature
- **Priority:** P1
- **Effort:** XS
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-103, TASK-104
- **writeScope:** `mobile/src/app/(app)/_layout.tsx`
- **Description:** Create the `(app)` route group layout with auth guard. Check `isAuthenticated` from auth store and `selectedWorkspace` from workspace store. If not authenticated, `<Redirect href="/(auth)/login" />`. If authenticated but no workspace, `<Redirect href="/(auth)/workspace-select" />`. Otherwise render the tab navigator and modal routes. The tab navigator lives directly at `(app)/_layout.tsx` -- no nested `(tabs)` group. This is declarative -- no `useEffect` + `router.replace()`.

  ```typescript
  // WRONG -- imperative redirect in useEffect
  useEffect(() => { if (!isAuth) router.replace('/login'); }, [isAuth]);

  // RIGHT -- declarative redirect in layout render
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  ```

- **Acceptance Criteria:**
  1. Unauthenticated access to any `(app)` route redirects to `/(auth)/login`
  2. Authenticated user without workspace redirects to `/(auth)/workspace-select`
  3. Authenticated user with workspace sees the Stack (no flicker)
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-109: Login screen (email + password)

- **Type:** feature
- **Priority:** P1
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-102, TASK-103, TASK-107
- **writeScope:** `mobile/src/app/(auth)/login.tsx`, `mobile/src/hooks/use-auth.ts`
- **Description:** Create the login screen and `useLogin` hook. Screen has email input, password input, and "Sign in" button. On submit, calls `accountClient.login(email, password)`. On success: if `loginInfo.tfaRequired`, navigate to 2FA screen. If `loginInfo.token` present, call `setAuth(loginInfo)` and navigate to workspace-select. Show loading state during request, error message on failure. Include "Sign in with OTP" link that navigates to OTP screen. Hook manages loading/error state and orchestrates the accountClient call + store update.

  Keyboard avoidance required (KeyboardAvoidingView). SafeAreaView edges `['top', 'bottom']`. All interactive elements need accessibilityLabel.

- **Acceptance Criteria:**
  1. Valid email + password -> `setAuth()` called -> navigates to workspace-select
  2. `tfaRequired: true` response -> navigates to 2FA screen with account context
  3. Invalid credentials -> error message displayed, form NOT cleared
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-110: OTP login screen

- **Type:** feature
- **Priority:** P1
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-102, TASK-103, TASK-107
- **writeScope:** `mobile/src/app/(auth)/otp.tsx`, `mobile/src/hooks/use-auth.ts`
- **Description:** Create OTP login screen. Two-step UI: (1) email input -> calls `accountClient.loginOtp(email)` -> shows OTP code input, (2) OTP code input -> calls `accountClient.validateOtp(email, code)` -> on success calls `setAuth(loginInfo)` and navigates to workspace-select. Show countdown timer from `OtpInfo.retryOn` for resend. Show "Back to password login" link. `textContentType="oneTimeCode"` and `autoComplete="one-time-code"` for iOS/Android OTP autofill. Extend `useLogin` hook with `requestOtp` and `validateOtp` actions.

- **Acceptance Criteria:**
  1. `loginOtp(email)` sends code, UI transitions to OTP input step
  2. Valid OTP -> `setAuth()` called -> navigates to workspace-select
  3. Resend disabled until `retryOn` timestamp passes (countdown visible)
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-111: 2FA verification screen

- **Type:** feature
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-102, TASK-103, TASK-107, TASK-109
- **writeScope:** `mobile/src/app/(auth)/two-factor.tsx`, `mobile/src/hooks/use-auth.ts`
- **Description:** Create 2FA verification screen. Reached when `login()` returns `tfaRequired: true`. Screen shows 6-digit TOTP code input. On submit, calls `accountClient.verify2fa(code)` (requires the account-scoped token from the initial login response -- even though `tfaRequired`, the `account` field is present). On success, updates auth store with the verified token and navigates to workspace-select. Extend `useLogin` hook with `verify2fa` action. Pass the initial LoginInfo (with account but without full token) through route params or a transient Zustand field.

  **Key insight:** `verify2fa()` requires the token from the initial login response set as the Authorization header. The `getClient()` must be called with that partial token.

- **Acceptance Criteria:**
  1. Valid TOTP code -> `verify2fa()` returns full `LoginInfo` with token -> `setAuth()` called
  2. Invalid code -> error message displayed, input cleared for retry
  3. Back navigation returns to login screen (not stuck in 2FA loop)
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-112: Workspace selection screen

- **Type:** feature
- **Priority:** P1
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-102, TASK-104, TASK-107
- **writeScope:** `mobile/src/app/(auth)/workspace-select.tsx`, `mobile/src/hooks/use-workspace.ts`
- **Description:** Create workspace selection screen and `useWorkspaces` / `useSelectWorkspace` hooks. On mount, fetches workspace list via `accountClient.getUserWorkspaces()` using TanStack Query (`queryKey: ['workspaces']`, `staleTime: 5 * 60_000`). Renders list of workspaces (name, URL). On tap, calls `accountClient.selectWorkspace(workspace.url)`, stores result in workspace Zustand store via `setWorkspace(wsInfo)`, then navigates to `/(app)/tracker` via `router.replace()`. Handle loading, error, and empty (no workspaces) states per screen-checklist.md.

  Filter out workspaces where `mode !== 'active'` or `isDisabled === true`.

- **Acceptance Criteria:**
  1. Workspace list loads and displays name + URL for each active workspace
  2. Selecting a workspace -> `setWorkspace()` persists to secure store -> navigates to app
  3. Empty workspace list shows appropriate empty state (not blank screen)
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

### TASK-113: Logout flow

- **Type:** feature
- **Priority:** P2
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** TASK-103, TASK-104, TASK-102
- **writeScope:** `mobile/src/hooks/use-auth.ts`, `mobile/src/app/(auth)/login.tsx`
- **Description:** Implement `useLogout` hook. On logout: (1) clear workspace store (`clearWorkspace()`), (2) clear auth store (`clearAuth()`), (3) clear account client cache (`clearAccountClient()`), (4) clear TanStack Query cache (`queryClient.clear()`). The auth guard in `(app)/_layout.tsx` will automatically redirect to login when `isAuthenticated` becomes false. No imperative navigation needed. Add logout function export to `use-auth.ts`. The actual logout button will live in settings screen (separate task), but the hook must be ready.

  ```typescript
  // WRONG -- forgetting to clear query cache (stale data leak between accounts)
  const logout = async () => {
    await clearAuth();
    await clearWorkspace();
  };

  // RIGHT -- clear everything
  const logout = async () => {
    queryClient.clear();         // prevent data leak
    clearAccountClient();        // reset API client
    await clearWorkspace();      // clear secure store + state
    await clearAuth();           // clear secure store + state
  };
  ```

- **Acceptance Criteria:**
  1. After logout, all 6 secure store keys are deleted
  2. After logout, TanStack Query cache is empty (no data leak between accounts)
  3. Auth guard redirects to login automatically (no imperative router call)
- **validateCommand:** `cd mobile && npx tsc --noEmit 2>&1 | grep -c 'error' || echo 0`

---

## Dependency Graph

```
TASK-100 (add deps) [P0]
├── TASK-101 (server config) [P0]
│   └── TASK-102 (account client wrapper) [P0]
│       ├── TASK-109 (login screen) [P1]
│       │   └── TASK-111 (2FA screen) [P1]
│       ├── TASK-110 (OTP screen) [P1]
│       ├── TASK-112 (workspace select) [P1]
│       └── TASK-113 (logout) [P2]
├── TASK-103 (auth store) [P0]
│   ├── TASK-106 (session restore) [P0]
│   ├── TASK-108 (auth guard) [P1]
│   ├── TASK-109 (login screen) [P1]
│   ├── TASK-110 (OTP screen) [P1]
│   ├── TASK-111 (2FA screen) [P1]
│   └── TASK-113 (logout) [P2]
├── TASK-104 (workspace store) [P0]
│   ├── TASK-106 (session restore) [P0]
│   ├── TASK-108 (auth guard) [P1]
│   ├── TASK-112 (workspace select) [P1]
│   └── TASK-113 (logout) [P2]
└── TASK-105 (query provider) [P0]
    └── TASK-106 (session restore) [P0]

TASK-107 (auth stack layout) [P1]  -- no deps, can start immediately
├── TASK-109 (login screen) [P1]
├── TASK-110 (OTP screen) [P1]
├── TASK-111 (2FA screen) [P1]
└── TASK-112 (workspace select) [P1]
```

**Critical path:** TASK-100 -> TASK-101 -> TASK-102 -> TASK-109 -> TASK-111

**Parallelizable groups:**
- After TASK-100: TASK-101, TASK-103, TASK-104, TASK-105 can all run in parallel
- After TASK-102 + TASK-103 + TASK-107: TASK-109, TASK-110, TASK-112 can all run in parallel
- TASK-107 has no dependencies -- can start immediately

**Write scope serialization:**
- `mobile/src/hooks/use-auth.ts` is written by TASK-109, extended by TASK-110, TASK-111, TASK-113. Execution order: TASK-109 first (creates file), then TASK-110/TASK-111 (extend), then TASK-113 (adds useLogout).
- `mobile/src/app/_layout.tsx` is written by TASK-105 (adds QueryClientProvider) then TASK-106 (adds session restore). Must sequence.

## Failure Modes & Recovery

| Failure | Detection | Recovery |
|---------|-----------|----------|
| `@hcengineering/account-client` fails Metro resolution (svelte field) | "Unable to resolve" error mentioning svelte | Add `resolverMainFields: ['react-native', 'browser', 'main']` to metro.config.js (exclude 'svelte'). Already done in scaffold TASK-005 but verify. |
| `expo-secure-store` unavailable on web | Runtime error on web platform | Guard with `Platform.OS !== 'web'` or mock for web dev. Secure store is iOS/Android only. |
| Config fetch fails (wrong URL, network down) | `loadServerConfig()` throws | Show error screen with retry button. Do not proceed to login. Store URL in EXPO_PUBLIC_HULY_URL for easy override. |
| Login returns `tfaRequired` but `token` is undefined | `setAuth()` throws "missing token" | Do NOT call `setAuth()`. Store `account` in transient state, navigate to 2FA screen. Only call `setAuth()` after `verify2fa()` succeeds. |
| `getUserWorkspaces()` returns empty array | Workspace select screen renders blank | Show EmptyState: "No workspaces found. Create one at app.huly.io" |
| Token expired on session restore | `getLoginInfoByToken()` returns null or throws | Clear auth store, let auth guard redirect to login. Do not crash. |
| Secure store read fails (device encryption locked) | `SecureStore.getItemAsync()` throws | Catch in `restoreAuth()`, set `isAuthenticated: false`, redirect to login. Log error but do not crash. |
| Race condition: multiple rapid login attempts | Duplicate API calls, inconsistent state | Disable submit button during `isLoading`. Use `useCallback` to prevent stale closure issues. |
| Workspace selection during workspace upgrade/migration | `selectWorkspace()` returns workspace with `mode !== 'active'` | Check `WorkspaceLoginInfo` response. If workspace is in migration, show progress indicator or "workspace unavailable" message. |
| `clearAuth()` partially fails (one key deleted, one remains) | Inconsistent secure store state | Always attempt all deletions (don't short-circuit on first error). `restoreAuth()` requires BOTH keys present. |

## Verification

After all 14 tasks:

**Smoke checks:**
1. `cd mobile && npx tsc --noEmit` -- zero errors
2. `cd mobile && npx expo start` -- dev server launches
3. App launches on iOS Simulator, shows login screen
4. Login with valid credentials -> workspace select -> app home
5. Kill and relaunch app -> session restored, lands on app home
6. Logout -> returns to login, relaunching app shows login

**Flow checks:**
7. Password login: email + password -> workspace select -> app
8. OTP login: email -> OTP code -> workspace select -> app
9. 2FA flow: email + password (tfaRequired) -> 2FA code -> workspace select -> app
10. Invalid password: error message shown, form retained
11. Invalid OTP: error message shown, can retry
12. No workspaces: empty state shown on workspace screen
13. Network error on config fetch: error with retry
14. Deep link to /tracker while logged out -> redirected to login
