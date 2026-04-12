# Unit Testing

## What

The Huly mobile app uses Jest as the test runner with React Native Testing Library (RNTL) for component tests. Tests focus on behavior (what the user sees and does), not implementation details (state variables, internal methods). Every repository, hook, and Zustand store should have unit tests. Components are tested through their rendered output and user interactions, not their internal state.

### Testing stack

| Tool | Role | Version |
|---|---|---|
| Jest | Test runner, assertions, mocking | 29.x (via jest-expo) |
| jest-expo | Expo-specific Jest preset | SDK 55 compatible |
| @testing-library/react-native | Component rendering and queries | 12.x |
| @testing-library/jest-native | Custom matchers | 5.x |
| msw | API mocking (optional) | 2.x |

### Test file conventions

| Source file | Test file | Location |
|---|---|---|
| `src/repositories/issues.ts` | `src/repositories/__tests__/issues.test.ts` | Co-located `__tests__/` |
| `src/hooks/use-issues.ts` | `src/hooks/__tests__/use-issues.test.ts` | Co-located `__tests__/` |
| `src/store/auth.ts` | `src/store/__tests__/auth.test.ts` | Co-located `__tests__/` |
| `src/components/ui/button.tsx` | `src/components/ui/__tests__/button.test.tsx` | Co-located `__tests__/` |
| `src/lib/format.ts` | `src/lib/__tests__/format.test.ts` | Co-located `__tests__/` |

## How

### Jest configuration

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterSetup: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list|@hcengineering/.*)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/__tests__/**',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};

export default config;
```

### Test setup file

```typescript
// src/test/setup.ts
import '@testing-library/jest-native/extend-expect';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismiss: jest.fn(),
  },
  useLocalSearchParams: jest.fn().mockReturnValue({}),
  useGlobalSearchParams: jest.fn().mockReturnValue({}),
  Redirect: jest.fn(() => null),
  Stack: {
    Screen: jest.fn(() => null),
  },
  Tabs: {
    Screen: jest.fn(() => null),
  },
  Link: jest.fn(({ children }) => children),
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: jest.fn(({ accessibilityLabel, ...props }) => {
    const { View } = require('react-native');
    return <View {...props} accessibilityLabel={accessibilityLabel} />;
  }),
}));

// Mock @shopify/flash-list
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return {
    FlashList: FlatList,
  };
});

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-push-token' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setBadgeCountAsync: jest.fn(),
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence console.warn in tests (optional, remove for debugging)
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('NativeWind')) return;
    originalWarn(...args);
  };
});
afterAll(() => {
  console.warn = originalWarn;
});
```

### Testing a pure utility function

```typescript
// src/lib/__tests__/format.test.ts
import { formatRelativeTime, formatFileSize } from '../format';

describe('formatRelativeTime', () => {
  it('returns "just now" for times less than 1 minute ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 30_000)).toBe('just now');
  });

  it('returns minutes for times less than 1 hour ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours for times less than 1 day ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 3 * 60 * 60_000)).toBe('3h ago');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1500)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1_500_000)).toBe('1.4 MB');
  });
});
```

### Testing a Zustand store

```typescript
// src/store/__tests__/auth.test.ts
import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '../auth';
import type { LoginInfo } from '@hcengineering/account-client';

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('auth store', () => {
  beforeEach(() => {
    // Reset store between tests
    useAuthStore.setState({
      token: null,
      account: null,
      isAuthenticated: false,
    });
    jest.clearAllMocks();
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });

  it('sets auth from login info', async () => {
    const loginInfo: LoginInfo = {
      account: 'test-account-uuid' as any,
      token: 'test-jwt-token',
    };

    await useAuthStore.getState().setAuth(loginInfo);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('test-jwt-token');
    expect(state.account).toBe('test-account-uuid');

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'test-jwt-token');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('account_id', 'test-account-uuid');
  });

  it('clears auth on logout', async () => {
    // Set up authenticated state
    useAuthStore.setState({ token: 'token', account: 'acct' as any, isAuthenticated: true });

    await useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('restores auth from secure store', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('stored-token')
      .mockResolvedValueOnce('stored-account');

    await useAuthStore.getState().restoreAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('stored-token');
  });
});
```

### Testing a hook with TanStack Query

```typescript
// src/hooks/__tests__/use-issues.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useIssues, useIssue } from '../use-issues';
import { findIssues, findIssue } from '@/repositories/issues';
import { createMockIssue } from '@/test/factories/issue';

jest.mock('@/repositories/issues');
const mockFindIssues = findIssues as jest.MockedFunction<typeof findIssues>;
const mockFindIssue = findIssue as jest.MockedFunction<typeof findIssue>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useIssues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches issues for a project', async () => {
    const mockIssues = [createMockIssue(), createMockIssue()];
    mockFindIssues.mockResolvedValue(mockIssues);

    const { result } = renderHook(
      () => useIssues('project-1'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(mockFindIssues).toHaveBeenCalledWith({ space: 'project-1' });
  });

  it('handles fetch error', async () => {
    mockFindIssues.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useIssues('project-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
```

### Testing a component

```tsx
// src/components/ui/__tests__/button.test.tsx
import { render, fireEvent, screen } from '@testing-library/react-native';

import { Button } from '../button';

describe('Button', () => {
  it('renders with title', () => {
    render(<Button title="Save" onPress={jest.fn()} />);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading', () => {
    render(<Button title="Save" onPress={jest.fn()} loading />);
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    render(<Button title="Save" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('has correct accessibility properties', () => {
    render(<Button title="Save" onPress={jest.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName('Save');
  });
});
```

### Test data factories

```typescript
// src/test/factories/issue.ts
import type { Issue } from '@hcengineering/tracker';
import type { Ref, Space } from '@hcengineering/core';

let issueCounter = 0;

export function createMockIssue(overrides: Partial<Issue> = {}): Issue {
  issueCounter++;
  return {
    _id: `issue-${issueCounter}` as Ref<Issue>,
    _class: 'tracker:class:Issue' as any,
    space: 'project-1' as Ref<Space>,
    title: `Mock issue ${issueCounter}`,
    identifier: `HULY-${issueCounter}`,
    description: '',
    status: 'status-1' as any,
    priority: 1,
    number: issueCounter,
    assignee: null,
    component: null,
    milestone: null,
    estimation: 0,
    remainingTime: 0,
    reportedTime: 0,
    kind: 'default' as any,
    relations: [],
    childInfo: [],
    parents: [],
    dueDate: null,
    rank: '',
    modifiedOn: Date.now(),
    createdOn: Date.now(),
    modifiedBy: 'user-1' as any,
    createdBy: 'user-1' as any,
    ...overrides,
  } as unknown as Issue;
}

export function createMockIssueList(count: number): Issue[] {
  return Array.from({ length: count }, () => createMockIssue());
}
```

## When

### What to test per module type

| Module type | Test focus | Example assertions |
|---|---|---|
| Pure utility (`src/lib/`) | Input/output correctness | `expect(formatDate(...)).toBe(...)` |
| Zustand store | State transitions, persistence calls | `expect(state.isAuth).toBe(true)` |
| Repository | Correct API calls, error handling | `expect(client.findAll).toHaveBeenCalledWith(...)` |
| Hook (TanStack Query) | Loading/error/success states, data shape | `expect(result.current.isLoading).toBe(true)` |
| UI component | Rendering, interactions, accessibility | `fireEvent.press(...)`, `getByRole('button')` |
| Feature component | Composition, data display | `getByText(issue.title)` |

### When to mock vs use real implementation

| Dependency | Mock | Real |
|---|---|---|
| `expo-secure-store` | Always (no keychain in test) | Never |
| `expo-router` | Always (no navigation stack) | Never |
| `@hcengineering/api-client` | Always (no server) | Never |
| TanStack Query | Real (with test QueryClient) | Real |
| Zustand store | Real (reset in beforeEach) | Real |
| Pure utility functions | Never | Always |

### When to skip component tests

- The component is a thin wrapper around a tested primitive (e.g., a styled Text)
- The component has no interactive behavior and no conditional rendering
- The component is trivial (< 10 lines)

Focus testing effort on: hooks with complex logic, stores with persistence, repositories with error handling, and interactive feature components.

## Never

- **Never test implementation details.**

```typescript
// WRONG -- testing internal state
expect(component.instance().state.isOpen).toBe(true);

// RIGHT -- testing what the user sees
expect(screen.getByText('Menu content')).toBeTruthy();
```

- **Never use `act()` manually when RNTL handles it.**

```typescript
// WRONG -- unnecessary manual act
await act(async () => {
  fireEvent.press(button);
});

// RIGHT -- RNTL wraps events in act
fireEvent.press(button);
await waitFor(() => expect(screen.getByText('Done')).toBeTruthy());
```

- **Never forget to reset Zustand stores between tests.**

```typescript
// WRONG -- state leaks between tests
describe('auth', () => {
  it('test 1', () => { /* modifies store */ });
  it('test 2', () => { /* sees state from test 1! */ });
});

// RIGHT
beforeEach(() => {
  useAuthStore.setState({ token: null, account: null, isAuthenticated: false });
});
```

- **Never test NativeWind class names.** Test visual behavior and accessibility, not className strings.
- **Never write tests that depend on execution timing.** Use `waitFor` instead of `setTimeout`.
- **Never mock modules you do not need to mock.** Only mock native modules and external APIs. Keep pure functions real.
- **Never skip error path tests.** If a hook can fail, test the failure state.
