# Mobile vs Web Feature Parity Report

> Generated: 2026-04-13
> Branch: react-native-app
> Audited by: 5 parallel agents (Tracker, Chat, Inbox, Settings/Auth, Infrastructure)

## Overall Summary

| Module | Mobile Completeness | Key Gaps |
|--------|:-------------------:|----------|
| **Tracker** | ~35% | No project CRUD, no issue delete/title edit, no relations/labels/templates, no time logging |
| **Chat** | ~45% | No channel/DM creation, no message edit/delete, no pins/saved/typing/presence |
| **Inbox** | ~65% | No document grouping, no read/unread filter, no mark-all UI, limited deep links |
| **Auth** | ~60% | No signup, no password reset, no social login, no biometrics |
| **Settings** | ~45% | No profile edit, no workspace creation, no member invite/roles, no password/2FA management |
| **Search** | ~70% | No in-channel search, no autocomplete, no saved filters |
| **Infrastructure** | ~40% | No offline queue, no i18n, no crash reporting, no analytics, no code highlighting |

---

## Tracker

| Feature | Mobile | Web | Gap |
|---------|:------:|:---:|-----|
| List projects | **done** | done | -- |
| Create/edit/delete project | **missing** | done | No CRUD |
| List issues (list + kanban) | **done** | done | -- |
| Create issue | **done** | done | Fewer fields (no labels, relations, parent) |
| View issue detail | **done** | done | -- |
| Edit title/description | **missing** | done | Read-only after creation |
| Edit status/priority/assignee | **done** | done | Via bottom-sheet pickers |
| Edit due date/estimation | **missing** | done | Display only |
| Delete issue | **missing** | done | -- |
| Sub-issues (tree) | **count only** | done | No tree view, no creation |
| Relations (blocks/related) | **missing** | done | -- |
| Labels/tags | **missing** | done | -- |
| Components browser | **missing** | done | Ref field only |
| Milestones/sprints browser | **missing** | done | Ref field only |
| Issue templates | **missing** | done | -- |
| View comments | **done** | done | -- |
| Add comment | **done** | done | Plain text only (no markdown toolbar) |
| Edit/delete comment | **missing** | done | -- |
| Reactions on comments | **missing** | done | -- |
| Mentions in comments | **missing** | done | -- |
| Activity timeline (system msgs) | **missing** | done | Only user comments shown |
| Attachments (view/upload) | **done** | done | -- |
| Attachment delete | **missing** | done | -- |
| Time logging | **missing** | done | View reported time only |
| Time reports | **missing** | done | -- |
| Filter by priority | **done** | done | -- |
| Filter by status/assignee/date | **model only** | done | UI not exposed |
| Saved/custom filters | **missing** | done | -- |
| Sort (4 keys) | **done** | done | -- |
| Kanban grouping | **status only** | done | Web: status/assignee/priority/component/milestone |
| Kanban drag-drop | **missing** | done | -- |
| Bulk operations | **missing** | done | -- |
| Issue search (fulltext) | **done** | done | -- |

---

## Chat (Chunter)

| Feature | Mobile | Web | Gap |
|---------|:------:|:---:|-----|
| List channels + DMs | **done** | done | -- |
| Create channel | **missing** | done | -- |
| Edit/delete/archive channel | **missing** | done | -- |
| Join/leave channel | **missing** | done | -- |
| Channel settings/members | **missing** | done | -- |
| Create DM / group DM | **missing** | done | -- |
| Send message | **done** | done | -- |
| Edit message | **missing** | done | -- |
| Delete message | **missing** | done | -- |
| Thread view | **done** | done | -- |
| Reply to thread | **done** | done | -- |
| Thread browsing (all threads) | **missing** | done | -- |
| Reactions (add/remove/view) | **done** | done | Full implementation |
| Attachments (send/view) | **done** | done | -- |
| Image preview inline | **done** | done | -- |
| Video support | **partial** | done | Not displayed in messages |
| Markdown rendering | **done** | done | No syntax highlighting |
| @mentions (display) | **partial** | done | Renders but no insert UI |
| Rich text editor toolbar | **partial** | done | Limited formatting options |
| Unread count per channel | **done** | done | Polling-based (30s lag) |
| Mark channel as read | **done** | done | On screen mount |
| Message drafts | **done** | done | In-memory |
| Pinned messages | **missing** | done | -- |
| Saved/bookmarked messages | **missing** | done | -- |
| Typing indicators | **missing** | done | -- |
| Online/presence status | **missing** | done | -- |
| Search within channel | **missing** | done | Global search only |
| Jump to date | **missing** | done | -- |
| Mute/notification settings | **missing** | done | -- |

---

## Inbox / Notifications

| Feature | Mobile | Web | Gap |
|---------|:------:|:---:|-----|
| Notification list | **done** | done | Flat list (web groups by document) |
| Filter by type (4 chips) | **done** | done | -- |
| Filter by read/unread | **missing** | done | Backend supports it |
| Navigate to source document | **done** | done | 3 hardcoded routes + fallback |
| Mark as read (individual) | **done** | done | Auto on tap |
| Mark all as read | **fn only** | done | Function exists, no UI button |
| Archive (swipe) | **done** | done | -- |
| Unarchive | **missing** | done | Archive is one-way |
| Delete notification | **missing** | done | -- |
| Bulk select + actions | **done** | missing | Mobile-only feature |
| Document-level grouping | **missing** | done | Core web concept |
| Push notifications | **done** | done | Expo tokens vs VAPID |
| Foreground banner | **done** | partial | Custom in-app banner |
| Tap push to navigate | **done** | done | Incl. cold start |
| Badge count sync | **done** | n/a | Mobile-only (browser limitation) |
| Per-category settings | **done** (3 cats) | done | Client-only (not server-enforced) |
| Per-type settings | **missing** | done | Fine-grained web settings |
| Real-time updates | **polling** | done | Web uses live subscriptions |

---

## Auth

| Feature | Mobile | Web | Gap |
|---------|:------:|:---:|-----|
| Email/password login | **done** | done | -- |
| OTP/2FA verification | **done** | done | -- |
| TOTP (authenticator app) | **done** | done | -- |
| Social login (Google/GitHub) | **missing** | done | -- |
| Password reset / forgot | **missing** | done | No link on login screen |
| Sign up / create account | **missing** | done | Must use web |
| Token persistence | **done** | done | expo-secure-store (encrypted) |
| Session restore on startup | **done** | done | Validates via API |
| Biometric auth (Face/Touch ID) | **missing** | n/a | -- |

---

## Settings

| Feature | Mobile | Web | Gap |
|---------|:------:|:---:|-----|
| View profile (name, email) | **done** | done | -- |
| Edit profile (name, avatar) | **missing** | done | Read-only |
| Workspace info | **done** | done | -- |
| Switch workspace | **done** | done | With rollback |
| Create workspace | **missing** | done | -- |
| List members | **done** | done | With search + sections |
| Invite members | **missing** | done | -- |
| Remove members | **missing** | done | -- |
| Change member roles | **missing** | done | -- |
| Theme (dark/light/system) | **done** | done | -- |
| Language selector | **missing** | done | -- |
| Change password | **missing** | done | -- |
| 2FA setup/management | **missing** | done | -- |
| Notification preferences | **done** | partial | Mobile has per-category UI |
| About / version | **done** | missing | Mobile-only |
| Clear cache | **done** | n/a | -- |
| Logout (full cleanup) | **done** | done | -- |
| Account deletion | **missing** | partial | -- |

---

## Infrastructure / Cross-Cutting

| Concern | Mobile | Web | Gap |
|---------|:------:|:---:|-----|
| Real-time (WebSocket) | **done** (JSON) | done (binary) | No RPC, JSON only |
| Auto-reconnect | **done** | done | Exp. backoff |
| Background/foreground handling | **done** | n/a | Closes WS on background |
| Offline mutation queue | **missing** | done | -- |
| Optimistic updates | **partial** | done | Reactions + archive only |
| List virtualization | **done** | done | FlatList + FlashList |
| Pagination | **done** (cursor) | done | Keyset pagination |
| Image caching | **done** | done | expo-image |
| Rich text rendering | **done** | done | No syntax highlighting |
| Code block highlighting | **missing** | done | -- |
| Mermaid diagrams | **missing** | done | Placeholder text only |
| Inline images in markup | **missing** | done | Shown as links |
| Accessibility (labels/roles) | **done** | done | Basic coverage |
| Touch targets (44px) | **done** | n/a | -- |
| i18n / translations | **missing** | done | All strings hardcoded English |
| Crash reporting (Sentry) | **missing** | done | -- |
| Analytics / telemetry | **missing** | done | -- |
| Haptic feedback | **missing** | n/a | -- |
| Clipboard / copy | **missing** | done | -- |
| Share sheet | **done** | n/a | Via expo-sharing |
| Deep linking (huly:// scheme) | **done** | done | -- |
| Universal links | **missing** | done | -- |
| Error boundary | **done** | done | -- |
| Global error toast | **missing** | done | Per-screen only |

---

## Priority Gaps (What Matters Most for Investors)

### P0 -- Must have for demo

1. **Create channel / DM** -- can't start conversations
2. **Edit message** -- can't fix typos
3. **Edit issue title/description** -- read-only after creation is a dealbreaker
4. **Password reset link** on login screen
5. **Profile editing** (name at minimum)

### P1 -- Expected by users

6. Delete issue / delete message
7. Create DM / group DM
8. Filter by status + assignee (UI exists in model, just not exposed)
9. Social login (Google at minimum)
10. Mark all as read button
11. In-channel search
12. Member invite flow

### P2 -- Competitive parity

13. Typing indicators + presence
14. Pinned messages
15. Labels/tags on issues
16. Sub-issue tree management
17. Time logging
18. i18n framework
19. Crash reporting (Sentry)
20. Code syntax highlighting

### P3 -- Nice to have

21. Issue templates
22. Saved/bookmarked messages
23. Kanban drag-drop
24. Biometric auth
25. Offline mutation queue
26. Analytics
