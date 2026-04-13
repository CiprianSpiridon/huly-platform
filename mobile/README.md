# Huly Mobile

Expo/React Native mobile app for the Huly Platform.

## Testing

### Prerequisites

```bash
rush install
```

### Running tests

```bash
# Run all unit tests
cd mobile && npx jest

# Run with coverage report
npx jest --coverage

# Run in watch mode during development
npx jest --watch

# Run a specific test file
npx jest src/store/__tests__/auth.test.ts

# Run tests matching a pattern
npx jest --testPathPattern="repositories"
```

### Test structure

| Directory | Description |
|-----------|-------------|
| `src/store/__tests__/` | Zustand store unit tests |
| `src/repositories/__tests__/` | Repository layer unit tests |
| `src/hooks/__tests__/` | TanStack Query hook tests |
| `src/components/__tests__/` | Component render/interaction tests |
| `src/test/` | Factories, fixtures, mock helpers |
| `maestro/` | Maestro E2E flow definitions |

### Test conventions

- Co-located `__tests__/` directories next to source files
- Test files named `*.test.ts` or `*.test.tsx`
- One `describe` block per exported function/component
- Reset Zustand stores in `beforeEach` to prevent cross-test state leaks
- Fresh `QueryClient` per hook test (no shared cache)
- Mock `@hcengineering/*` packages via `src/__mocks__/` directory
- Mock native modules (expo-secure-store, expo-router, etc.) in `jest.setup.ts`

### Coverage thresholds

| Scope | Branches | Functions | Lines | Statements |
|-------|----------|-----------|-------|------------|
| Global | 60% | 60% | 60% | 60% |
| `src/store/` | 80% | 80% | 80% | 80% |
| `src/repositories/` | 70% | 70% | 70% | 70% |

### Factories and fixtures

Use `src/test/factories.ts` for dynamic test data:

```typescript
import { buildIssue, buildMessage, buildChannel } from '@/test/factories'

const issue = buildIssue({ title: 'Custom title', priority: 2 })
const messages = buildMessageList(5, { space: 'ch-1' })
```

Use `src/test/fixtures.ts` for stable reference data (snapshots, static assertions).

### Mock HulyClient

For repository tests, use the mock client helper:

```typescript
import { createMockHulyClient } from '@/test/mockHulyClient'

const { mockClient, installMock, uninstallMock } = createMockHulyClient()

beforeEach(() => installMock())
afterEach(() => uninstallMock())
```

### E2E tests (Maestro)

```bash
# Install Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run a single flow
maestro test -e maestro/config.yaml maestro/login.yaml

# Run all P0 flows
maestro test -e maestro/config.yaml --tags p0 maestro/

# Run with recording for debugging
maestro record maestro/login.yaml
```

E2E tests require a running iOS Simulator or Android Emulator with the app built.

### CI

The GitHub Actions workflow at `.github/workflows/mobile-tests.yml` runs:
- Unit tests + coverage on every PR touching `mobile/`
- E2E tests on manual workflow dispatch
