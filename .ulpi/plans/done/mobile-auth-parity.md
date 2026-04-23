# Plan: Mobile Auth Feature Parity

## Overview

Close the remaining auth gaps between the web login experience and the Expo mobile app.
The mobile auth flow already handles email/password login, OTP verification, TOTP 2FA,
workspace selection, token persistence in expo-secure-store, and session restore with
validation. This plan adds the missing password reset link, social login (Google via
server-redirect pattern), sign-up flow (using `signUpOtp`), and biometric authentication.

## Scope Challenge

- Assumed planning mode: `HOLD`
- Assumed default review: `claude`
- Scope cut applied: focus on auth parity inside `mobile/src/app/(auth)/**`, auth hooks/store,
  and the account client
- Explicitly excluded from this plan:
  - server-side OAuth provider configuration (providers must already be enabled on the server)
  - new server auth endpoints (mobile uses existing AccountClient API)
  - enterprise SSO / OpenID Connect (Google OAuth only for initial parity)

## Prerequisites

- Existing scaffold/auth/api client phases are already implemented in `mobile/`
- `@hcengineering/account-client` supports `login()`, `validateOtp()`, `verify2fa()`,
  `getUserWorkspaces()`, `signUpOtp()`, `requestPasswordReset()`
- expo-secure-store is already configured for token persistence
- `expo-web-browser` is already installed (used for OAuth server-redirect flow)
- `expo-linking` is already installed (used for capturing OAuth redirect URL)
- `expo-local-authentication` needed for TASK-004 (biometric auth)

## Non-Goals

- Adding new social providers beyond Google (GitHub, OpenID can follow later)
- Modifying server-side auth endpoints or provider configuration
- Enterprise SSO / SAML integration
- Password strength enforcement (server handles this)
- Client-side OAuth token exchange (server uses Passport.js server-redirect pattern)

## Contracts

- Auth state remains in `mobile/src/store/auth.ts` Zustand store
- Token persistence uses expo-secure-store exclusively (never AsyncStorage)
- Google OAuth uses `WebBrowser.openAuthSessionAsync()` to open `{accountsUrl}/auth/google`,
  then captures the server redirect to `{frontUrl}/login/auth?token=...` via the return URL
- Signup uses `signUpOtp()` (not the deprecated `signUp()`), requiring OTP verification
- New auth routes must stay under `mobile/src/app/(auth)/**`
- Existing login/OTP/2FA flows must not regress

## Existing Code Leverage

- Current auth routes:
  - [login.tsx](mobile/src/app/(auth)/login.tsx)
  - [otp.tsx](mobile/src/app/(auth)/otp.tsx)
  - [two-factor.tsx](mobile/src/app/(auth)/two-factor.tsx)
  - [workspace-select.tsx](mobile/src/app/(auth)/workspace-select.tsx)
  - [_layout.tsx](mobile/src/app/(auth)/_layout.tsx)
- Current auth data/state:
  - [account.ts](mobile/src/client/account.ts)
  - [auth.ts](mobile/src/store/auth.ts)
  - [use-auth.ts](mobile/src/hooks/use-auth.ts)
- Server OAuth reference:
  - Google auth is a Passport.js server-redirect flow (`GET /auth/google` -> callback -> redirect with token)
  - Web client opens `{accountsUrl}/auth/google` as a link (see `plugins/login-resources/src/components/Providers.svelte`)

## Tasks

### TASK-001: Add password reset / forgot password flow

Add a "Forgot Password?" link on the login screen that triggers the server's password
reset email flow.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/src/app/(auth)/login.tsx`, `mobile/src/app/(auth)/forgot-password.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Login screen shows a "Forgot Password?" link below the password field that navigates to a reset screen.
  2. Reset screen accepts an email, calls `AccountClient.requestPasswordReset()`, and shows a success confirmation regardless of whether the email is registered (prevents email enumeration).
  3. A "Resend" button appears after 30s for users who didn't receive the email.

### TASK-002: Add Google social login

Add a "Continue with Google" button on the login screen using the server's Passport.js
redirect flow via `expo-web-browser`.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`
- **writeScope:** `mobile/src/app/(auth)/login.tsx`, `mobile/src/hooks/use-auth.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Login screen shows a "Continue with Google" button that calls `WebBrowser.openAuthSessionAsync()` to open `{accountsUrl}/auth/google` with the app's return URL.
  2. On redirect back to the app, the token is extracted from the `?token=...` query parameter and proceeds to workspace selection like email/password login.
  3. OAuth failure, user cancellation, or browser dismissal returns to the login screen with no partial auth state persisted.

### TASK-003: Add sign-up / create account flow

Add a sign-up screen accessible from the login screen using `signUpOtp()` (not the
deprecated `signUp()`).

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-002`
- **writeScope:** `mobile/src/app/(auth)/signup.tsx`, `mobile/src/app/(auth)/login.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Login screen shows a "Create Account" link that navigates to a signup form (first name, last name, email).
  2. Successful signup calls `AccountClient.signUpOtp()` which sends a verification email, then routes to the existing OTP screen for email confirmation.
  3. Duplicate email or validation errors show recoverable inline errors without losing entered form data.

### TASK-004: Add biometric authentication (Face ID / Touch ID)

Add optional biometric unlock after initial login so returning users skip password entry.
Uses `expo-local-authentication` for biometric prompt.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-002`
- **writeScope:** `mobile/src/app/(auth)/login.tsx`, `mobile/src/store/auth.ts`, `mobile/src/hooks/use-auth.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. After successful login, users are prompted to enable biometric unlock (opt-in, stored in expo-secure-store). Uses `expo-local-authentication` for the biometric prompt.
  2. On app launch with valid stored token, biometric prompt appears; success proceeds to workspace, failure falls back to password.
  3. Devices without biometric hardware (`!LocalAuthentication.hasHardwareAsync()`) skip the prompt entirely and fall back to standard login without error.

## Failure Modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| OAuth redirect stuck in browser | User closes browser without completing | Auth state stays on login screen; no partial auth state persisted |
| OAuth redirect URL missing token | Server callback omits token param | Show "Login failed" error; do not attempt to parse empty token |
| Password reset email not received | User waits and nothing arrives | Show "Resend" button after 30s; suggest checking spam |
| Biometric enrolled but token expired | Biometric succeeds but API rejects token | Clear biometric enrollment and fall back to password login |
| Signup with existing email | Server returns duplicate error via signUpOtp | Show inline error on email field, preserve other form data |

## Ship Cut

If execution stops halfway, the minimum coherent cut is after TASK-001 + TASK-002 + TASK-003
all complete (they form two branches from TASK-001).

That cut yields:
- password reset link
- Google social login
- sign-up flow

Items below that cut and safe to defer:
- biometric authentication

## Test Coverage Map

- `TASK-001`: reset email send + always-success confirmation + resend button
- `TASK-002`: WebBrowser.openAuthSessionAsync redirect + token extraction + cancellation recovery
- `TASK-003`: signUpOtp form + duplicate email error + OTP routing
- `TASK-004`: expo-local-authentication enrollment + success/failure + no-hardware fallback

## Concurrent Write Policy

| File | Write Order (by dependency) |
| --- | --- |
| `login.tsx` | TASK-001 -> TASK-002 -> TASK-003 -> TASK-004 |
| `use-auth.ts` | TASK-002 -> TASK-004 |

## Execution Summary

- Tasks: 4
- P0 foundation: `TASK-001`
- Critical path: `TASK-001 -> TASK-002 -> TASK-003`
- Biometric path: `TASK-002 -> TASK-004`

## Task Dependencies

Derived from per-task `Depends on` fields. File-overlap ordering edges marked with `(file)`.

```text
TASK-001 -> TASK-002  (file: login.tsx)
TASK-002 -> TASK-003  (file: login.tsx)
TASK-002 -> TASK-004  (file: login.tsx, use-auth.ts)
```
