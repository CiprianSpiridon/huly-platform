# @hcengineering/core

Base type system for the entire platform. Every document, transaction, query, and class hierarchy flows through this package.

## RN Safety: Yes

Pure TypeScript. No Node.js, browser, or Svelte dependencies.

## Key Exports

| Export | Purpose |
|--------|---------|
| `Doc`, `AttachedDoc` | Base document interfaces — all data extends these |
| `Ref<T>` | Type-safe document reference (branded string) |
| `Class<T>`, `Mixin<T>` | Type system — classes, mixins, interfaces |
| `Space`, `TypedSpace` | Permission-scoped containers |
| `Account`, `AccountRole` | User identity and roles |
| `PersonUuid`, `PersonId`, `AccountUuid` | Identity types |
| `Tx`, `TxCreateDoc`, `TxUpdateDoc`, `TxRemoveDoc` | Transaction types |
| `TxFactory`, `TxOperations` | Transaction builders |
| `DocumentQuery`, `FindOptions`, `FindResult` | Query system |
| `SortingOrder`, `SortingQuery` | Sorting |
| `Hierarchy` | Class inheritance and mixin resolution |
| `ModelDb`, `MemDb` | In-memory database |
| `Client`, `ClientConnection` | Client interfaces |
| `Timestamp`, `Markup`, `Rank` | Primitive property types |
| `generateId()` | UUID generation |

## Dependencies

- `@hcengineering/platform` — plugin metadata, IntlString
- `@hcengineering/analytics` — error tracking
- `@hcengineering/measurements` — perf metrics
- `fast-equals` — deep equality

## Key Files

| File | Purpose |
|------|---------|
| `src/classes.ts` | Doc, Space, Account, Permission, Blob types |
| `src/tx.ts` | Transaction types and TxFactory |
| `src/storage.ts` | Query types, Storage interface |
| `src/hierarchy.ts` | Class hierarchy and mixin management |
| `src/memdb.ts` | In-memory database (ModelDb, TxDb) |
| `src/client.ts` | Client/ClientConnection interfaces |
| `src/operations.ts` | TxOperations high-level API |
| `src/query.ts` | Query matching and sorting |
| `src/utils.ts` | ID generation, helpers |

## Mobile Usage

```typescript
import type { Doc, Ref, FindResult, AccountRole } from '@hcengineering/core'
import { generateId } from '@hcengineering/core'
```

Safe for both runtime imports and type imports from React Native.
