# Plan: Mobile Auth Feature Parity

## Overview

Close the remaining auth gaps between the web login experience and the Expo mobile app.
The mobile auth flow already handles email/password login, OTP verification, TOTP 2FA,
workspace selection, token persistence in expo-secure-store, and session restore with
validation. This plan adds the missing password reset link, social login (Google), sign-up
flow, and biometric authentication.

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
  `getUserWorkspaces()`, and social provider OAuth flows
- expo-secure-store is already configured for token persistence
- expo-auth-session or expo-web-browser needed for OAuth redirect flow

## Non-Goals

- Adding new social providers beyond Google (GitHub, OpenID can follow later)
- Modifying server-side auth endpoints or provider configuration
- Enterprise SSO / SAML integration
- Password strength enforcement (server handles this)

## Contracts

- Auth state remains in `mobile/src/store/auth.ts` Zustand store
- Token persistence uses expo-secure-store exclusively (never AsyncStorage)
- OAuth redirect must use `expo-auth-session` or `expo-web-browser` with the server's
  existing OAuth callback URL
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
  2. Reset screen accepts an email, calls AccountClient's password reset method, and shows a confirmation message.
  3. Invalid or unregistered emails show a user-friendly error without revealing whether the email exists.

### TASK-002: Add Google social login

Add a "Continue with Google" button on the login screen using the server's existing OAuth
provider configuration.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **writeScope:** `mobile/src/app/(auth)/login.tsx`, `mobile/src/client/account.ts`, `mobile/src/hooks/use-auth.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Login screen shows a "Continue with Google" button that initiates an OAuth redirect via expo-auth-session or expo-web-browser.
  2. Successful OAuth callback extracts the token and proceeds to workspace selection like email/password login.
  3. OAuth failure or user cancellation returns to the login screen with a recoverable error state, not a crash.

### TASK-003: Add sign-up / create account flow

Add a sign-up screen accessible from the login screen for new users.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`
- **writeScope:** `mobile/src/app/(auth)/signup.tsx`, `mobile/src/client/account.ts`, `mobile/src/app/(auth)/login.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Login screen shows a "Create Account" link that navigates to a signup form (name, email, optional password).
  2. Successful signup calls AccountClient's `signUp()` method and routes to email confirmation or workspace selection.
  3. Duplicate email or validation errors show recoverable inline errors without losing entered form data.

### TASK-004: Add biometric authentication (Face ID / Touch ID)

Add optional biometric unlock after initial login so returning users skip password entry.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **writeScope:** `mobile/src/app/(auth)/login.tsx`, `mobile/src/store/auth.ts`, `mobile/src/hooks/use-auth.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. After successful login, users are prompted to enable biometric unlock (opt-in, stored in expo-secure-store).
  2. On app launch with valid stored token, biometric prompt appears; success proceeds to workspace, failure falls back to password.
  3. Devices without biometric hardware skip the prompt entirely and fall back to standard login without error.

## Failure Modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| OAuth redirect stuck in browser | User closes browser without completing | Auth state stays on login screen; no partial auth state persisted |
| Password reset email not received | User waits and nothing arrives | Show "Resend" button after 30s; suggest checking spam |
| Biometric enrolled but token expired | Biometric succeeds but API rejects token | Clear biometric enrollment and fall back to password login |
| Signup with existing email | Server returns duplicate error | Show inline error on email field, preserve other form data |

## Ship Cut

If execution stops halfway, the minimum coherent cut is after `TASK-003`.

That cut yields:
- password reset link
- Google social login
- sign-up flow

Items below that cut and safe to defer:
- biometric authentication

## Test Coverage Map

- `TASK-001`: reset email send + invalid email error + confirmation UI
- `TASK-002`: OAuth redirect + callback token extraction + cancellation recovery
- `TASK-003`: signup form validation + duplicate email error + confirmation routing
- `TASK-004`: biometric enrollment + success/failure + no-hardware fallback

## Execution Summary

- Tasks: 4
- P0 foundation: `TASK-001`
- Critical path: `TASK-001 -> TASK-003`
- Independent: `TASK-002`, `TASK-004`

## Task Dependencies

```text
TASK-001 -> TASK-003  (login.tsx overlap + auth flow ordering)
```
