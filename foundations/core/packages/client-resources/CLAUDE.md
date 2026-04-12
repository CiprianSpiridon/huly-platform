# @hcengineering/client-resources

Connection implementation. Manages WebSocket lifecycle, binary protocol, IndexedDB persistence, and transaction handling.

## RN Safety: No

Uses browser-only APIs: `localStorage`, `indexedDB.open()`, `MessageEvent`, `CloseEvent`. Cannot be imported in React Native without polyfills or a custom implementation.

## Key Exports

| Export | Purpose |
|--------|---------|
| `connect()` | Creates live connection to transactor |
| Plugin resources | Registers as `@hcengineering/client` GetClient implementation |

## Why It Matters for Mobile

`@hcengineering/api-client` depends on this package. When adding api-client to the mobile app, you'll need to either:
1. Use Metro `resolver.blockList` to exclude this package
2. Provide a RN-compatible alternative
3. Use REST endpoints directly instead of the WebSocket path

## Dependencies

- `@hcengineering/analytics`, `client`, `core`, `platform`, `rpc`
- `snappyjs` — compression (pure JS, actually RN-safe)

## Key Files

| File | Purpose |
|------|---------|
| `src/connection.ts` | Connection class — WebSocket lifecycle, ping/pong, reconnection |
| `src/index.ts` | Plugin resource registration, IndexedDB setup |
