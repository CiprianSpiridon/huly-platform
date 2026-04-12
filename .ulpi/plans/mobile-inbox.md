# Mobile Inbox (Phase 5)

## Context

Build the notification center for the Huly mobile app. Unified inbox showing all notifications
grouped by context, with mark-as-read, archive, filtering, and deep navigation to source documents.
Depends on auth (Phase 1) and API client (Phase 2) being complete.

## Stack (locked)

| Layer | Choice |
|---|---|
| Navigation | expo-router, `(app)/inbox/` route group |
| Server state | TanStack Query |
| Client state | Zustand (unread total for tab badge) |
| Lists | `@shopify/flash-list` for notification list |
| Data access | Repository pattern (`src/repositories/notification.ts`) |
| Styling | NativeWind v4 + Huly design tokens |
| Types | `import type` from `@hcengineering/notification`, `activity`, `contact` |

## Mode

- **Planning mode:** HOLD
- **Default review:** claude
- **Agent:** expo-react-native-engineer
- **Prerequisites:** Phase 1-2 completed, Phase 3 TASK-004 tab layout completed

## Key Huly Types (type-only imports)

| Type | Source |
|---|---|
| `InboxNotification` | `@hcengineering/notification` -- user, isViewed, objectId, objectClass, title, body, archived |
| `ActivityInboxNotification` | `@hcengineering/notification` -- attachedTo (ActivityMessage ref) |
| `MentionInboxNotification` | `@hcengineering/notification` -- mentionedIn, mentionedInClass |
| `ReactionInboxNotification` | `@hcengineering/notification` -- emoji, attachedTo |
| `CommonInboxNotification` | `@hcengineering/notification` -- header, message, icon |
| `DocNotifyContext` | `@hcengineering/notification` -- objectId, objectClass, isPinned, hidden, lastViewedTimestamp |

## Tasks

### TASK-001: Notification repository layer
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** none (assumes Phase 2 API client)
- **writeScope:** [`mobile/src/repositories/notification.ts`, `mobile/src/repositories/index.ts`]
- **Description:** Create `NotificationRepository` with methods: `getNotifications(filters?, pagination?)`, `getNotificationContexts()`, `markAsRead(notificationIds[])`, `markAllAsRead()`, `archiveNotifications(notificationIds[])`, `archiveAll()`, `getUnreadCount()`. Supports filtering by type (mention, reaction, activity). Returns DTOs. Pagination via cursor.
- **Acceptance Criteria:**
  1. `getNotifications({ type: 'mention' })` returns only MentionInboxNotification DTOs
  2. `markAsRead([id1, id2])` sends batch update and returns success/failure per ID
  3. `getUnreadCount()` returns a single number for badge display, handles network error by returning cached count
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-002: Notification TanStack Query hooks
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-001]
- **writeScope:** [`mobile/src/hooks/useNotifications.ts`, `mobile/src/hooks/useUnreadCount.ts`]
- **Description:** Query hooks: `useNotifications(filter?)` (infinite query), `useUnreadCount()` (polls every 30s). Mutation hooks: `useMarkAsRead()`, `useArchiveNotifications()`, `useMarkAllAsRead()`, `useArchiveAll()`. Mutations use optimistic updates -- immediately mark items as read/archived in cache. `useUnreadCount` updates the Zustand store for tab badge.
- **Acceptance Criteria:**
  1. `useMarkAsRead().mutate([id])` optimistically sets `isViewed: true` in the cached notification list
  2. `useUnreadCount` polls every 30s and syncs count to `useInboxStore.unreadTotal`
  3. Archive mutation removes items from the visible list immediately (optimistic), restores on error
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-003: Inbox Zustand store
- **Type:** feature
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none
- **writeScope:** [`mobile/src/store/inbox.ts`]
- **Description:** Create `useInboxStore`. State: `unreadTotal` (number, drives tab badge), `activeFilter` ('all' | 'mentions' | 'reactions' | 'updates'), `selectedIds` (Set for bulk operations). Actions: `setUnreadTotal`, `setFilter`, `toggleSelected`, `selectAll`, `clearSelection`.
- **Acceptance Criteria:**
  1. `setFilter('mentions')` updates `activeFilter` and UI re-renders filtered list
  2. `toggleSelected(id)` adds to set if absent, removes if present (toggle behavior)
  3. `clearSelection()` empties the set and exits bulk selection mode
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-004: Inbox route group
- **Type:** feature
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none (assumes Phase 3 TASK-004 tab layout exists with Inbox tab entry)
- **writeScope:** [`mobile/src/app/(app)/inbox/_layout.tsx`, `mobile/src/app/(app)/inbox/index.tsx`]
- **Description:** Create `inbox/` route group with Stack navigator. Tab entry already exists from tracker phase. Wire badge showing `unreadTotal` from `useInboxStore` into the existing tab config. Uses the `notify` color token for the badge dot.
- **Acceptance Criteria:**
  1. Inbox tab shows bell icon with numeric badge from `useInboxStore.unreadTotal`
  2. Badge uses `bg-notify` color token from Huly design system
  3. Badge hides when unread count is 0 (not "0" badge)
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-005: Notification list screen
- **Type:** feature
- **Priority:** P0
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-003, TASK-004]
- **writeScope:** [`mobile/src/app/(app)/inbox/index.tsx`, `mobile/src/components/features/NotificationRow.tsx`, `mobile/src/components/features/NotificationFilters.tsx`]
- **Description:** Main inbox screen. FlashList with notifications sorted by time (newest first). Each `NotificationRow` shows: icon by type (mention=@, reaction=emoji, activity=bell), title, body preview, timestamp, unread dot. Filter chips at top: All, Mentions, Reactions, Updates. Swipe-to-archive on individual rows. Bulk actions header (appears when items selected): "Mark read", "Archive". Pull-to-refresh. Empty state per filter.
- **Acceptance Criteria:**
  1. Swiping a notification row left reveals archive action; completing swipe archives and removes from list
  2. Filter chips are mutually exclusive; switching filter re-fetches with the new type parameter
  3. Empty state shows different messages per filter ("No mentions yet" vs "No notifications")
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-006: Notification detail / deep navigation
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-005]
- **writeScope:** [`mobile/src/app/(app)/inbox/notification/[id].tsx`, `mobile/src/lib/notificationRouter.ts`]
- **Description:** Tapping a notification navigates to its source document. `notificationRouter.ts` maps `objectClass` to the correct deep link: tracker.Issue -> `/tracker/issue/[id]`, chunter.Channel -> `/chat/channel/[id]`, etc. If the source type is unknown, show a generic notification detail screen with title/body. Marks notification as read on navigation. Handles the case where the source document has been deleted.
- **Acceptance Criteria:**
  1. Tapping a tracker issue notification navigates to `(app)/tracker/issue/[id]` with the correct issue ID
  2. Unknown objectClass shows a fallback detail screen instead of crashing
  3. Source document deleted server-side shows "This item is no longer available" with back action
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-007: Bulk operations
- **Type:** feature
- **Priority:** P2
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-003, TASK-005]
- **writeScope:** [`mobile/src/components/features/BulkActionBar.tsx`]
- **Description:** When in selection mode (long-press a notification), show `BulkActionBar` at bottom with "Mark as read" and "Archive" buttons plus count indicator. "Select all" in header. Each action calls batch mutation, optimistically updates all selected items, then clears selection. Haptic feedback on selection toggle.
- **Acceptance Criteria:**
  1. Long-pressing a row enters selection mode; subsequent taps toggle selection without navigation
  2. "Mark as read (5)" button processes all 5 selected, then exits selection mode
  3. If batch mutation partially fails, un-processed items remain selected with error toast
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

---

## Dependency Graph

```
TASK-003 (zustand)    TASK-004 (tab entry)
     |                      |
     v                      v
TASK-001 (repository)  TASK-004 ready
     |                      |
     v                      v
TASK-002 (hooks) ────> TASK-005 (notification list)
                            |
                            +───> TASK-006 (deep navigation)
                            |
                            +───> TASK-007 (bulk operations)
```

Critical path: TASK-001 -> TASK-002 -> TASK-005 -> TASK-006

## Failure Modes

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Unread badge polls after app backgrounded | Battery drain, unnecessary network | Use `useAppState` hook to pause polling when app is in background. Resume on foreground. |
| Swipe-to-archive conflicts with navigation gesture | iOS back swipe triggers archive | Set swipe direction to left-only. Use `activeOffsetX: [-20, 20]` to require intentional horizontal swipe. |
| Optimistic archive + undo race | User archives then immediately scrolls, server rejects | Keep archived item in cache for 5s with "Undo" toast. Only remove from cache after toast expires. |
| Deep navigation to deleted doc | Crash or blank screen | `notificationRouter` wraps target screen in error boundary. Show "item removed" fallback. |
| Bulk mark-read with 100+ items | API timeout | Batch in chunks of 50. Show progress indicator. Partial success updates what succeeded. |
| Filter switch during infinite scroll | Stale data from previous filter | Reset query key on filter change. Cancel in-flight queries via `queryClient.cancelQueries`. |
