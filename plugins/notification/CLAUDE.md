# @hcengineering/notification

Notification and inbox types. Inbox notifications, contexts, providers, notification types.

## RN Safety: Type-only

Depends on `@hcengineering/ui` → svelte. Use `import type` exclusively.

## Key Types

| Type | Purpose |
|------|---------|
| `InboxNotification` | Core: user, isViewed, title, body, archived |
| `ActivityInboxNotification` | From activity message |
| `MentionInboxNotification` | From @mention |
| `ReactionInboxNotification` | From emoji reaction |
| `CommonInboxNotification` | Generic with header, icon, message |
| `DocNotifyContext` | Per-doc notification state: last viewed, pinned |
| `NotificationType` | Type definition: label, group, defaults |
| `NotificationProvider` | Delivery method (browser, email, sound) |
| `BrowserNotification` | Push notification payload |
| `Collaborators` | Mixin: tracks who gets notified |

## Dependencies

`core`, `platform`, `activity`, `contact`, `preference`, `setting`, `ui`, `view`
