# Plan: Mobile Chat Feature Parity

## Overview

Close the highest-value chat gap between the web chunter/chat experience and the Expo mobile app.
Current mobile chat covers channel/DM list, channel timeline, thread view, reactions, and basic
attachments. Web chat additionally exposes channel settings, members, pinned messages, richer
thread semantics, channel history navigation, typing indicators, and DM-to-private-channel flows.
This plan targets parity for those user-facing chat workflows without widening into cross-app inline
comments or workbench-specific side panels.

## Scope Challenge

- Assumed planning mode: `HOLD`
- Assumed default review: `claude`
- Scope cut applied: focus on chat parity inside `mobile/src/app/(app)/chat/**`, chat hooks/store,
  and the chat repository/realtime rules
- Explicitly excluded from this plan:
  - document inline comments / doc-aside parity
  - workbench widget/tab extensions
  - mail or inbox notification presenter parity

## Prerequisites

- Existing scaffold/auth/api client/chat phases are already implemented in `mobile/`
- `mobile-attachments` should be complete before attachment-heavy channel/thread parity is called done
- `mobile-websocket` should be complete before typing-indicator parity is called done

## Non-Goals

- Recreating every Svelte side panel from workbench chat
- Rewriting the chat domain away from the current repository/query/store architecture
- Delivering new server-side chat models beyond what mobile already consumes

## Contracts

- Repository ownership stays in `mobile/src/repositories/chat.ts`
- Server state remains in TanStack Query; ephemeral draft/unread/typing state remains in Zustand
- New chat routes must stay under `mobile/src/app/(app)/chat/**`
- Thread and channel timelines must not diverge on message identity, reaction ownership, or cache keys
- If typing/presence infrastructure is unavailable, screens must degrade cleanly without broken loading loops

## Existing Code Leverage

- Current mobile chat routes:
  - [index.tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/chat/index.tsx)
  - [channel/[id].tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/chat/channel/[id].tsx)
  - [thread/[id].tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/chat/thread/[id].tsx)
- Current chat data/state:
  - [chat.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/repositories/chat.ts)
  - [useMessages.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/hooks/useMessages.ts)
  - [useThread.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/hooks/useThread.ts)
  - [chat.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/store/chat.ts)
- Web chat parity reference surface:
  - [ChannelHeader.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/ChannelHeader.svelte)
  - [ChannelMembers.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/ChannelMembers.svelte)
  - [EditChannel.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/EditChannel.svelte)
  - [PinnedMessages.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/PinnedMessages.svelte)
  - [JumpToDateSelector.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/JumpToDateSelector.svelte)
  - [ConvertDmToPrivateChannel.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/ConvertDmToPrivateChannel.svelte)
  - [ChannelTypingInfo.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/ChannelTypingInfo.svelte)
  - [ThreadView.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/threads/ThreadView.svelte)

## Tasks

### TASK-001: Expand chat repository parity contract

Add repository methods for channel detail, members, pinned messages, channel updates, DM conversion,
history search/jump, and thread-message correctness.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/src/repositories/chat.ts`, `mobile/src/repositories/index.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Repository exposes typed methods for channel detail, members, pinned messages, channel update, DM conversion, and message-history search.
  2. Thread fetch/send paths distinguish parent timeline messages from thread replies instead of returning ambiguous mixed payloads.
  3. Removed or inaccessible channels return typed empty/failure states instead of crashing dependent screens.

### TASK-002: Extend chat hooks for parity queries and mutations

Wire the expanded repository contract into TanStack Query so channel settings, pins, history search,
and thread correctness all share the same cache model.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-001`
- **writeScope:** `mobile/src/hooks/useChannels.ts`, `mobile/src/hooks/useMessages.ts`, `mobile/src/hooks/useThread.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Hooks expose channel-detail, pinned-message, and history-search queries without screens calling repositories directly.
  2. Pin/unpin, channel-update, DM-conversion, and thread-reaction mutations invalidate the exact channel or thread keys they affect.
  3. Thread reaction and reply mutations update both active thread and parent channel caches consistently.

### TASK-003: Fix chat store and unread/typing parity state

Expand chat client state so unread, active thread, typing participants, and draft attachment state are
consistent across channel and thread views.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-001`
- **writeScope:** `mobile/src/store/chat.ts`, `mobile/src/hooks/useChatUnread.ts`, `mobile/src/realtime/rules/chat.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Unread sync uses the correct account identity and rebuilds unread state from fresh server contexts.
  2. Active thread/channel state prevents self-generated replies from incrementing unread counts for the currently-open conversation.
  3. Typing and draft attachment state clear on route teardown and workspace switch instead of leaking into the next conversation.

### TASK-004: Add channel header and settings surfaces

Add a first-class channel settings route so mobile users can inspect and edit channel metadata the way
web users can.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`
- **writeScope:** `mobile/src/app/(app)/chat/channel/[id].tsx`, `mobile/src/app/(app)/chat/channel/settings/[id].tsx`, `mobile/src/components/features/ChannelHeader.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Channel screen header exposes navigation into a typed settings route.
  2. Settings route supports channel name, description, privacy, and basic metadata display/edit.
  3. Channels removed or made inaccessible while settings are open render a recoverable error state instead of a blank screen.

### TASK-005: Add channel members and DM conversion flow

Bring member visibility and DM-to-private-channel conversion to mobile so channel collaboration flows
match web behavior more closely.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-004`
- **writeScope:** `mobile/src/app/(app)/chat/channel/members/[id].tsx`, `mobile/src/components/features/ChannelMemberRow.tsx`, `mobile/src/app/(app)/chat/index.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Mobile exposes a members route from channel settings with readable participant rows and empty/error states.
  2. DM surfaces expose a conversion path to private channel only when the repository reports the action is valid.
  3. Failed member fetches or conversion attempts do not leave the channel list in a stale optimistic state.

### TASK-006: Add pinned messages parity

Bring pin/unpin and pinned-message browsing to mobile so important channel context is available outside
the live timeline.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-004`
- **writeScope:** `mobile/src/app/(app)/chat/channel/pins/[id].tsx`, `mobile/src/components/features/PinnedMessageRow.tsx`, `mobile/src/components/features/MessageBubble.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Message surfaces expose pin/unpin affordances and channel settings route exposes pinned-message browsing.
  2. Pinned list renders stable previews that navigate back to the underlying message or thread context.
  3. Removing a pin updates the pinned list and source timeline without requiring a full channel refetch.

### TASK-007: Bring thread flow to parity-correctness

Correct the thread model and screen behavior so thread replies, reactions, and attachments behave like a
real thread surface instead of a channel-side variant.

- **Type:** feature
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-003`
- **writeScope:** `mobile/src/repositories/chat.ts`, `mobile/src/hooks/useThread.ts`, `mobile/src/app/(app)/chat/thread/[id].tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Thread screen reads and mutates thread-specific cache keys, including reactions and reply inserts.
  2. Reply creation uses the correct thread semantics so replies do not leak back into the main channel timeline.
  3. Thread attachment and reaction actions update the active thread view immediately and recover cleanly on failure.

### TASK-008: Add channel history search and jump-to-date

Expose history navigation beyond infinite scroll so mobile users can find older conversation context like
they can on web.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-004`
- **writeScope:** `mobile/src/app/(app)/chat/channel/search/[id].tsx`, `mobile/src/components/features/JumpToDatePicker.tsx`, `mobile/src/hooks/useMessages.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Channel routes expose searchable message history by text and date without collapsing the main message list state.
  2. Jump-to-date loads the nearest history window and lands the user on a stable anchor message.
  3. When the requested history window has no results, the UI reports that explicitly instead of silently resetting to newest messages.

### TASK-009: Add channel create/edit surfaces

Bring mobile up to basic channel administration parity so users can create channels and edit existing
channel metadata without leaving mobile.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-004`
- **writeScope:** `mobile/src/app/(app)/chat/new.tsx`, `mobile/src/app/(app)/chat/edit/[id].tsx`, `mobile/src/components/features/ChannelForm.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Mobile exposes typed routes for creating a channel and editing an existing channel.
  2. Channel form supports name, description, privacy, and member selection with validation.
  3. Save failures keep the form open with recoverable field or transport errors instead of dropping the user back to the list.

### TASK-010: Add typing indicator parity

Use the websocket/realtime layer to show typing participants in channel view without introducing unstable
polling loops.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-002`, `TASK-003`
- **writeScope:** `mobile/src/app/(app)/chat/channel/[id].tsx`, `mobile/src/components/features/TypingIndicator.tsx`, `mobile/src/hooks/useMessages.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Channel view renders typing participants only for the active conversation and clears them on navigation away.
  2. Typing state degrades cleanly when websocket connectivity is unavailable.
  3. Typing updates do not trigger full timeline refetches or duplicate unread-count changes.

## Failure Modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| Thread reaction updates the wrong cache | Reaction changes do not appear in the open thread | Invalidate and patch the thread cache directly, not only the channel cache |
| DM conversion succeeds server-side but list stays stale | Converted conversation remains rendered as a DM | Invalidate DM and channel list keys together after conversion |
| Typing indicator leaks across channels | Typing names remain visible after navigation | Clear typing state on active-channel change and route teardown |
| History search returns message ids without stable anchor context | Jump opens wrong part of the conversation | Carry anchor metadata and refetch the surrounding history window before navigation |
| Pinned messages diverge from timeline | Pin state differs between pins screen and message bubble | Treat pin/unpin as a shared mutation contract with one invalidation owner |

## Ship Cut

If execution stops halfway, the minimum coherent cut is after `TASK-007`.

That cut yields:
- channel settings
- members and DM conversion
- pinned messages
- thread correctness

Items below that cut and safe to defer:
- history search / jump-to-date
- channel create/edit administration
- typing indicator parity

## Test Coverage Map

- `TASK-001`: repository contract + inaccessible-channel handling
- `TASK-002`: query invalidation and channel/thread cache consistency
- `TASK-003`: unread identity, active-thread guard, and teardown cleanup
- `TASK-004`: channel settings load/save + inaccessible-channel fallback
- `TASK-005`: members route success + DM conversion failure rollback
- `TASK-006`: pin/unpin optimistic flow + timeline/pins consistency
- `TASK-007`: thread reply/reaction correctness + no-leak-to-channel invariant
- `TASK-008`: history search empty-result and jump-anchor behavior
- `TASK-009`: channel form validation + save failure retention
- `TASK-010`: typing indicator realtime success + offline degradation

## Execution Summary

- Tasks: 10
- Parallelizable foundations:
  - `TASK-001`
  - `TASK-003`
- Main critical path:
  - `TASK-001 -> TASK-002 -> TASK-004 -> TASK-006 -> TASK-007`
- Secondary path:
  - `TASK-001 -> TASK-002 -> TASK-004 -> TASK-005`
- Realtime/polish path:
  - `TASK-003 -> TASK-010`
  - `TASK-004 -> TASK-008`
  - `TASK-004 -> TASK-009`

## Task Dependencies

```text
TASK-001 -> TASK-002
TASK-001 -> TASK-003
TASK-001 -> TASK-004
TASK-001 -> TASK-005
TASK-001 -> TASK-006
TASK-001 -> TASK-007
TASK-001 -> TASK-008
TASK-001 -> TASK-009

TASK-002 -> TASK-004
TASK-002 -> TASK-005
TASK-002 -> TASK-006
TASK-002 -> TASK-007
TASK-002 -> TASK-008
TASK-002 -> TASK-009
TASK-002 -> TASK-010

TASK-003 -> TASK-007
TASK-003 -> TASK-010

TASK-004 -> TASK-005
TASK-004 -> TASK-006
TASK-004 -> TASK-008
TASK-004 -> TASK-009
```
