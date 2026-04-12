# @hcengineering/client

Client plugin interface. Defines socket factories, connection options, and client metadata. Does NOT contain connection implementation (that's `client-resources`).

## RN Safety: Yes

Pure interfaces and type definitions. No runtime code beyond plugin registration.

## Key Exports

| Export | Purpose |
|--------|---------|
| `ClientFactory` | Function type for creating client connections |
| `ClientSocket` | WebSocket interface (readyState, send, close, events) |
| `ClientSocketFactory` | `(url: string) => ClientSocket` |
| `ClientSocketReadyState` | Enum: CONNECTING, OPEN, CLOSING, CLOSED |
| `FilterMode` | `'none' \| 'client' \| 'ui'` |
| `ClientFactoryOptions` | Connection options |

## Mobile Relevance

The `ClientSocketFactory` type is what you implement to provide RN WebSocket support:

```typescript
import type { ClientSocketFactory } from '@hcengineering/client'

const RNWebSocketFactory: ClientSocketFactory = (url) => {
  const ws = new WebSocket(url)  // RN global
  return ws as ClientSocket
}
```

## Dependencies

- `@hcengineering/platform` — plugin metadata
- `@hcengineering/core` — base types
