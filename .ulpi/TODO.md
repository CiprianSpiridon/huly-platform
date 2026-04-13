# Mobile App TODO

## Critical Defects (fix before shipping)

- [ ] **Hooks-of-Rules in AppLayout** — `useChatUnreadSync()` and `useUnreadCount()` called after conditional returns in `mobile/src/app/(app)/_layout.tsx:31`. Split tab shell into child component that mounts only after auth guard passes.
- [ ] **Chat unread query too broad** — `mobile/src/hooks/useChatUnread.ts:27` queries all DocNotifyContext with `{}`. Filter by current user (`user: accountUuid`), restrict to `objectClass` in `[Channel, DirectMessage]`, exclude `hidden: true`.
- [ ] **Chat unread counts never cleared** — Stale badge counts persist when contexts disappear. Rebuild from scratch on each poll: `resetAllUnread()` before repopulating, not incremental patching.
- [ ] **Reaction identity inconsistency** — Verify ALL paths use `useConnectionStore.currentSocialId`. Check: `useMessages.ts` optimistic send, `useThread.ts` optimistic reply, channel/thread `currentUserId` prop, `ReactionPills` comparison. No `'me'`, no `AccountUuid`.
- [ ] **Tracker comments include system messages** — `mobile/src/repositories/activity.ts:70` fetches base `ActivityMessage` class. Change to `chunter:class:ChatMessage` to exclude `DocUpdateMessage`, `ActivityInfoMessage`, `ActivityReference`.

## Phase 7: WebSocket Real-Time (in progress)

- [ ] TASK-WSR-001: RN WebSocket Factory
- [ ] TASK-WSR-002: Transactor Connection (hello, ping/pong, broadcasts)
- [ ] TASK-WSR-003: WebSocket Zustand Store
- [ ] TASK-WSR-004: Tx-to-QueryKey Invalidation Engine
- [ ] TASK-WSR-005: Chat Invalidation Rules
- [ ] TASK-WSR-006: Notification Invalidation Rules
- [ ] TASK-WSR-007: Tracker Invalidation Rules
- [ ] TASK-WSR-008: Reduce Polling Intervals
- [ ] TASK-WSR-009: Connection Status Indicator
- [ ] TASK-WSR-010: AppState and Network Lifecycle
- [ ] TASK-WSR-011: Metro and Package Config
- [ ] TASK-WSR-012: Integration Smoke Test

## Phase 8: Push Notifications (planned)

- [ ] expo-notifications setup + permissions
- [ ] Push token registration with backend
- [ ] Server-side Expo push endpoint
- [ ] Foreground in-app banner
- [ ] Deep linking from notification tap
- [ ] Badge count management
- [ ] Notification preferences screen

## Phase 9: File Attachments (planned)

- [ ] expo-file-system + expo-image-picker deps
- [ ] Attachment repository (Datalake upload)
- [ ] Upload progress store + UI
- [ ] Image picker integration
- [ ] Attachment viewer (images + PDFs)
- [ ] Wire into issues and chat

## Phase 10: Rich Text (planned)

- [ ] Local MarkupNode type declarations
- [ ] MarkupRenderer component
- [ ] Replace plain text in existing screens
- [ ] markupToPlainText utility
- [ ] Basic rich text editor
- [ ] Mention rendering + navigation

## Phase 11: Tests (planned)

- [ ] Jest configuration + setup
- [ ] Mock @hcengineering packages
- [ ] Test factories + fixtures
- [ ] Store unit tests
- [ ] Repository unit tests
- [ ] Hook unit tests
- [ ] Component tests
- [ ] Maestro E2E flows
- [ ] CI configuration
- [ ] Coverage thresholds

## Phase 12: Polish (planned)

- [ ] Assignee picker (replace TODO alert)
- [ ] Member list / contacts directory
- [ ] Global search
- [ ] Onboarding / first-run
- [ ] Error boundaries
- [ ] Accessibility audit
- [ ] Performance audit
- [ ] Settings polish + about screen

## Architectural Debt

- [ ] **Lookup normalization** — HulyClient bypasses `hierarchy.updateLookupMixin()`. Screens manually read `$lookup` with unsafe casts. Should apply upstream REST adapter normalization.
- [ ] **REST barrel import safety** — Metro blocklist handles it, but relying on `{ type: 'empty' }` for api-client transitive deps is fragile. Consider vendoring the REST-only surface.
