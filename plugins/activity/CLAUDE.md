# @hcengineering/activity

Activity tracking types. Activity messages, doc updates, reactions, saved messages.

## RN Safety: Type-only

Depends on `@hcengineering/ui` → svelte. Use `import type` exclusively.

## Key Types

| Type | Purpose |
|------|---------|
| `ActivityMessage` | Base message in activity feed |
| `DocUpdateMessage` | Auto-generated from doc changes |
| `ActivityInfoMessage` | System info message |
| `ActivityReference` | Cross-document reference |
| `Reaction` | Emoji reaction on a message |
| `SavedMessage` | Bookmarked/saved message |
| `DocAttributeUpdates` | Attribute change details |
| `ActivityMessageViewlet` | Rendering configuration |
| `ActivityExtension` | Extension point for activity types |

## Dependencies

`core`, `platform`, `contact`, `preference`, `ui`, `view`
