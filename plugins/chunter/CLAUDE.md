# @hcengineering/chunter

Chat and messaging types. Channels, direct messages, threaded conversations.

## RN Safety: Type-only

Depends on `@hcengineering/ui` → svelte. Use `import type` exclusively.

## Key Types

| Type | Purpose |
|------|---------|
| `Channel` | Chat channel with topic |
| `DirectMessage` | Peer-to-peer messages |
| `ChatMessage` | Message: content, attachments, editedOn |
| `ThreadMessage` | Threaded reply to a message |
| `ChunterSpace` | Base space for chat |
| `ChatMessageViewlet` | Rendering config |
| `ObjectChatPanel` | Mixin — attach chat to any doc |

## Dependencies

`core`, `platform`, `activity`, `contact`, `notification`, `ui`, `view`, `workbench`, `fast-equals`
