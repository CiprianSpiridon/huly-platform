# @hcengineering/api-client

High-level data client. Connects to Huly backend via REST or WebSocket. Provides typed CRUD operations on all document types.

## RN Safety: Partial

REST path uses `fetch()` (safe). But transitive deps pull in problematic packages:
- `@hcengineering/client-resources` → IndexedDB, localStorage
- `@hcengineering/text` → `@tiptap/*` (rich text editor, DOM-dependent)
- `@hcengineering/text-markdown` → markdown-it
- `snappyjs` → compression (pure JS, actually safe)
- `ws` (optional) → Node.js WebSocket

**For mobile:** Do not add as runtime dep in scaffold phase. Add later with Metro `resolver.blockList` for unsafe transitive deps, or use REST endpoints directly with fetch.

## Key Exports

| Export | Purpose |
|--------|---------|
| `connect(url, options)` | Factory → `PlatformClient` |
| `PlatformClient` | findAll, findOne, createDoc, updateDoc, removeDoc, search |
| `BrowserWebSocketFactory` | Browser WebSocket adapter |
| `NodeWebSocketFactory` | Node.js ws adapter |
| `ConnectOptions` | Auth options (token or email/password + workspace) |
| `loadServerConfig(url)` | Fetch `/config.json` for service URLs |

## REST Endpoints

All under `/api/v1/` with `Authorization: Bearer <workspace-token>`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/find-all/{workspace}?class=...&query=...` | Query documents |
| GET | `/find-all/{workspace}?limit=1` | Find one |
| POST | `/tx/{workspace}` | Submit transaction (create/update/remove) |
| GET | `/search-fulltext/{workspace}?query=...` | Full-text search |
| GET | `/account/{workspace}` | Current account info |
| GET | `/load-model/{workspace}` | Load type model |

## Connection Flow

```typescript
// 1. Load config
const config = await loadServerConfig('https://huly.io')

// 2. Connect with token from account-client
const client = await connect('https://huly.io', {
  token: workspaceToken,
  workspace: workspaceId,
  socketFactory: BrowserWebSocketFactory  // or custom RN factory
})

// 3. Query
const issues = await client.findAll(tracker.class.Issue, { status: openStatus })

// 4. Mutate
await client.createDoc(tracker.class.Issue, projectSpace, { title: 'Bug', ... })
```

## Dependencies

- `@hcengineering/account-client`, `client`, `client-resources`, `collaborator-client`
- `@hcengineering/core`, `platform`
- `@hcengineering/text`, `text-markdown`
- `snappyjs` — response decompression
- `ws` (optional) — Node.js WebSocket

## Key Files

| File | Purpose |
|------|---------|
| `src/client.ts` | `connect()` factory, PlatformClientImpl |
| `src/rest/rest.ts` | REST client with rate limiting, retry |
| `src/socket/browser.ts` | Browser WebSocket factory |
| `src/socket/node.ts` | Node.js WebSocket factory |
| `src/storage/client.ts` | File upload/download (Node.js Buffer — NOT RN safe) |
| `src/config.ts` | Server config loader |
| `src/markup/` | Rich text operations (tiptap-dependent) |
