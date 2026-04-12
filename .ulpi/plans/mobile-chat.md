# Mobile Chat (Phase 4)

## Context

Build the messaging experience for the Huly mobile app -- channels, direct messages, threaded
conversations, reactions. This is the Slack-replacement screen set. Depends on auth (Phase 1)
and API client (Phase 2) being complete.

## Stack (locked)

| Layer | Choice |
|---|---|
| Navigation | expo-router, `(app)/chat/` route group |
| Server state | TanStack Query |
| Client state | Zustand (unread counts, draft messages) |
| Lists | `@shopify/flash-list` inverted for message threads |
| Data access | Repository pattern (`src/repositories/chat.ts`) |
| Styling | NativeWind v4 + Huly design tokens |
| Types | `import type` from `@hcengineering/chunter`, `activity`, `contact` |

## Mode

- **Planning mode:** HOLD
- **Default review:** claude
- **Agent:** expo-react-native-engineer
- **Prerequisites:** Phase 1-2 completed, Phase 3 tab navigator (TASK-004) completed

## Key Huly Types (type-only imports)

| Type | Source |
|---|---|
| `Channel` | `@hcengineering/chunter` |
| `DirectMessage` | `@hcengineering/chunter` |
| `ChatMessage` | `@hcengineering/chunter` |
| `ThreadMessage` | `@hcengineering/chunter` |
| `ActivityMessage` | `@hcengineering/activity` |
| `Reaction` | `@hcengineering/activity` |
| `Person`, `Employee` | `@hcengineering/contact` |

## Tasks

### TASK-001: Chat repository layer
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** none (assumes Phase 2 API client)
- **writeScope:** [`mobile/src/repositories/chat.ts`, `mobile/src/repositories/index.ts`]
- **Description:** Create `ChatRepository` with methods: `getChannels()`, `getDirectMessages()`, `getMessages(spaceId, pagination?)`, `sendMessage(spaceId, content)`, `getThread(messageId)`, `sendThreadReply(messageId, content)`, `addReaction(messageId, emoji)`, `removeReaction(messageId, emoji)`. Returns DTOs mirroring Huly types. Messages ordered by timestamp descending (newest first for inverted list).
- **Acceptance Criteria:**
  1. `getMessages` returns `{ items: ChatMessageDTO[], nextCursor, hasMore }` with newest-first ordering
  2. `sendMessage` returns the created message DTO for optimistic update
  3. Handles 403 gracefully when user is removed from a channel mid-session
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-002: Chat TanStack Query hooks
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-001]
- **writeScope:** [`mobile/src/hooks/useChannels.ts`, `mobile/src/hooks/useMessages.ts`, `mobile/src/hooks/useThread.ts`]
- **Description:** Query hooks: `useChannels()` (channels + DMs combined), `useMessages(spaceId)` (infinite query, inverted), `useThread(messageId)`. Mutation hooks: `useSendMessage()`, `useSendThreadReply()`, `useToggleReaction()`. `useSendMessage` uses optimistic updates -- inserts message at top of list immediately, rolls back on error. Messages staleTime: 10s (chat is real-time-ish). Channels staleTime: 60s.
- **Acceptance Criteria:**
  1. `useSendMessage().mutate()` optimistically adds the message to the list before server confirms
  2. If send fails, optimistic message is rolled back and error toast is shown
  3. `useMessages` infinite query loads older messages when user scrolls up
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-003: Chat Zustand store
- **Type:** feature
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none
- **writeScope:** [`mobile/src/store/chat.ts`]
- **Description:** Create `useChatStore`. State: `unreadCounts` (Map<spaceId, number>), `draftMessages` (Map<spaceId, string>), `activeChannelId`. Actions: `setUnreadCount`, `clearUnread`, `saveDraft`, `clearDraft`, `setActiveChannel`. Unread counts used for tab badge and channel list indicators. Draft messages persist in-memory only (not AsyncStorage -- chat drafts are ephemeral).
- **Acceptance Criteria:**
  1. `setUnreadCount(channelId, 5)` makes badge show "5" on that channel row
  2. `saveDraft(channelId, "partial msg")` preserves text when navigating away and back
  3. `clearUnread` zeroes the count when user opens the channel
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-004: Chat route group
- **Type:** feature
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none (assumes Phase 3 TASK-004 tab layout exists with Chat tab entry)
- **writeScope:** [`mobile/src/app/(app)/chat/_layout.tsx`, `mobile/src/app/(app)/chat/index.tsx`]
- **Description:** Create `chat/` route group with Stack navigator for channel list -> channel detail -> thread. Tab entry already exists from tracker phase. Wire unread badge from `useChatStore` into the existing tab config.
- **Acceptance Criteria:**
  1. Chat tab shows message bubble icon with unread badge when count > 0
  2. Badge disappears when all channels are read (count = 0)
  3. Tab navigation between Tracker and Chat preserves each stack's navigation state
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-005: Channel list screen
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-003, TASK-004]
- **writeScope:** [`mobile/src/app/(app)/chat/index.tsx`, `mobile/src/components/features/ChannelRow.tsx`]
- **Description:** Channel list grouped into two sections: "Channels" (public/private channels) and "Direct Messages". Each row shows: channel name/DM participant names, last message preview (truncated), timestamp, unread dot indicator. Sorted by last activity. Pull-to-refresh. Tap navigates to channel detail.
- **Acceptance Criteria:**
  1. Channels and DMs render in separate SectionList sections with headers
  2. Unread channels show bold title + blue dot indicator; read channels show normal weight
  3. Pull-to-refresh re-fetches channel list and updates unread indicators
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-006: Channel detail / message thread screen
- **Type:** feature
- **Priority:** P0
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-003, TASK-005]
- **writeScope:** [`mobile/src/app/(app)/chat/channel/[id].tsx`, `mobile/src/components/features/MessageBubble.tsx`, `mobile/src/components/features/MessageInput.tsx`]
- **Description:** Message thread screen. Inverted FlashList showing messages newest at bottom. Each `MessageBubble` shows: sender avatar + name, message text, timestamp, reaction pills, reply count. Tapping reply count navigates to thread view. `MessageInput` at bottom: text input with send button, keyboard-avoiding behavior. Mark channel as read on mount. Load older messages on scroll to top. Long-press on message shows reaction picker.
- **Acceptance Criteria:**
  1. New messages appear at the bottom without scroll jump; auto-scrolls to bottom when user is near bottom
  2. Keyboard opening pushes input and message list up smoothly (KeyboardAvoidingView)
  3. Long-pressing a message shows emoji reaction sheet; tapping emoji calls `useToggleReaction`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-007: Thread replies screen
- **Type:** feature
- **Priority:** P1
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-006]
- **writeScope:** [`mobile/src/app/(app)/chat/thread/[id].tsx`, `mobile/src/components/features/ThreadHeader.tsx`]
- **Description:** Thread view showing the parent message at top, then replies below. Uses `useThread(messageId)`. Same `MessageBubble` and `MessageInput` components as channel detail. `ThreadHeader` shows the parent message content. Reply sends via `useSendThreadReply`.
- **Acceptance Criteria:**
  1. Parent message is pinned at top with visual distinction (border, background tint)
  2. Replies render chronologically below the parent
  3. Navigating back to channel shows updated reply count on the parent message
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-008: Emoji reaction picker
- **Type:** feature
- **Priority:** P2
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-006]
- **writeScope:** [`mobile/src/components/features/ReactionPicker.tsx`, `mobile/src/components/features/ReactionPills.tsx`]
- **Description:** Bottom sheet emoji picker with common emoji grid (thumbs up, heart, laugh, surprise, sad, fire, eyes, rocket -- 8 quick reactions + "more" for full picker). `ReactionPills` component shows existing reactions below a message as small pills with emoji + count. Tapping your own reaction removes it. Haptic feedback on reaction add.
- **Acceptance Criteria:**
  1. Quick reaction grid shows 8 emojis; tapping one dismisses sheet and adds reaction
  2. Tapping an existing reaction pill you already added removes your reaction (toggle behavior)
  3. Reaction count updates optimistically before server confirmation
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
TASK-002 (hooks) ────> TASK-005 (channel list)
     |                      |
     v                      v
     +──────────────> TASK-006 (channel detail)
     |                      |
     v                      v
     +──────────────> TASK-007 (thread replies)
                            |
                            v
                      TASK-008 (reactions)
```

Critical path: TASK-001 -> TASK-002 -> TASK-005 -> TASK-006 -> TASK-007

## Failure Modes

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Inverted FlashList flickers on new message | Visual: list jumps when message inserted | Use `maintainVisibleContentPosition` prop. Set `estimatedItemSize`. Avoid `scrollToEnd` -- inverted list auto-shows new items at bottom. |
| Keyboard covers input on Android | Input hidden behind keyboard | Use `KeyboardAvoidingView` with `behavior="padding"` on iOS, `behavior="height"` on Android. Test both platforms. |
| Optimistic message rollback leaves ghost | Failed message stays in list | `onError` callback in `useSendMessage` must call `queryClient.setQueryData` to remove the optimistic entry by its temp ID. Show retry action. |
| Reaction toggle race condition | Double-tap sends add+remove | Disable reaction button during mutation. Use `mutateAsync` with loading state. Debounce taps with 500ms cooldown. |
| Unread badge count drift | Badge shows wrong number | Re-sync unread counts from server on channel list mount. Do not rely solely on client-side decrement. |
| Channel deleted while viewing | Crash or blank screen | `useMessages` query returns 404 -> show "Channel no longer available" with back navigation. |
