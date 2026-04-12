# State Management

## What

State in the Huly mobile app is divided into two categories: **client state** (managed by Zustand) and **server state** (managed by TanStack Query). These two systems must never overlap. Zustand handles authentication tokens, workspace selection, and UI preferences. TanStack Query handles all data from the Huly platform (issues, messages, notifications, members).

### State ownership table

| Data | Owner | Why |
|---|---|---|
| Auth token, account info | Zustand (`auth` store) | Local credential, not server-fetched |
| Selected workspace | Zustand (`workspace` store) | User's current choice, persisted locally |
| Workspace list | TanStack Query | Fetched from account service |
| UI preferences (sidebar, theme) | Zustand (`ui` store) | Ephemeral client toggle |
| Issues, issue detail | TanStack Query | Server data with caching |
| Messages, channels | TanStack Query | Server data with caching |
| Notifications | TanStack Query | Server data with caching |
| Members, contacts | TanStack Query | Server data with caching |
| Route params (issue ID, channel ID) | URL / `useLocalSearchParams` | Navigation state |
| Form input values | `useState` | Ephemeral, local to form |
| Modal / bottom sheet open state | `useState` | Ephemeral, local to screen |
| Offline queue | TanStack Query (mutation) | Pending mutations auto-retry |

### Decision tree

```
Is this data from the Huly platform API?
  Yes --> TanStack Query (useQuery / useMutation)

Is this a user credential or workspace selection?
  Yes --> Zustand store (persisted to expo-secure-store)

Is this a URL parameter (issue ID, channel ID)?
  Yes --> useLocalSearchParams from expo-router

Is this ephemeral UI state (form input, modal toggle)?
  Yes --> useState in the component

Is this an app-wide UI preference?
  Yes --> Zustand store (ui store)

None of the above?
  --> Probably useState. Ask before adding a new Zustand store.
```

## How

### Zustand auth store

```typescript
// src/store/auth.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { AccountUuid } from '@hcengineering/core';
import type { LoginInfo } from '@hcengineering/account-client';

interface AuthState {
  token: string | null;
  account: AccountUuid | null;
  isAuthenticated: boolean;

  setAuth: (loginInfo: LoginInfo) => Promise<void>;
  clearAuth: () => Promise<void>;
  restoreAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  account: null,
  isAuthenticated: false,

  setAuth: async (loginInfo: LoginInfo) => {
    if (!loginInfo.token) {
      throw new Error('Login response missing token');
    }
    await SecureStore.setItemAsync('auth_token', loginInfo.token);
    await SecureStore.setItemAsync('account_id', loginInfo.account);
    set({
      token: loginInfo.token,
      account: loginInfo.account,
      isAuthenticated: true,
    });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('account_id');
    await SecureStore.deleteItemAsync('workspace_url');
    set({
      token: null,
      account: null,
      isAuthenticated: false,
    });
  },

  restoreAuth: async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    const account = await SecureStore.getItemAsync('account_id');

    if (token && account) {
      set({
        token,
        account: account as AccountUuid,
        isAuthenticated: true,
      });
    }
  },
}));
```

### Zustand workspace store

```typescript
// src/store/workspace.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { WorkspaceUuid } from '@hcengineering/core';
import type { WorkspaceLoginInfo } from '@hcengineering/account-client';

interface WorkspaceState {
  selectedWorkspace: WorkspaceUuid | null;
  workspaceUrl: string | null;
  workspaceEndpoint: string | null;
  workspaceToken: string | null;
  activeProjectId: string | null;

  setWorkspace: (info: WorkspaceLoginInfo) => Promise<void>;
  setActiveProject: (projectId: string | null) => void;
  clearWorkspace: () => Promise<void>;
  restoreWorkspace: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedWorkspace: null,
  workspaceUrl: null,
  workspaceEndpoint: null,
  workspaceToken: null,
  activeProjectId: null,

  setWorkspace: async (info: WorkspaceLoginInfo) => {
    await SecureStore.setItemAsync('workspace_url', info.workspaceUrl);
    await SecureStore.setItemAsync('workspace_id', info.workspace);
    await SecureStore.setItemAsync('workspace_token', info.token);
    await SecureStore.setItemAsync('workspace_endpoint', info.endpoint);
    set({
      selectedWorkspace: info.workspace,
      workspaceUrl: info.workspaceUrl,
      workspaceEndpoint: info.endpoint,
      workspaceToken: info.token,
    });
  },

  setActiveProject: (projectId: string | null) => {
    set({ activeProjectId: projectId });
  },

  clearWorkspace: async () => {
    await SecureStore.deleteItemAsync('workspace_url');
    await SecureStore.deleteItemAsync('workspace_id');
    await SecureStore.deleteItemAsync('workspace_token');
    await SecureStore.deleteItemAsync('workspace_endpoint');
    set({
      selectedWorkspace: null,
      workspaceUrl: null,
      workspaceEndpoint: null,
      workspaceToken: null,
      activeProjectId: null,
    });
  },

  restoreWorkspace: async () => {
    const workspaceUrl = await SecureStore.getItemAsync('workspace_url');
    const workspace = await SecureStore.getItemAsync('workspace_id');
    const token = await SecureStore.getItemAsync('workspace_token');
    const endpoint = await SecureStore.getItemAsync('workspace_endpoint');

    if (workspaceUrl && workspace && token && endpoint) {
      set({
        selectedWorkspace: workspace as WorkspaceUuid,
        workspaceUrl,
        workspaceEndpoint: endpoint,
        workspaceToken: token,
      });
    }
  },
}));
```

### Zustand UI store

```typescript
// src/store/ui.ts
import { create } from 'zustand';

interface UIState {
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: true,
  setOnline: (online: boolean) => set({ isOnline: online }),
}));
```

### TanStack Query global config

```typescript
// In root layout (app/_layout.tsx):
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s before data is considered stale
      gcTime: 5 * 60_000,         // 5 min before inactive data is garbage collected
      retry: 2,                    // Retry failed queries twice
      refetchOnWindowFocus: false, // RN does not have window focus events like web
      networkMode: 'offlineFirst', // Return cached data when offline
    },
    mutations: {
      retry: 1,                    // Retry failed mutations once
    },
  },
});
```

### Reading Zustand state outside React

Zustand stores can be read and subscribed to outside React components, which is useful for repository functions and push notification handlers:

```typescript
// In a repository or utility:
import { useAuthStore } from '@/store/auth';

function getToken(): string | null {
  return useAuthStore.getState().token;
}

// In a push notification handler:
import { useWorkspaceStore } from '@/store/workspace';

function handlePushNavigation(issueId: string): void {
  const workspace = useWorkspaceStore.getState().selectedWorkspace;
  if (workspace) {
    router.push(`/tracker/${issueId}`);
  }
}
```

### Selecting state efficiently

```typescript
// Select only what you need -- component re-renders only when this value changes
const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
const token = useAuthStore((s) => s.token);

// Multiple values -- use a shallow equality selector
import { useShallow } from 'zustand/react/shallow';

const { token, account } = useAuthStore(
  useShallow((s) => ({ token: s.token, account: s.account }))
);
```

## When

### When to use Zustand vs TanStack Query vs useState vs route params

| Data type | Tool | Example |
|---|---|---|
| Server data (issues, messages) | TanStack Query | `useQuery({ queryKey: ['issues'] })` |
| Auth credentials | Zustand | `useAuthStore((s) => s.token)` |
| Selected workspace | Zustand | `useWorkspaceStore((s) => s.selectedWorkspace)` |
| Route parameters | `useLocalSearchParams` | `const { id } = useLocalSearchParams()` |
| Form input | `useState` | `const [title, setTitle] = useState('')` |
| Modal open state | `useState` | `const [open, setOpen] = useState(false)` |
| Network status | Zustand (`ui` store) | `useUIStore((s) => s.isOnline)` |

### When to add a new Zustand store

Only when: (1) the data is not from an API, (2) multiple screens need it, and (3) it does not fit in an existing store. Most state needs are covered by the three existing stores (auth, workspace, ui).

### When to derive state vs store state

**Compute derived values during render, not in the store:**

```typescript
// WRONG -- storing derived data
const useIssueStore = create((set) => ({
  issues: [],
  openIssueCount: 0,  // derived!
  setIssues: (issues) => set({
    issues,
    openIssueCount: issues.filter(i => !i.isDone).length,
  }),
}));

// RIGHT -- compute during render
function IssueCounter() {
  const { data: issues } = useIssues(projectId);
  const openCount = useMemo(
    () => issues?.filter((i) => !i.isDone).length ?? 0,
    [issues]
  );
  return <Text>{openCount} open</Text>;
}
```

## Never

- **Never store server data in Zustand.**

```typescript
// WRONG -- duplicating TanStack Query's job
const useStore = create((set) => ({
  issues: [],
  fetchIssues: async () => {
    const data = await findIssues();
    set({ issues: data });
  },
}));

// RIGHT -- TanStack Query caches and manages server data
const { data: issues } = useIssues(projectId);
```

- **Never use React Context for data that should be in Zustand or TanStack Query.**

```typescript
// WRONG -- context for auth state
const AuthContext = createContext<AuthState>(null!);
function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  return <AuthContext.Provider value={{ token }}>{children}</AuthContext.Provider>;
}

// RIGHT -- Zustand store
const isAuth = useAuthStore((s) => s.isAuthenticated);
```

- **Never call hooks conditionally.**

```typescript
// WRONG -- conditional hook
function IssueScreen({ id }: { id?: string }) {
  if (id) {
    const { data } = useIssue(id);  // hooks cannot be conditional
  }
}

// RIGHT -- use enabled option
function IssueScreen({ id }: { id?: string }) {
  const { data } = useIssue(id ?? '', { enabled: id !== undefined });
}
```

- **Never subscribe to the entire Zustand store.** Always use selectors.

```typescript
// WRONG -- re-renders on ANY store change
const store = useAuthStore();

// RIGHT -- re-renders only when token changes
const token = useAuthStore((s) => s.token);
```

- **Never mutate state directly.** Zustand's `set` replaces state immutably. TanStack Query's cache is also immutable.
- **Never use `AsyncStorage` for auth tokens.** Tokens must be in `expo-secure-store`, managed through the auth Zustand store.
- **Never mix Zustand and TanStack Query for the same data.** Pick one owner per data type.
