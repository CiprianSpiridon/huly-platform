# Mobile API Client Wiring

## Context

Wire the Huly API client into the mobile Expo app, enabling data access via REST endpoints. The mobile app (scaffolded in Phase 0 via `mobile-scaffold`) has `@hcengineering/core` and `@hcengineering/platform` already installed. This phase adds the API client, account client, plugin type packages, TanStack Query, and the repository pattern -- creating the full data access layer.

## Stack (locked)

| Dependency | Version | Notes |
|---|---|---|
| Expo SDK | 55 | Already installed |
| @tanstack/react-query | ^5.x | Server state management |
| zustand | ^5.x | Client state (auth store) |
| @hcengineering/api-client | workspace:^ | REST path only, block WebSocket/markup/storage |
| @hcengineering/account-client | workspace:^ | RN-safe (fetch only) |
| @hcengineering/client | workspace:^ | Types only (ClientSocketFactory) |
| snappyjs | ^0.7.0 | Pure JS, RN-safe (transitive via api-client) |
| @shopify/flash-list | ^1.x | RecyclerView lists for tracker/chat/inbox |
| @react-native-async-storage/async-storage | SDK 55 | Zustand persist for filter/sort/theme prefs |

## Mode

- **Planning mode:** HOLD (9 tasks)
- **Default review:** claude
- **Non-goals:** Push notifications, file uploads, WebSocket real-time, rich text editing, offline caching

## Prerequisites

- Phase 0 (mobile-scaffold) complete: all 10 tasks done
- Phase 1 (mobile-auth) complete: auth flow provides workspace token via expo-secure-store
- Branch: `react-native-app`

## Architecture Decisions

### AD-1: REST-only, no WebSocket (Phase 2)

The `connect()` function in `api-client/src/client.ts` imports `@hcengineering/client-resources` (IndexedDB, localStorage) and `@hcengineering/text` (tiptap, DOM). The `PlatformClientImpl` uses a WebSocket connection underneath.

**Decision:** Use `createRestClient()` from `api-client/src/rest/rest.ts` directly. This creates a `RestClientImpl` that uses pure `fetch()` with snappy decompression. Then wrap it with `createRestTxOperations()` from `api-client/src/rest/tx.ts` for TxOperations support. This avoids the entire WebSocket/client-resources/markup/collaborator chain.

**Import path:** `import { createRestClient, createRestTxOperations } from '@hcengineering/api-client'` -- Metro does NOT tree-shake. The barrel re-exports unsafe modules, and their compiled `require()` calls execute at bundle time. The Metro `resolveRequest` blocklist (AD-2) returns `{ type: 'empty' }` for all unsafe transitive modules, so they resolve to empty stubs instead of crashing. This is module blocking, not tree-shaking — the blocked code never loads at runtime because the empty stubs have no exports. This is safe ONLY because the mobile code never calls the blocked code paths (WebSocket, storage, markup).

### AD-2: Metro blocklist strategy

The api-client barrel (`src/index.ts`) re-exports everything including:
- `./client` -- imports `@hcengineering/client-resources` (IndexedDB)
- `./markup/client` -- imports `@hcengineering/text` (tiptap), `@hcengineering/collaborator-client`
- `./socket` -- imports `ws` (Node.js WebSocket)
- `./storage` -- imports `stream` (Node.js Readable)

**Decision:** Block at the Metro resolver level with expanded `resolveRequest`:
- `@hcengineering/client-resources` (IndexedDB, localStorage)
- `@hcengineering/text` (tiptap/prosemirror chain)
- `@hcengineering/text-core` (transitive via text)
- `@hcengineering/text-html` (transitive via text-markdown)
- `@hcengineering/text-markdown` (markdown-it)
- `@hcengineering/collaborator-client` (collaborator websocket)
- `@tiptap/*` (all tiptap packages)
- `prosemirror-*` (prosemirror packages)
- `markdown-it` (markdown parser)
- `ws` (Node.js WebSocket)
- `stream` (already blocked as Node builtin, but also used via `import { Readable } from 'stream'` in storage/types.ts)

The existing blocklist already covers `@hcengineering/server-*`, `@hcengineering/model-*`, `@hcengineering/ui`, `@hcengineering/presentation`, `@hcengineering/theme`, and Node builtins.

### AD-3: Plugin type packages with import type enforcement

Plugin packages (tracker, task, chunter, contact, notification, activity) all depend on `@hcengineering/ui` which depends on `svelte@^4.2.20`. The Metro blocklist already blocks `@hcengineering/ui`. The plugin packages themselves are just type definitions -- TypeScript class IDs, interface definitions, and plugin resource maps.

**Decision:** Add plugin packages as dependencies but enforce `import type` exclusively in mobile code. The Metro resolver already blocks `@hcengineering/ui` (prefix match). Also need to block additional transitive deps from plugins:
- `@hcengineering/view` -> `@hcengineering/ui`
- `@hcengineering/preference` -> `@hcengineering/ui`
- `@hcengineering/workbench` -> `@hcengineering/ui`
- `@hcengineering/setting` -> `@hcengineering/ui`
- `@hcengineering/templates` -> `@hcengineering/ui`
- `@hcengineering/card` -> `@hcengineering/ui`
- `@hcengineering/tags` -> `@hcengineering/ui`
- `@hcengineering/time` -> `@hcengineering/ui`
- `@hcengineering/attachment` -> `@hcengineering/ui`
- `@hcengineering/rank` -- pure TS, safe
- `lexorank` -- pure TS, safe
- `fast-equals` -- pure JS, safe

Since Metro resolves at runtime and `import type` is erased by TypeScript, Metro will NOT try to resolve type-only imports. However, if a `.js` output from the plugin package's `lib/` directory contains actual `require()` calls for these deps, Metro will try to resolve them. The blocklist handles this.

### AD-4: REST client singleton pattern

**Decision:** Create a singleton `HulyApiClient` class in `src/client/api.ts` that:
1. Receives endpoint + token + workspaceId from the auth store
2. Creates `RestClientImpl` via `createRestClient()`
3. Wraps with `createRestTxOperations()` for TxOperations
4. Loads hierarchy/model once on initialization
5. Exposes typed `findAll`, `findOne`, `createDoc`, `updateDoc`, `removeDoc`
6. Provides `close()` for cleanup
7. Re-initializes on workspace switch

### AD-5: Repository pattern

**Decision:** `src/repositories/base.ts` provides a `BaseRepository` class with typed query helpers. Domain repositories (e.g., `IssueRepository`) extend it. Repositories receive the API client instance and provide domain-specific query methods that return typed results.

### AD-6: TanStack Query integration

**Decision:** QueryClientProvider and `@tanstack/react-query` are installed and configured in the auth phase (TASK-105). This phase does NOT re-install them. TASK-015 only extracts the queryClient to a dedicated module if needed.

Configuration:
- Default staleTime: 30s, gcTime: 5min (mobile-appropriate)
- `useHulyQuery` custom hook wrapping `useQuery` with Huly-typed queries
- Query keys follow `['huly', domain, class, queryHash]` convention

## Dependency Graph (Blocking)
