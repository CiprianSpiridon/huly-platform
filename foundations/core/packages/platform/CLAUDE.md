# @hcengineering/platform

Plugin system, metadata registry, i18n, resource resolution, and error handling.

## RN Safety: Yes

Only external dep is `intl-messageformat` which works on React Native.

## Key Exports

| Export | Purpose |
|--------|---------|
| `Plugin` | Plugin identifier type |
| `plugin()` | Plugin definition factory |
| `Resource<T>` | Lazy-loadable resource reference (branded string) |
| `Metadata<T>` | Typed metadata key |
| `IntlString` | i18n string reference |
| `Asset` | Icon/image reference |
| `getMetadata()`, `setMetadata()` | Read/write metadata values |
| `getResource()` | Resolve a Resource to its implementation |
| `PlatformError`, `Status` | Error types |
| `translate()` | i18n translation function |

## Dependencies

- `intl-messageformat` — ICU message formatting

## Key Files

| File | Purpose |
|------|---------|
| `src/platform.ts` | Plugin registry, resource resolution |
| `src/metadata.ts` | Metadata key-value store |
| `src/resource.ts` | Resource loading |
| `src/i18n.ts` | Translation utilities |
| `src/event.ts` | Event system |
| `src/status.ts` | Status codes and PlatformError |

## Mobile Usage

```typescript
import type { Plugin, Resource, IntlString } from '@hcengineering/platform'
import { PlatformError, getMetadata } from '@hcengineering/platform'
```

Safe for both runtime and type imports.
