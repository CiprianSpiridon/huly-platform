# Plan: Mobile Infrastructure Parity

## Overview

Close the prioritized cross-cutting infrastructure gaps between the web platform and the Expo mobile app.
The mobile app already has: WebSocket with auto-reconnect, Tx-based query invalidation, error
boundary, FlatList/FlashList virtualization, cursor-based pagination, expo-image caching,
MarkupRenderer for rich text (headings, bold, italic, lists, links, code blocks, mentions),
accessibility labels/roles, touch targets, expo-sharing, deep linking (huly:// scheme), and
a dark/light/system theme. This plan adds i18n framework, crash reporting (Sentry), code
syntax highlighting, inline image rendering in markup, global error toast, clipboard support,
offline mutation queue, universal links, and haptic feedback.

## Scope Challenge

- Assumed planning mode: `EXPANSION`
- Assumed default review: `claude`
- Scope cut applied: focus on cross-cutting infrastructure inside `mobile/src/` that affects
  multiple modules, not module-specific feature gaps
- Explicitly excluded from this plan:
  - mermaid diagram rendering (complex, P3, very low user impact)
  - analytics / telemetry (requires privacy review and consent flow)
  - module-specific features (covered by tracker/chat/inbox/settings parity plans)

## Prerequisites

- Existing mobile app scaffold with NativeWind, expo-router, TanStack Query, Zustand
- MarkupRenderer component handles basic rich text already
- ErrorBoundary wraps the app at root layout level
- WebSocket sidecar operational for real-time invalidation
- Hosted `apple-app-site-association` and `assetlinks.json` files for `huly.io` must exist before `TASK-008`

## Non-Goals

- Mermaid diagram rendering (P3, deferred)
- Analytics / telemetry (requires privacy review)
- Full offline-first architecture (only mutation queue, not offline reads)

## Contracts

- i18n framework must be non-invasive: wrap existing strings progressively, not a big-bang rewrite
- Each task that introduces a new native/runtime dependency must own its `mobile/package.json` and config changes
- Sentry must not transmit PII (tokens, emails, workspace data) in crash reports
- Offline mutation queue in this plan covers mutations routed through the shared Huly mutation helpers
- Universal links must coexist with the existing `huly://` custom scheme
- Haptic feedback must respect system accessibility "reduce motion" settings

## Existing Code Leverage

- Current infrastructure:
  - [MarkupRenderer.tsx](mobile/src/components/features/MarkupRenderer.tsx)
  - [ErrorBoundary.tsx](mobile/src/components/features/ErrorBoundary.tsx)
  - [TransactorConnection.ts](mobile/src/realtime/TransactorConnection.ts)
  - [websocket.ts](mobile/src/store/websocket.ts)
  - [format.ts](mobile/src/lib/format.ts)
  - [app.json](mobile/app.json)
  - [_layout.tsx](mobile/src/app/_layout.tsx) (root layout)

## Tasks

### TASK-001: Add i18n framework with progressive string extraction

Set up react-i18next with a baseline English translation file and wrap the most visible
screens (login, settings, tab labels) as a proof of progressive adoption.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/package.json`, `mobile/src/lib/i18n.ts`, `mobile/src/app/_layout.tsx`, `mobile/src/app/(app)/_layout.tsx`, `mobile/src/app/(auth)/login.tsx`, `mobile/src/app/(app)/settings/index.tsx`, `mobile/assets/locales/en.json`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. react-i18next is configured with English as default language and lazy-loaded locale files from `assets/locales/`.
  2. At least 3 screens (login, settings index, tab labels) use `useTranslation()` instead of hardcoded strings.
  3. Missing translation keys fall back to English and log a dev warning, not a crash or empty string.

### TASK-002: Add Sentry crash reporting

Integrate `@sentry/react-native` for crash reporting and unhandled exception tracking.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-001`
- **writeScope:** `mobile/package.json`, `mobile/src/lib/sentry.ts`, `mobile/src/app/_layout.tsx`, `mobile/src/components/features/ErrorBoundary.tsx`, `mobile/app.json`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Sentry initializes at app startup with DSN from environment config; disabled in dev mode.
  2. ErrorBoundary's `componentDidCatch` sends the error to Sentry with breadcrumbs (screen name, last action).
  3. No PII (auth tokens, email addresses, workspace URLs) appears in Sentry event payloads; scrubbing rules are configured.

### TASK-003: Add code syntax highlighting in MarkupRenderer

Upgrade code blocks in MarkupRenderer to render with syntax highlighting.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **writeScope:** `mobile/src/components/features/MarkupRenderer.tsx`, `mobile/src/lib/syntax-highlight.ts`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Code blocks with a language annotation (e.g., ` ```typescript `) render with syntax-highlighted tokens using a lightweight RN-compatible highlighter.
  2. Code blocks without a language annotation render as plain monospace text (no crash, no empty block).
  3. Highlighting does not block the main thread for large code blocks (>100 lines); uses memo to prevent re-renders.

### TASK-004: Add inline image rendering in MarkupRenderer

Upgrade image references in markup from text links to actual inline images.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-003`
- **writeScope:** `mobile/src/components/features/MarkupRenderer.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Markup `<img>` tags and image references render as inline `expo-image` components with automatic caching.
  2. Images respect a maximum width (screen width - padding) and maintain aspect ratio; tapping opens full-screen viewer.
  3. Broken image URLs show a placeholder icon instead of crashing the renderer or showing a blank space.

### TASK-005: Add global error toast

Replace per-screen error handling with a global toast/snackbar system for network and
mutation errors.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **writeScope:** `mobile/src/components/ui/ErrorToast.tsx`, `mobile/src/store/toast.ts`, `mobile/src/client/queryClient.ts`, `mobile/src/app/_layout.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. A global toast component mounts at root layout level and shows error messages dispatched from anywhere via a Zustand store.
  2. Toast auto-dismisses after 4s but can be manually dismissed; multiple toasts queue rather than overlap.
  3. Network errors from TanStack Query's `onError` global handler route to the toast without per-screen wiring.

### TASK-006: Add clipboard copy for messages and code blocks

Allow users to copy message text and code block content to clipboard.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-005`
- **writeScope:** `mobile/package.json`, `mobile/src/components/features/MarkupRenderer.tsx`, `mobile/src/components/features/MessageBubble.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Long-press on a code block shows a "Copy" action that copies the code content to clipboard via `expo-clipboard`.
  2. Long-press on a message bubble includes a "Copy Text" option that copies the plain-text representation.
  3. Successful copy shows a brief "Copied" toast via the global toast system; clipboard errors show an error toast.

### TASK-007: Add offline mutation queue

Queue shared Huly mutations when offline and replay them when connectivity returns.

- **Type:** feature
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **writeScope:** `mobile/src/lib/offline-queue.ts`, `mobile/src/store/offline.ts`, `mobile/src/hooks/useHulyMutation.ts`, `mobile/src/client/queryClient.ts`, `mobile/src/app/_layout.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. When the app detects no network, mutations routed through the shared `useHulyCreate()` / `useHulyUpdate()` / `useHulyRemove()` helpers are queued in a Zustand store persisted to AsyncStorage.
  2. When connectivity returns, queued shared mutations replay in order; conflicts (stale data) show user-actionable resolution.
  3. Queue state is visible via a banner ("X pending changes") and clears completely on successful replay.

### TASK-008: Add app-side universal link plumbing (iOS/Android)

Configure associated domains so `https://huly.io/...` links can open directly in the mobile app once the hosted association files are in place.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **writeScope:** `mobile/app.json`, `mobile/src/app/_layout.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. `app.json` configures `associatedDomains` (iOS) and `intentFilters` (Android) for the `huly.io` domain.
  2. With hosted association files present, deep links from universal links route through the same app-side destination logic as existing notification/deep-link navigation.
  3. Links to unknown routes open the app to the default tab instead of crashing or showing a blank screen.

### TASK-009: Add haptic feedback

Add tactile feedback for key inbox interactions.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **writeScope:** `mobile/package.json`, `mobile/src/lib/haptics.ts`, `mobile/src/components/features/NotificationRow.tsx`, `mobile/src/components/features/BulkActionBar.tsx`
- **validateCommand:** `cd mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. `expo-haptics` is called on swipe-to-archive completion and inbox bulk action confirmation.
  2. Haptics respect the system "Reduce Motion" accessibility setting; no vibration when the setting is enabled.
  3. Devices without haptic hardware (Android emulators, old devices) silently skip without errors.

## Failure Modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| Sentry init fails | DSN missing or network blocked | App continues without crash reporting; no user-visible error |
| i18n locale file fails to load | Missing or corrupt JSON | Fall back to English; log warning in dev |
| Syntax highlighter blocks main thread | Large code block causes frame drops | Limit highlighting to first 200 lines; show "truncated" indicator |
| Offline queue replays stale mutation | Server rejects with conflict | Show resolution UI; allow discard or retry with fresh data |
| Universal link opens wrong screen | Route parsing fails | Fall back to default tab; log the unparseable URL |
| Clipboard copy fails silently | Expo-clipboard throws on restricted context | Show error toast instead of silent failure |

## Ship Cut

If execution stops halfway, the minimum coherent cut is after `TASK-006`.

That cut yields:
- i18n framework
- crash reporting (Sentry)
- code syntax highlighting
- inline images in markup
- global error toast
- clipboard copy

Items below that cut and safe to defer:
- offline mutation queue
- universal links
- haptic feedback

## Test Coverage Map

- `TASK-001`: i18n init + useTranslation on 3 screens + missing key fallback
- `TASK-002`: Sentry init + ErrorBoundary integration + PII scrubbing verification
- `TASK-003`: highlighted code block + plain fallback + large block performance
- `TASK-004`: inline image rendering + broken URL placeholder + aspect ratio
- `TASK-005`: toast dispatch + auto-dismiss + queue behavior + global onError wiring
- `TASK-006`: clipboard copy code + copy message + error toast on failure
- `TASK-007`: offline queue + ordered replay + conflict resolution UI + banner state
- `TASK-008`: associated domains config + universal link routing + unknown route fallback
- `TASK-009`: haptic on actions + Reduce Motion respect + no-hardware graceful skip

## Concurrent Write Policy

| File | Write Order (by dependency) |
| --- | --- |
| `mobile/package.json` | TASK-001 → TASK-002 → TASK-006 → TASK-009 |
| `MarkupRenderer.tsx` | TASK-003 → TASK-004 → TASK-006 |
| `_layout.tsx` (root) | TASK-001 → TASK-002 → TASK-005 → TASK-007 → TASK-008 |
| `client/queryClient.ts` | TASK-005 → TASK-007 |

## Execution Summary

- Tasks: 9
- P0 foundation path: `TASK-001 -> TASK-002`
- Critical paths:
  - `TASK-001 -> TASK-002 -> TASK-005 -> TASK-006`
  - `TASK-003 -> TASK-004 -> TASK-006`
- Secondary path: `TASK-005 -> TASK-007 -> TASK-008`
- Deferred independent lane after foundations: `TASK-009`

## Task Dependencies

Derived from per-task `Depends on` fields. File-overlap ordering edges marked with `(file)`.

```text
TASK-001 -> TASK-005  (file: _layout.tsx)
TASK-001 -> TASK-002  (file: package.json, _layout.tsx)
TASK-002 -> TASK-005  (file: _layout.tsx)
TASK-003 -> TASK-004  (file: MarkupRenderer.tsx)
TASK-004 -> TASK-006  (file: MarkupRenderer.tsx)
TASK-005 -> TASK-006  (toast dependency)
TASK-005 -> TASK-007  (file: _layout.tsx)
TASK-007 -> TASK-008  (file: _layout.tsx)
```
