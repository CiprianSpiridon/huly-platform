# Plan: Mobile Settings Feature Parity

## Overview

Close the remaining settings gaps between the web settings experience and the Expo mobile app.
The mobile settings already has profile view (read-only), workspace info, workspace switch with
rollback, member list with search/sections, theme toggle (dark/light/system), notification
preferences (3 categories), about screen, cache clear, and full logout cleanup. This plan adds
profile editing, workspace creation, member management (invite/remove/roles), password change,
2FA setup, language selector backed by the i18n foundation, and account deletion.

## Scope Challenge

- Assumed planning mode: `HOLD`
- Assumed default review: `claude`
- Scope cut applied: focus on settings parity inside `mobile/src/app/(app)/settings/**`,
  settings hooks/store, and the account client / settings repository
- Explicitly excluded from this plan:
  - server-side workspace administration beyond what AccountClient exposes
  - admin-only features (password aging rules, workspace deletion)
  - workspace avatar editing (complex image cropping, lower priority)

## Prerequisites

- Existing scaffold/auth/api client/settings phases are already implemented in `mobile/`
- `@hcengineering/account-client` supports profile update, workspace creation, member
  management, password change, and 2FA setup/disable
- Settings repository and hooks exist for profile and workspace queries
- `mobile-infra-parity` `TASK-001` (i18n foundation) must land before `TASK-007`

## Non-Goals

- Admin-only workspace settings (password aging, compliance rules)
- Workspace avatar editing with image cropping
- Server-side workspace administration beyond AccountClient API
- Custom theme colors or advanced appearance settings

## Contracts

- Settings state remains in `mobile/src/store/settings.ts` Zustand store
- Account operations use `mobile/src/client/account.ts` wrapping AccountClient
- Profile name updates use AccountClient; avatar updates use the existing workspace/person mutation path
- New settings routes must stay under `mobile/src/app/(app)/settings/**`
- Existing theme toggle, notification preferences, and logout must not regress
- Member role changes must validate against AccountRole enum from `@hcengineering/core`
- New route screens use inline `<Stack.Screen options={...}>` for header config (following the pattern in `members.tsx`), not `_layout.tsx` registration
- Member role changes use AccountClient; member removal uses workspace membership mutation via the members repository / Huly client

## Existing Code Leverage

- Current settings routes:
  - [index.tsx](mobile/src/app/(app)/settings/index.tsx)
  - [about.tsx](mobile/src/app/(app)/settings/about.tsx)
  - [members.tsx](mobile/src/app/(app)/settings/members.tsx)
  - [notifications.tsx](mobile/src/app/(app)/settings/notifications.tsx)
  - [workspaces.tsx](mobile/src/app/(app)/settings/workspaces.tsx)
  - [_layout.tsx](mobile/src/app/(app)/settings/_layout.tsx)
- Current settings data/state:
  - [settings.ts](mobile/src/repositories/settings.ts)
  - [members.ts](mobile/src/repositories/members.ts)
  - [settings.ts](mobile/src/store/settings.ts)
  - [account.ts](mobile/src/client/account.ts)
  - [useWorkspaces.ts](mobile/src/hooks/useWorkspaces.ts)
  - [useMembers.ts](mobile/src/hooks/useMembers.ts)

## Tasks

### TASK-001: Add profile editing (name and avatar)

Upgrade the read-only profile header to support editing name and uploading an avatar.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/src/app/(app)/settings/index.tsx`, `mobile/src/components/features/ProfileHeader.tsx`, `mobile/src/repositories/settings.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Profile section shows edit icons on name and avatar; tapping name opens an inline editor, tapping avatar opens the image picker.
  2. Name changes are saved via AccountClient; avatar changes use the existing workspace/person mutation path, and the profile display updates immediately without requiring a screen reload.
  3. Upload failures or invalid names show recoverable errors without clearing the existing profile data.

### TASK-002: Add workspace creation flow

Allow users to create a new workspace from the workspace list screen.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **writeScope:** `mobile/src/app/(app)/settings/workspaces.tsx`, `mobile/src/app/(app)/settings/create-workspace.tsx`, `mobile/src/client/account.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Workspace list screen shows a "Create Workspace" button that navigates to a creation form (name, URL slug).
  2. Successful creation calls AccountClient's workspace creation method and switches to the new workspace.
  3. Duplicate URL slug or validation errors show recoverable inline errors without losing form data.

### TASK-003: Add member invite flow

Allow workspace owners/maintainers to invite new members from the members screen.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **writeScope:** `mobile/src/app/(app)/settings/members.tsx`, `mobile/src/app/(app)/settings/invite-member.tsx`, `mobile/src/repositories/members.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Members screen shows an "Invite" button (visible only to owners/maintainers) that opens an invite form with email and role selector.
  2. Successful invite sends the invitation via AccountClient and shows a confirmation toast.
  3. Invalid email or permission errors show recoverable errors; the invite form does not close on failure.

### TASK-004: Add member remove and role change

Allow workspace owners to remove members and change roles from the member detail.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-003`
- **writeScope:** `mobile/src/app/(app)/settings/members.tsx`, `mobile/src/components/features/MemberRow.tsx`, `mobile/src/repositories/members.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Tapping a member row opens a detail sheet with role selector (Guest, User, Maintainer, Owner) and a "Remove" action.
  2. Role changes call `AccountClient.updateWorkspaceRole()`; removals call `AccountClient.leaveWorkspace()` with the target account, and both refresh the member list on success.
  3. Cannot demote the last owner or remove self; both show explicit error messages instead of silent failures.

### TASK-005: Add change password screen

Allow users to change their password from settings.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **writeScope:** `mobile/src/app/(app)/settings/change-password.tsx`, `mobile/src/app/(app)/settings/index.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Settings index shows a "Change Password" row that navigates to a form with current password, new password, and confirm fields.
  2. Successful change calls AccountClient's password change method and shows a confirmation; session remains active.
  3. Wrong current password or weak new password shows field-level validation errors without clearing the form.

### TASK-006: Add 2FA setup/management screen

Allow users to enable, verify, and disable TOTP 2FA from settings.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **writeScope:** `mobile/src/app/(app)/settings/two-factor.tsx`, `mobile/src/app/(app)/settings/index.tsx`, `mobile/src/client/account.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Settings shows a "Two-Factor Authentication" row with current status (enabled/disabled); tapping opens the setup/manage screen.
  2. Enable flow shows QR code and manual secret, then verifies a TOTP code before activating; disable flow requires TOTP verification.
  3. Invalid verification codes show inline errors; enable/disable state reflects correctly after successful change.

### TASK-007: Add language selector

Allow users to select their preferred language from settings after the i18n foundation is in place.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **writeScope:** `mobile/src/app/(app)/settings/index.tsx`, `mobile/src/store/settings.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Settings shows a "Language" row with the current language from the i18n configuration introduced by `mobile-infra-parity` `TASK-001`; tapping opens a picker with available locales.
  2. Language selection persists to the settings store and AsyncStorage, updates the active i18n locale immediately, and restores on app restart.
  3. Selecting a language with incomplete translations falls back to English for missing keys and surfaces a non-blocking "translation incomplete" note.

### TASK-008: Add account deletion flow

Allow users to delete their account from settings with confirmation safeguards.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-005`
- **writeScope:** `mobile/src/app/(app)/settings/index.tsx`, `mobile/src/client/account.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Settings shows a "Delete Account" row in a danger zone section; tapping opens a two-step confirmation (type workspace name to confirm, then final confirm button).
  2. Successful deletion calls `AccountClient.deleteAccount(accountUuid)` (obtained from auth store), clears all local state, and navigates to login screen.
  3. Failed deletion (server error, network failure) shows a recoverable error and does not clear local state.

## Failure Modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| Profile avatar upload fails mid-upload | Progress stalls or error returned | Show retry button; preserve existing avatar |
| Workspace creation returns duplicate slug | Server rejects with conflict | Show inline error on slug field |
| Member invite to non-existent email | Server accepts but invitation bounces | No mobile-side recovery; server handles bounce |
| Last-owner role change attempted | Server rejects demotion | Show explicit "cannot demote last owner" message |
| 2FA enable with wrong code | Server rejects verification | Show inline error; allow retry without restarting flow |
| Account deletion with active workspaces | Server may reject or cascade | Show warning listing affected workspaces before confirming |

## Ship Cut

If execution stops halfway, the minimum coherent cut is after both `TASK-005` and `TASK-004`
complete (they are on separate branches that must both finish).

That cut yields:
- profile editing (name + avatar)
- workspace creation
- member invite + remove + role change
- change password

Items below that cut and safe to defer:
- 2FA setup/management
- language selector
- account deletion

## Test Coverage Map

- `TASK-001`: profile edit save + avatar upload failure + name validation
- `TASK-002`: workspace creation + duplicate slug error + switch after create
- `TASK-003`: invite form + permission gate + invalid email error
- `TASK-004`: role change + remove member + last-owner protection
- `TASK-005`: password change + wrong current password + weak password validation
- `TASK-006`: QR code display + TOTP verify + enable/disable state
- `TASK-007`: language picker + persistence + missing translation fallback
- `TASK-008`: delete confirmation + password verification + cleanup + failure recovery

## Concurrent Write Policy

| File | Write Order (by dependency) |
| --- | --- |
| `settings/index.tsx` | TASK-001 (P0) → TASK-005 → TASK-006 → TASK-007 → TASK-008 |
| `client/account.ts` | TASK-001 → TASK-002 → TASK-006 → TASK-008 |
| `repositories/members.ts` | TASK-003 → TASK-004 |
| `settings/members.tsx` | TASK-003 → TASK-004 |

## Execution Summary

- Tasks: 8
- P0 foundation: `TASK-001`
- Critical path: `TASK-001 -> TASK-005 -> TASK-006 -> TASK-007`
- Secondary path: `TASK-003 -> TASK-004`
- Independent: `TASK-002`, `TASK-003`

## Task Dependencies

Derived from per-task `Depends on` fields. File-overlap ordering edges marked with `(file)`.

```text
TASK-001 -> TASK-005  (file: settings/index.tsx)
TASK-003 -> TASK-004  (file: members.tsx, repositories/members.ts)
TASK-005 -> TASK-006  (file: settings/index.tsx)
TASK-005 -> TASK-008  (file: settings/index.tsx)
TASK-006 -> TASK-007  (file: settings/index.tsx)
```
