# Plan: Mobile Inbox Feature Parity

## Overview

Close the remaining inbox/notification gaps between the web notification experience and the Expo
mobile app. The mobile inbox already has a solid foundation: paginated list, 4-type filter chips,
mark-as-read (individual + bulk), archive (swipe + bulk), push lifecycle, badge sync, deep linking,
and optimistic updates. Functions for `markAllAsRead()` and `archiveAll()` exist in hooks but have
no UI entry points. This plan wires missing UI to existing functions, adds read/unread filtering,
mark-all/archive-all buttons, notification grouping by document, unarchive flow, and expanded
deep-link coverage.

## Scope Challenge

- Assumed planning mode: `HOLD`
- Assumed default review: `claude`
- Scope cut applied: focus on inbox parity inside `mobile/src/app/(app)/inbox/**`, notification
  hooks/store, and adjacent components
- Explicitly excluded from this plan:
  - server-side notification setting enforcement (requires Huly server changes)
  - real-time subscription overhaul (replacing polling with live WS subscriptions is infra-scope)
  - server-side Expo push delivery (requires HulyPulse service modification)

## Prerequisites

- Existing scaffold/auth/api client/notification phases are already implemented in `mobile/`
- WebSocket sidecar and notification invalidation rules are operational
- `useNotifications`, `useMarkAsRead`, `useArchiveNotifications`, `useMarkAllAsRead`, `useArchiveAll`
  hooks already exist with optimistic updates

## Non-Goals

- Modifying Huly server notification services or push delivery
- Replacing polling-based unread sync with live WebSocket subscriptions
- Per-notification-type server-enforced settings (would require server model changes)
- Notification search (global search already covers messages)

## Contracts

- Repository ownership stays in `mobile/src/repositories/notification.ts`
- Server state remains in TanStack Query; UI state (filter, selection, badge) remains in Zustand
- New inbox routes must stay under `mobile/src/app/(app)/inbox/**`
- Existing swipe-to-archive and bulk selection behavior must not regress
- Mark-all and archive-all use the existing hook functions, not new repository methods

## Existing Code Leverage

- Current inbox routes:
  - [inbox/index.tsx](mobile/src/app/(app)/inbox/index.tsx)
  - [inbox/notification/[id].tsx](mobile/src/app/(app)/inbox/notification/[id].tsx)
  - [inbox/_layout.tsx](mobile/src/app/(app)/inbox/_layout.tsx)
- Current notification data/state:
  - [notification.ts](mobile/src/repositories/notification.ts)
  - [useNotifications.ts](mobile/src/hooks/useNotifications.ts)
  - [useUnreadCount.ts](mobile/src/hooks/useUnreadCount.ts)
  - [useNotificationListeners.ts](mobile/src/hooks/useNotificationListeners.ts)
  - [usePushRegistration.ts](mobile/src/hooks/usePushRegistration.ts)
  - [inbox.ts](mobile/src/store/inbox.ts)
  - [push.ts](mobile/src/store/push.ts)
- Current components:
  - [NotificationRow.tsx](mobile/src/components/features/NotificationRow.tsx)
  - [NotificationFilters.tsx](mobile/src/components/features/NotificationFilters.tsx)
  - [BulkActionBar.tsx](mobile/src/components/features/BulkActionBar.tsx)
  - [InAppNotificationBanner.tsx](mobile/src/components/features/InAppNotificationBanner.tsx)
- Notification routing:
  - [notificationRouter.ts](mobile/src/lib/notificationRouter.ts)
  - [notifications.ts](mobile/src/lib/notifications.ts)
- Realtime rules:
  - [notification.ts](mobile/src/realtime/rules/notification.ts)

## Tasks

### TASK-001: Add mark-all-read and archive-all UI buttons

Wire the existing `useMarkAllAsRead()` and `useArchiveAll()` hooks to visible UI actions
in the inbox header.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/src/app/(app)/inbox/index.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Inbox header shows a menu (three-dot or overflow) with "Mark All as Read" and "Archive All" actions.
  2. Both actions call the existing hook functions with optimistic updates and badge count sync.
  3. Actions are disabled when there are no unread/unarchived notifications respectively, preventing no-op mutations.

### TASK-002: Add read/unread filter toggle

Extend the notification filter UI to support filtering by read/unread status alongside the
existing type filters.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/src/app/(app)/inbox/index.tsx`, `mobile/src/store/inbox.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Filter bar adds a read/unread toggle (segmented control or chip) that filters the notification list by `isViewed` status.
  2. Read/unread filter composes with the existing type filter (e.g., "unread mentions" shows only unread MentionInboxNotifications).
  3. Switching between read/unread/all preserves the type filter selection and does not reset scroll position.

### TASK-003: Extend repository for read/unread and unarchive queries

Add the repository-level query support for read/unread filtering and unarchive mutation
that the UI tasks depend on.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/src/repositories/notification.ts`, `mobile/src/hooks/useNotifications.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. `getNotifications()` accepts an optional `readStatus` filter ('read' | 'unread' | 'all') that maps to `isViewed` query conditions.
  2. New `unarchiveNotifications(ids)` repository method sets `archived: false` on the given notification IDs.
  3. `useUnarchiveNotifications()` hook wraps the repository method with optimistic cache updates that re-insert items into the visible list.

### TASK-004: Add unarchive flow

Expose an unarchive action so users can recover accidentally archived notifications.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-003`
- **writeScope:** `mobile/src/app/(app)/inbox/index.tsx`, `mobile/src/components/features/NotificationRow.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. After archiving via swipe, a brief undo toast/snackbar appears (3s) allowing the user to unarchive the notification.
  2. The undo action calls `useUnarchiveNotifications()` and restores the item to its original position in the list.
  3. If the undo window expires, the archive is final and no stale item appears in the active list.

### TASK-005: Add notification grouping by document context

Group notifications by their source document (DocNotifyContext) matching the web inbox pattern.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-002`, `TASK-003`
- **writeScope:** `mobile/src/app/(app)/inbox/index.tsx`, `mobile/src/components/features/NotificationGroupCard.tsx`, `mobile/src/repositories/notification.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Inbox list groups notifications by `docNotifyContext` (source document), rendering a card per document with collapsed notification count.
  2. Expanding a group card shows the individual notifications within that document context.
  3. Documents with no displayable title show the object class as a fallback label, not a raw ref ID.

### TASK-006: Expand deep-link coverage for notification routing

Add more object class mappings so fewer notifications fall through to the generic detail screen.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **writeScope:** `mobile/src/lib/notificationRouter.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Router handles `hr:class:Department`, `recruit:class:Applicant`, `document:class:Document`, and `board:class:Card` with appropriate fallback routes.
  2. Unknown object classes still fall back to the notification detail screen without crashing.
  3. `isKnownObjectClass()` returns true for all newly added classes.

### TASK-007: Add per-type notification settings UI

Expose fine-grained notification type toggles beyond the current 3 categories (chat, tracker, inbox).

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **writeScope:** `mobile/src/app/(app)/settings/notifications.tsx`, `mobile/src/store/push.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Notification settings screen shows per-type toggles within each category (e.g., under Chat: mentions, replies, reactions).
  2. Preferences persist to AsyncStorage and are checked before showing foreground banners.
  3. Disabling a parent category disables all child types; re-enabling restores previous per-type state.

### TASK-008: Add delete notification action

Allow permanent deletion of notifications (not just archive).

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-003`
- **writeScope:** `mobile/src/app/(app)/inbox/index.tsx`, `mobile/src/repositories/notification.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Bulk action bar in selection mode shows a "Delete" action alongside "Mark Read" and "Archive".
  2. Delete uses `removeDoc` to permanently remove selected notifications with a confirmation dialog.
  3. Attempting to delete already-removed notifications does not crash; stale IDs are silently skipped.

## Failure Modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| Mark-all-read optimistic update miscounts | Badge shows wrong number after mark-all | Invalidate unread count query on settle; re-sync from server |
| Unarchive restores notification to wrong position | Item appears at top instead of original sort position | Insert at correct `modifiedOn` position or invalidate full list |
| Group card shows raw ref instead of title | DocNotifyContext has no resolved display name | Fall back to objectClass human-readable label |
| Delete removes wrong notification | Race between optimistic delete and server response | Confirm by ID match before cache eviction; rollback on mismatch |
| Per-type toggle state desyncs from parent category | Child enabled but parent disabled | Enforce parent-child invariant in toggle handler |

## Ship Cut

If execution stops halfway, the minimum coherent cut is after `TASK-006`.

That cut yields:
- mark-all-read and archive-all buttons
- read/unread filter toggle
- unarchive flow
- document-level notification grouping
- expanded deep-link coverage

Items below that cut and safe to defer:
- per-type notification settings
- permanent delete action

## Test Coverage Map

- `TASK-001`: mark-all-read/archive-all success + disabled state when empty
- `TASK-002`: read/unread filter composability + scroll position preservation
- `TASK-003`: repository readStatus filter + unarchive mutation + optimistic rollback
- `TASK-004`: undo toast lifecycle + re-insertion position + expired-undo cleanup
- `TASK-005`: group card rendering + expand/collapse + fallback title for unknown docs
- `TASK-006`: new class mappings + unknown class fallback + isKnownObjectClass truth table
- `TASK-007`: per-type toggle persistence + parent-child invariant + foreground banner suppression
- `TASK-008`: delete confirmation + stale-ID skip + bulk delete with partial failure

## Execution Summary

- Tasks: 8
- P0 foundations (parallel): `TASK-001`, `TASK-002`, `TASK-003`
- Critical path: `TASK-003 -> TASK-005`
- Secondary paths:
  - `TASK-003 -> TASK-004`
  - `TASK-003 -> TASK-008`
- Independent: `TASK-006`, `TASK-007`

## Concurrent Write Policy

| File | Write Order (by dependency) |
| --- | --- |
| `inbox/index.tsx` | TASK-001, TASK-002 (parallel P0) → TASK-004 → TASK-005 → TASK-008 |
| `repositories/notification.ts` | TASK-003 → TASK-005 → TASK-008 |
| `store/inbox.ts` | TASK-002 only |

TASK-001 and TASK-002 both write to `inbox/index.tsx` but are independent P0 tasks. To avoid
conflicts, TASK-001 adds to the header area and TASK-002 adds to the filter bar area — disjoint
sections. If agents run in parallel, merge conflicts are unlikely but possible; sequential
execution of TASK-001 then TASK-002 is safer.

## Task Dependencies

Derived from per-task `Depends on` fields.

```text
TASK-002 -> TASK-005
TASK-003 -> TASK-004
TASK-003 -> TASK-005  (file: repositories/notification.ts)
TASK-003 -> TASK-008  (file: repositories/notification.ts)
TASK-004 -> TASK-005  (file: inbox/index.tsx)
TASK-005 -> TASK-008  (file: inbox/index.tsx)
```
