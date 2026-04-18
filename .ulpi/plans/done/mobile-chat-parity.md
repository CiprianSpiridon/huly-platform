# Plan: Mobile Chat Feature Parity

## Overview

Close the remaining chat gaps between the web chunter/chat experience and the Expo mobile app.
Current mobile chat covers channel/DM list, channel timeline, thread view, reactions, and basic
attachments. This plan closes the remaining user-facing parity gaps: channel lifecycle and
membership actions, settings, pins, history navigation, typing, message edit/delete, DM/group-DM
creation, richer compose, thread browsing, saved messages, presence, mute controls, persistent
drafts, and video-message support, without widening into cross-app inline comments or
workbench-specific side panels.

## Scope Challenge

- Assumed planning mode: `EXPANSION`
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
- The existing websocket sidecar under `mobile/src/store/websocket.ts` and `mobile/src/realtime/**`
  must remain available for realtime-driven parity tasks

## Non-Goals

- Recreating every Svelte side panel from workbench chat
- Rewriting the chat domain away from the current repository/query/store architecture
- Delivering new server-side chat models beyond what mobile already consumes

## Contracts

- Repository ownership stays in `mobile/src/repositories/chat.ts`
- Server state remains in TanStack Query; ephemeral draft/unread/typing state remains in Zustand
- New chat routes must stay under `mobile/src/app/(app)/chat/**`
- Thread and channel timelines must not diverge on message identity, reaction ownership, or cache keys
- Channel settings shell must own the navigation contract for members, pins, history, and edit flows
- Downstream parity tasks may implement destination routes and mutations, but they must not re-own the settings-shell entrypoint contract
- Typing parity must use the existing websocket sidecar as the event transport instead of inventing a
  polling-only workaround

## Existing Code Leverage

- Current mobile chat routes:
  - [index.tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/chat/index.tsx)
  - [channel/[id].tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/chat/channel/[id].tsx)
  - [thread/[id].tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/chat/thread/[id].tsx)
- Current chat data/state:
  - [chat.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/repositories/chat.ts)
  - [useMessages.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/hooks/useMessages.ts)
  - [useThread.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/hooks/useThread.ts)
  - [useChatUnread.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/hooks/useChatUnread.ts)
  - [chat.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/store/chat.ts)
  - [chat.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/realtime/rules/chat.ts)
  - [websocket.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/store/websocket.ts)
  - [TransactorConnection.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/realtime/TransactorConnection.ts)
- Web chat parity reference surface:
  - [ChannelHeader.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/ChannelHeader.svelte)
  - [ChannelMembers.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/ChannelMembers.svelte)
  - [EditChannel.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/EditChannel.svelte)
  - [PinnedMessages.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/PinnedMessages.svelte)
  - [JumpToDateSelector.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/JumpToDateSelector.svelte)
  - [ConvertDmToPrivateChannel.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/ConvertDmToPrivateChannel.svelte)
  - [ChannelTypingInfo.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/ChannelTypingInfo.svelte)
  - [ThreadView.svelte](/Users/ciprian/work_cip/huly-platform/plugins/chunter-resources/src/components/threads/ThreadView.svelte)

## Scope Update (2026-04-13)

Added TASK-012 through TASK-021 to cover gaps identified in the feature-comparison audit:
edit/delete message, create DM/group DM, rich text editor with @mentions, thread browsing,
online/presence status, saved/bookmarked messages, per-channel mute settings, persistent
message drafts, channel lifecycle/membership actions, and video support.

## Tasks

### TASK-001: Expand chat repository parity contract

Add repository methods for channel detail, members, pinned messages, channel updates, DM conversion,
history search/jump, message edit/delete, DM creation, saved messages, and thread-message correctness.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/src/repositories/chat.ts`, `mobile/src/repositories/index.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && rg -n "pinned|history|edit|delete|saved|dm|group" src/repositories/chat.ts`
- **Acceptance Criteria:**
  1. Repository exposes typed methods for channel detail, members, pinned messages, channel update, DM conversion, message-history search, message edit/delete, DM/group-DM creation, and saved messages.
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
- **validateCommand:** `cd mobile && npx tsc --noEmit && rg -n "invalidateQueries|queryKey|thread" src/hooks/useChannels.ts src/hooks/useMessages.ts src/hooks/useThread.ts`
- **Acceptance Criteria:**
  1. Hooks expose channel-detail, pinned-message, and history-search queries without screens calling repositories directly.
  2. Pin/unpin, channel-update, DM-conversion, and thread-reaction mutations invalidate the exact channel or thread keys they affect.
  3. Thread reaction and reply mutations update both active thread and parent channel caches consistently.

### TASK-003: Fix chat unread and ephemeral state contract

Expand chat client state so unread, draft attachment, and chat-realtime state are consistent across
the app shell and WS invalidation rules.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-001`
- **writeScope:** `mobile/src/store/chat.ts`, `mobile/src/hooks/useChatUnread.ts`, `mobile/src/realtime/rules/chat.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && rg -n "unread|draft|workspace" src/store/chat.ts src/hooks/useChatUnread.ts src/realtime/rules/chat.ts`
- **Acceptance Criteria:**
  1. Unread sync uses the correct account identity and rebuilds unread state from fresh server contexts.
  2. Realtime chat invalidation does not leave stale unread counts behind after channel/message mutations.
  3. Draft attachment and unread state clear on workspace switch instead of leaking into the next session.

### TASK-004: Add active conversation lifecycle wiring

Make channel and thread routes explicitly own active-conversation registration so unread and thread
semantics can distinguish what the user is actually viewing.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-003`
- **writeScope:** `mobile/src/app/(app)/chat/channel/[id].tsx`, `mobile/src/app/(app)/chat/thread/[id].tsx`, `mobile/src/store/chat.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && rg -n "setActive|active.*thread|active.*channel" 'src/app/(app)/chat/channel/[id].tsx' 'src/app/(app)/chat/thread/[id].tsx' src/store/chat.ts`
- **Acceptance Criteria:**
  1. Opening a channel or thread registers an active conversation state that distinguishes channel timeline from thread view.
  2. Self-generated replies in the currently-open conversation do not increment unread counts.
  3. Active conversation state clears on route teardown and back navigation instead of persisting into the next chat route.

### TASK-005: Add channel header and settings shell

Add a first-class channel settings route and make it the owner of downstream settings navigation for
members, pins, history, and edit flows.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-004`
- **writeScope:** `mobile/src/app/(app)/chat/channel/[id].tsx`, `mobile/src/app/(app)/chat/channel/settings/[id].tsx`, `mobile/src/components/features/ChannelHeader.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/app/(app)/chat/channel/settings/[id].tsx' && test -f 'src/components/features/ChannelHeader.tsx' && rg -n "members|pins|history|edit" 'src/app/(app)/chat/channel/settings/[id].tsx' src/components/features/ChannelHeader.tsx`
- **Acceptance Criteria:**
  1. Channel screen header exposes navigation into a typed settings route.
  2. Settings route supports channel name, description, privacy, and basic metadata display/edit.
  3. Settings shell owns stable rows/navigation targets for members, pins, history, and edit flows, even if some downstream routes arrive in later tasks.

### TASK-006: Add channel members and DM conversion flow

Bring member visibility and DM-to-private-channel conversion to mobile so channel collaboration flows
match web behavior more closely.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-005`
- **writeScope:** `mobile/src/app/(app)/chat/channel/members/[id].tsx`, `mobile/src/components/features/ChannelMemberRow.tsx`, `mobile/src/app/(app)/chat/index.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/app/(app)/chat/channel/members/[id].tsx' && test -f 'src/components/features/ChannelMemberRow.tsx' && rg -n "convert|members|private channel|dm" 'src/app/(app)/chat/channel/members/[id].tsx' 'src/app/(app)/chat/index.tsx'`
- **Acceptance Criteria:**
  1. Mobile exposes a members route from channel settings with readable participant rows and empty/error states.
  2. DM surfaces expose a conversion path to private channel only when the repository reports the action is valid.
  3. Failed member fetches or conversion attempts do not leave the channel list in a stale optimistic state.

### TASK-007: Add pinned messages parity

Bring pinned-message browsing and unpin flow to mobile through the settings shell and dedicated pins
screen.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-005`
- **writeScope:** `mobile/src/app/(app)/chat/channel/pins/[id].tsx`, `mobile/src/components/features/PinnedMessageRow.tsx`, `mobile/src/app/(app)/chat/channel/settings/[id].tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/app/(app)/chat/channel/pins/[id].tsx' && test -f 'src/components/features/PinnedMessageRow.tsx' && rg -n "pin|unpin" 'src/app/(app)/chat/channel/settings/[id].tsx' 'src/app/(app)/chat/channel/pins/[id].tsx'`
- **Acceptance Criteria:**
  1. Channel settings route exposes pinned-message browsing through a dedicated pins screen.
  2. Pinned list renders stable previews that navigate back to the underlying message or thread context.
  3. Removing a pin updates the pinned list and source timeline without requiring a full channel refetch.

### TASK-008: Bring thread flow to parity-correctness

Correct the thread model and screen behavior so thread replies, reactions, and attachments behave like a
real thread surface instead of a channel-side variant.

- **Type:** feature
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-003`, `TASK-004`
- **writeScope:** `mobile/src/repositories/chat.ts`, `mobile/src/hooks/useThread.ts`, `mobile/src/app/(app)/chat/thread/[id].tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && rg -n "thread|reply|attachment|reaction" src/repositories/chat.ts src/hooks/useThread.ts 'src/app/(app)/chat/thread/[id].tsx'`
- **Acceptance Criteria:**
  1. Thread screen reads and mutates thread-specific cache keys, including reactions and reply inserts.
  2. Reply creation uses the correct thread semantics so replies do not leak back into the main channel timeline.
  3. Thread attachment and reaction actions update the active thread view immediately and recover cleanly on failure.

### TASK-009: Add channel history search and jump-to-date

Expose history navigation beyond infinite scroll so mobile users can find older conversation context like
they can on web. `TASK-005` owns the settings-shell entry row; this task owns the destination route,
history query behavior, and jump semantics.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-005`
- **writeScope:** `mobile/src/app/(app)/chat/channel/search/[id].tsx`, `mobile/src/components/features/JumpToDatePicker.tsx`, `mobile/src/hooks/useMessages.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/app/(app)/chat/channel/search/[id].tsx' && test -f 'src/components/features/JumpToDatePicker.tsx' && rg -n "jump|history|search" 'src/app/(app)/chat/channel/search/[id].tsx' src/hooks/useMessages.ts`
- **Acceptance Criteria:**
  1. Searchable message history integrates with the settings-shell entrypoint established in `TASK-005` without collapsing the main message list state.
  2. Jump-to-date loads the nearest history window and lands the user on a stable anchor message.
  3. When the requested history window has no results, the UI reports that explicitly instead of silently resetting to newest messages.

### TASK-010: Add channel create/edit surfaces

Bring mobile up to basic channel administration parity so users can create channels and edit existing
channel metadata without leaving mobile.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-005`
- **writeScope:** `mobile/src/app/(app)/chat/new.tsx`, `mobile/src/app/(app)/chat/edit/[id].tsx`, `mobile/src/components/features/ChannelForm.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/app/(app)/chat/new.tsx' && test -f 'src/app/(app)/chat/edit/[id].tsx' && test -f 'src/components/features/ChannelForm.tsx'`
- **Acceptance Criteria:**
  1. Mobile exposes typed routes for creating a channel and editing an existing channel.
  2. Channel form supports name, description, privacy, and member selection with validation.
  3. Save failures keep the form open with recoverable field or transport errors instead of dropping the user back to the list.

### TASK-011: Add typing indicator parity

Use the existing websocket sidecar as the event transport for typing participants in channel view.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-003`, `TASK-004`, `TASK-012`
- **writeScope:** `mobile/src/app/(app)/chat/channel/[id].tsx`, `mobile/src/components/features/TypingIndicator.tsx`, `mobile/src/realtime/TransactorConnection.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/components/features/TypingIndicator.tsx' && rg -n "typing" 'src/app/(app)/chat/channel/[id].tsx' src/components/features/TypingIndicator.tsx src/realtime/TransactorConnection.ts`
- **Acceptance Criteria:**
  1. Channel view renders typing participants only for the active conversation and clears them on navigation away.
  2. Typing state is sourced from the websocket sidecar and degrades cleanly when websocket connectivity is unavailable.
  3. Typing updates do not trigger full timeline refetches or duplicate unread-count changes.

### TASK-012: Add message edit and delete

Add edit and delete actions to messages in channel and thread views via long-press context menu.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-005`, `TASK-008`
- **writeScope:** `mobile/src/app/(app)/chat/channel/[id].tsx`, `mobile/src/components/features/MessageBubble.tsx`, `mobile/src/repositories/chat.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && rg -n "edit|delete|edited" 'src/app/(app)/chat/channel/[id].tsx' src/components/features/MessageBubble.tsx src/repositories/chat.ts`
- **Acceptance Criteria:**
  1. Long-press on a message authored by the current user shows Edit and Delete actions; messages by others show only Delete if the user has moderation rights.
  2. Edit opens an inline editor pre-populated with the message content; saving updates the message and shows an "edited" indicator with timestamp.
  3. Delete shows a confirmation dialog; successful deletion removes the message from the timeline with optimistic cache update and proper invalidation.

### TASK-013: Add create DM and group DM flow

Allow users to initiate new direct message and group DM conversations from the chat list.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-002`, `TASK-006`
- **writeScope:** `mobile/src/app/(app)/chat/new-dm.tsx`, `mobile/src/components/features/MemberSelector.tsx`, `mobile/src/app/(app)/chat/index.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/app/(app)/chat/new-dm.tsx' && test -f 'src/components/features/MemberSelector.tsx' && rg -n "New Message|group|duplicate|existing" 'src/app/(app)/chat/new-dm.tsx' 'src/app/(app)/chat/index.tsx'`
- **Acceptance Criteria:**
  1. Chat list exposes a "New Message" entry point that opens a member selector with search for starting 1:1 or group DMs.
  2. Selecting members and confirming creates the DM/group-DM via the repository and navigates to the new conversation.
  3. If a DM with the selected member already exists, navigates to the existing conversation instead of creating a duplicate.

### TASK-014: Add rich text editor toolbar and @mention insertion

Upgrade the chat message composer with a formatting toolbar and inline @mention picker.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-002`
- **writeScope:** `mobile/src/components/features/MessageInput.tsx`, `mobile/src/components/features/RichTextEditor.tsx`, `mobile/src/components/features/MentionSuggestions.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/components/features/RichTextEditor.tsx' && test -f 'src/components/features/MentionSuggestions.tsx' && rg -n "mention|bold|italic|code|link" src/components/features/MessageInput.tsx src/components/features/RichTextEditor.tsx src/components/features/MentionSuggestions.tsx`
- **Acceptance Criteria:**
  1. The shared composer used by both channel and thread screens shows a toolbar with bold, italic, code, and link formatting actions that wrap selected text or insert markers at cursor.
  2. Typing "@" triggers a searchable member suggestions overlay; selecting a member inserts a mention reference that renders as a tappable chip.
  3. Formatted content serializes to the same markup format the server expects and renders correctly via MarkupRenderer on receipt.

### TASK-015: Add thread browsing (all threads view)

Add a threads list screen accessible from the chat tab showing all active threads across channels.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-002`, `TASK-008`, `TASK-013`
- **writeScope:** `mobile/src/app/(app)/chat/index.tsx`, `mobile/src/app/(app)/chat/threads.tsx`, `mobile/src/hooks/useThread.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/app/(app)/chat/threads.tsx' && rg -n "threads|router|Thread" 'src/app/(app)/chat/index.tsx' 'src/app/(app)/chat/threads.tsx' src/hooks/useThread.ts`
- **Acceptance Criteria:**
  1. Chat tab exposes a threads entry point that lists all threads the user participates in, sorted by latest reply.
  2. Each row shows the parent message preview, reply count, last reply timestamp, and channel name.
  3. Tapping a thread row navigates to the existing thread screen; empty state shows when the user has no active threads.

### TASK-016: Add online/presence status

Show user online/offline status indicators on channel members, DM headers, and message avatars.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-003`, `TASK-011`
- **writeScope:** `mobile/src/components/ui/AvatarCircle.tsx`, `mobile/src/hooks/usePresence.ts`, `mobile/src/realtime/TransactorConnection.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/hooks/usePresence.ts' && rg -n "presence|online|last seen" src/components/ui/AvatarCircle.tsx src/hooks/usePresence.ts src/realtime/TransactorConnection.ts`
- **Acceptance Criteria:**
  1. AvatarCircle renders a green dot overlay when the user is online, sourced from presence data via the WebSocket sidecar.
  2. DM conversation header shows the other user's presence status (online/offline/last seen).
  3. Presence degrades gracefully when WebSocket is disconnected — shows no indicator instead of stale "online" status.

### TASK-017: Add saved/bookmarked messages

Allow users to save messages for later reference and browse saved messages from a dedicated screen.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-002`, `TASK-015`
- **writeScope:** `mobile/src/app/(app)/chat/index.tsx`, `mobile/src/app/(app)/chat/saved.tsx`, `mobile/src/components/features/SavedMessageRow.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/app/(app)/chat/saved.tsx' && test -f 'src/components/features/SavedMessageRow.tsx' && rg -n "saved|bookmark|unsave" 'src/app/(app)/chat/index.tsx' 'src/app/(app)/chat/saved.tsx'`
- **Acceptance Criteria:**
  1. Long-press on any message shows a "Save" action; saved messages are stored server-side via the existing savedMessages API.
  2. A "Saved Messages" screen accessible from the chat list shows all bookmarked messages with channel context and timestamp.
  3. Tapping a saved message navigates to the source channel/thread; unsaving removes it from the list with optimistic update.

### TASK-018: Add per-channel mute/notification settings

Allow users to mute channels or customize notification preferences per conversation.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-005`, `TASK-007`, `TASK-020`
- **writeScope:** `mobile/src/app/(app)/chat/channel/settings/[id].tsx`, `mobile/src/repositories/chat.ts`, `mobile/src/hooks/useChannels.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && rg -n "mute|notification" 'src/app/(app)/chat/channel/settings/[id].tsx' src/repositories/chat.ts src/hooks/useChannels.ts`
- **Acceptance Criteria:**
  1. Channel settings shell includes a mute toggle that suppresses push and in-app notifications for the channel.
  2. Muted channels show a mute icon in the channel list and do not contribute to the unread badge count.
  3. Mute state persists server-side so it syncs across devices and survives app reinstalls.

### TASK-019: Persist message drafts to storage

Upgrade in-memory chat drafts to persist across app restarts via AsyncStorage.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-003`, `TASK-008`, `TASK-011`
- **writeScope:** `mobile/src/store/chat.ts`, `mobile/src/app/(app)/chat/channel/[id].tsx`, `mobile/src/app/(app)/chat/thread/[id].tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && rg -n "draft|AsyncStorage|pencil" src/store/chat.ts 'src/app/(app)/chat/channel/[id].tsx' 'src/app/(app)/chat/thread/[id].tsx'`
- **Acceptance Criteria:**
  1. Message drafts persist to AsyncStorage keyed by channel/thread id and restore when the user returns to the conversation.
  2. Drafts clear on successful message send and on workspace switch.
  3. Draft indicator (pencil icon) shows in the channel list for conversations with unsent drafts.

### TASK-020: Add channel lifecycle and membership actions

Close the remaining channel administration gap by adding join/leave plus archive/delete actions to
the settings shell and list surfaces.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-005`, `TASK-007`, `TASK-013`
- **writeScope:** `mobile/src/app/(app)/chat/channel/settings/[id].tsx`, `mobile/src/app/(app)/chat/index.tsx`, `mobile/src/repositories/chat.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit && rg -n "join|leave|archive|delete" 'src/app/(app)/chat/channel/settings/[id].tsx' 'src/app/(app)/chat/index.tsx' src/repositories/chat.ts`
- **Acceptance Criteria:**
  1. Channel settings exposes join/leave actions where appropriate and archive/delete actions when the current user has permission.
  2. Archive/delete mutations remove or update the affected conversation in the chat list without leaving stale routes behind.
  3. Join/leave and archive/delete failures show recoverable errors and do not desynchronize list membership state.

### TASK-021: Add video message support

Close the remaining media gap by rendering video attachments/messages with an explicit playback path
instead of generic file-only handling.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-008`
- **writeScope:** `mobile/src/components/features/MessageBubble.tsx`, `mobile/src/components/features/AttachmentViewer.tsx`, `mobile/src/components/features/VideoMessage.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit && test -f 'src/components/features/VideoMessage.tsx' && rg -n "video|playback|unsupported" src/components/features/MessageBubble.tsx src/components/features/AttachmentViewer.tsx src/components/features/VideoMessage.tsx`
- **Acceptance Criteria:**
  1. Video attachments/messages render with a recognizable inline preview and play affordance inside channel and thread timelines.
  2. Opening a video launches a stable playback surface with loading, error, and unsupported-format fallbacks.
  3. Non-video attachments keep their current behavior and video detection does not misclassify images or generic files.

## Failure Modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| Thread reaction updates the wrong cache | Reaction changes do not appear in the open thread | Invalidate and patch the thread cache directly, not only the channel cache |
| DM conversion succeeds server-side but list stays stale | Converted conversation remains rendered as a DM | Invalidate DM and channel list keys together after conversion |
| Typing indicator leaks across channels | Typing names remain visible after navigation | Clear typing state on active-channel change and route teardown |
| History search returns message ids without stable anchor context | Jump opens wrong part of the conversation | Carry anchor metadata and refetch the surrounding history window before navigation |
| Pinned messages diverge from timeline | Pin state differs between pins screen and source message context | Treat pin/unpin as a shared mutation contract with one invalidation owner |
| Message edit race condition | User edits while another user replies | Optimistic update uses message version; server rejects stale edits with clear error |
| Duplicate DM creation | Two users create DM with each other simultaneously | Repository checks existing DMs before creating; navigates to existing if found |
| Draft restored after send | AsyncStorage write races with send completion | Clear draft synchronously on send initiation, not on server confirmation |
| Presence shows stale online | WebSocket disconnects without cleanup | Presence hook clears all status on disconnect event |
| Channel archive/delete leaves stale list state | Removed channel still appears in list or remains open | Invalidate chat list and redirect away from inaccessible channel after successful mutation |
| Video message fails on unsupported media | User taps video and sees blank surface | Show explicit unsupported/error state and preserve download/view fallback |

## Ship Cut

If execution stops halfway, the minimum coherent cut is after `TASK-020`.

That cut yields:
- channel settings shell
- active conversation lifecycle correctness
- members and DM conversion
- pinned messages
- thread correctness
- message edit and delete
- create DM / group DM
- channel join/leave/archive/delete

Items below that cut and safe to defer:
- rich text editor toolbar
- thread browsing
- online/presence status
- saved/bookmarked messages
- per-channel mute settings
- persistent message drafts
- history search / jump-to-date
- channel create/edit administration
- typing indicator parity
- video-message support

## Test Coverage Map

- `TASK-001`: repository contract + inaccessible-channel handling
- `TASK-002`: query invalidation and channel/thread cache consistency
- `TASK-003`: unread identity, stale-unread cleanup, and workspace-switch cleanup
- `TASK-004`: active conversation lifecycle and unread-guard behavior
- `TASK-005`: settings-shell routing + inaccessible-channel fallback
- `TASK-006`: members route success + DM conversion failure rollback
- `TASK-007`: pin browsing/unpin flow + settings-shell integration
- `TASK-008`: thread reply/reaction correctness + no-leak-to-channel invariant
- `TASK-009`: history search empty-result and jump-anchor behavior
- `TASK-010`: channel form validation + save failure retention
- `TASK-011`: websocket-backed typing success + offline degradation
- `TASK-012`: edit inline + delete confirmation + edited indicator + optimistic cache
- `TASK-013`: DM creation + duplicate detection + group DM member selector
- `TASK-014`: toolbar formatting + mention insertion + markup serialization roundtrip
- `TASK-015`: thread list rendering + empty state + navigation to thread screen
- `TASK-016`: presence dot rendering + DM header status + disconnect degradation
- `TASK-017`: save/unsave action + saved messages screen + source navigation
- `TASK-018`: mute toggle + unread badge exclusion + server-side persistence
- `TASK-019`: draft persistence + send-clear + workspace-switch-clear + draft indicator
- `TASK-020`: join/leave and archive/delete actions + stale-route recovery
- `TASK-021`: inline video preview + playback fallback + media-type safety

## Concurrent Write Policy

Multiple tasks write to the same files. File-overlap ordering edges have been added to serialize
conflicting writes. Key shared files and their write order:

| File | Write Order (by dependency) |
| --- | --- |
| `channel/[id].tsx` | TASK-004 → TASK-005 → TASK-012 → TASK-011 → TASK-019 |
| `chat/index.tsx` | TASK-006 → TASK-013 → TASK-015 → TASK-017 → TASK-020 |
| `repositories/chat.ts` | TASK-008 → TASK-012 → TASK-020 → TASK-018 |
| `settings/[id].tsx` | TASK-005 → TASK-007 → TASK-020 → TASK-018 |
| `store/chat.ts` | TASK-003 → TASK-004 → TASK-019 |
| `thread/[id].tsx` | TASK-004 → TASK-008 → TASK-019 |

## Execution Summary

- Tasks: 21
- Single P0 root: `TASK-001`
- Parallel after TASK-001:
  - Branch A: `TASK-002` (hooks parity)
  - Branch B: `TASK-003 -> TASK-004` (unread + active conversation)
- Both branches converge at `TASK-008` (thread parity, needs TASK-002 + TASK-004)
- Main critical path:
  - `TASK-001 -> TASK-003 -> TASK-004 -> TASK-008 -> TASK-012 -> TASK-011 -> TASK-019`
- Settings/admin path (via TASK-002):
  - `TASK-001 -> TASK-002 -> TASK-005 -> TASK-006 -> TASK-013 -> TASK-020 -> TASK-018`
- Pin/history path:
  - `TASK-005 -> TASK-007 -> TASK-020`
  - `TASK-005 -> TASK-009`
- Channel lifecycle path:
  - `TASK-005 -> TASK-007 -> TASK-020`
- Optional parity paths:
  - `TASK-005 -> TASK-010` (channel create/edit)
  - `TASK-002 -> TASK-014` (rich text editor)
  - `TASK-008 -> TASK-013 -> TASK-015 -> TASK-017` (thread browsing + saved)
  - `TASK-011 -> TASK-016` (presence)
  - `TASK-008 -> TASK-021` (video)

## Task Dependencies

Derived from per-task `Depends on` fields. File-overlap ordering edges marked with `(file)`.

```text
TASK-001 -> TASK-002
TASK-001 -> TASK-003

TASK-002 -> TASK-005
TASK-002 -> TASK-008
TASK-002 -> TASK-013
TASK-002 -> TASK-014
TASK-002 -> TASK-015

TASK-003 -> TASK-004
TASK-003 -> TASK-008
TASK-003 -> TASK-011
TASK-003 -> TASK-016
TASK-003 -> TASK-019

TASK-004 -> TASK-005  (file: channel/[id].tsx)
TASK-004 -> TASK-008
TASK-004 -> TASK-011

TASK-005 -> TASK-006
TASK-005 -> TASK-007
TASK-005 -> TASK-009
TASK-005 -> TASK-010
TASK-005 -> TASK-012  (file: channel/[id].tsx)
TASK-005 -> TASK-018
TASK-005 -> TASK-020

TASK-006 -> TASK-013  (file: chat/index.tsx)

TASK-007 -> TASK-020  (file: settings/[id].tsx)
TASK-007 -> TASK-018  (file: settings/[id].tsx)

TASK-008 -> TASK-012  (file: repositories/chat.ts)
TASK-008 -> TASK-015
TASK-008 -> TASK-019  (file: thread/[id].tsx)
TASK-008 -> TASK-021

TASK-011 -> TASK-016
TASK-011 -> TASK-019  (file: channel/[id].tsx)

TASK-012 -> TASK-011  (file: channel/[id].tsx)
TASK-012 -> TASK-020  (file: repositories/chat.ts)

TASK-013 -> TASK-015  (file: chat/index.tsx)
TASK-013 -> TASK-020  (file: chat/index.tsx)

TASK-015 -> TASK-017  (file: chat/index.tsx)

TASK-020 -> TASK-018  (file: settings/[id].tsx, repositories/chat.ts)
```
