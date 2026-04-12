# Data Client Pattern

## What

The Huly mobile app accesses data through a three-layer architecture: **client** (platform connection), **repository** (domain data access), and **hook** (React-safe query wrapper). Screens never call APIs directly. This pattern ensures consistent error handling, caching, and type safety across all data operations.

### Layer responsibilities

| Layer | Location | Responsibility | Depends on |
|---|---|---|---|
| Client | `src/client/` | Connect to Huly platform, manage PlatformClient lifecycle, handle auth tokens | @hcengineering/api-client, @hcengineering/account-client |
| Repository | `src/repositories/` | Domain-specific data operations (findAll, createDoc, updateDoc) | Client layer |
| Hook | `src/hooks/` | TanStack Query wrappers, caching, optimistic updates, error handling | Repository layer |

### PlatformClient API surface

The `PlatformClient` from `@hcengineering/api-client` provides these operations:

| Method | Signature | Use |
|---|---|---|
| `findAll` | `findAll<T>(class, query, options?) => FindResult<T>` | Fetch multiple documents |
| `findOne` | `findOne<T>(class, query, options?) => T \| undefined` | Fetch single document |
| `createDoc` | `createDoc<T>(class, space, data, id?) => Ref<T>` | Create a document |
| `updateDoc` | `updateDoc<T>(class, space, id, update) => TxResult` | Update a document |
| `removeDoc` | `removeDoc<T>(class, space, id) => TxResult` | Remove a document |
| `addCollection` | `addCollection<T,P>(class, space, attachedTo, ...) => Ref<P>` | Add attached document |
| `getHierarchy` | `getHierarchy() => Hierarchy` | Access class hierarchy |
| `getModel` | `getModel() => ModelDb` | Access model database |

### AccountClient API surface

The `AccountClient` from `@hcengineering/account-client` provides:

| Method | Signature | Use |
|---|---|---|
| `loginOtp` | `loginOtp(email) => OtpInfo` | Initiate OTP login |
| `validateOtp` | `validateOtp(email, code, password?) => LoginInfo` | Validate OTP code |
| `selectWorkspace` | `selectWorkspace(url, kind?) => WorkspaceLoginInfo` | Select workspace, get token + endpoint |
| `getUserWorkspaces` | `getUserWorkspaces() => WorkspaceInfoWithStatus[]` | List user's workspaces |
| `getLoginInfoByToken` | `getLoginInfoByToken() => LoginInfoByToken` | Validate existing token |

## How

### Client layer -- PlatformClient singleton

```typescript
// src/client/api.ts
import { connect, type PlatformClient } from '@hcengineering/api-client';

import { getServerUrl } from './config';
import { getStoredToken, getStoredWorkspace } from './auth-storage';

let client: PlatformClient | null = null;

export async function connectClient(): Promise<PlatformClient> {
  if (client !== null) {
    return client;
  }

  const url = getServerUrl();
  const token = await getStoredToken();
  const workspace = await getStoredWorkspace();

  if (!token || !workspace) {
    throw new Error('No auth credentials. User must log in.');
  }

  client = await connect(url, { token, workspace });
  return client;
}

export function getApiClient(): PlatformClient {
  if (client === null) {
    throw new Error('PlatformClient not connected. Call connectClient() first.');
  }
  return client;
}

export async function disconnectClient(): Promise<void> {
  if (client !== null) {
    await client.close();
    client = null;
  }
}
```

### Client layer -- AccountClient wrapper

```typescript
// src/client/account.ts
import { getClient as getAccountClient, type AccountClient } from '@hcengineering/account-client';
import { loadServerConfig, type ServerConfig } from '@hcengineering/api-client';

import { getServerUrl } from './config';

let config: ServerConfig | null = null;
let accountClient: AccountClient | null = null;

export async function getConfig(): Promise<ServerConfig> {
  if (config === null) {
    config = await loadServerConfig(getServerUrl());
  }
  return config;
}

export async function getOrCreateAccountClient(token?: string): Promise<AccountClient> {
  const serverConfig = await getConfig();
  accountClient = getAccountClient(serverConfig.ACCOUNTS_URL, token);
  return accountClient;
}

export function clearAccountClient(): void {
  accountClient = null;
  config = null;
}
```

### Client layer -- server config

```typescript
// src/client/config.ts
const DEFAULT_URL = 'https://app.huly.io';

export function getServerUrl(): string {
  return process.env.EXPO_PUBLIC_HULY_URL ?? DEFAULT_URL;
}

export function getFilesUrl(config: { FILES_URL: string }, objectName: string): string {
  return config.FILES_URL
    .replace(':filename', objectName)
    .replace(':blobId', objectName);
}
```

### Repository layer -- issues

```typescript
// src/repositories/issues.ts
import type {
  Doc,
  DocumentQuery,
  DocumentUpdate,
  FindOptions,
  Ref,
  Space,
} from '@hcengineering/core';
import tracker, { type Issue, type IssueStatus } from '@hcengineering/tracker';

import { getApiClient } from '@/client/api';

export async function findIssues(
  query: DocumentQuery<Issue> = {},
  options?: FindOptions<Issue>
): Promise<Issue[]> {
  const client = getApiClient();
  const result = await client.findAll(tracker.class.Issue, query, {
    sort: { modifiedOn: -1 },
    limit: 50,
    ...options,
  });
  return [...result];
}

export async function findIssue(id: Ref<Issue>): Promise<Issue | undefined> {
  const client = getApiClient();
  return await client.findOne(tracker.class.Issue, { _id: id });
}

export async function createIssue(
  space: Ref<Space>,
  data: {
    title: string;
    description: string;
    priority: number;
    status: Ref<IssueStatus>;
    assignee?: Ref<Doc> | null;
  }
): Promise<Ref<Issue>> {
  const client = getApiClient();
  return await client.createDoc(tracker.class.Issue, space, {
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: data.status,
    assignee: data.assignee ?? null,
    number: 0,
    identifier: '',
    kind: tracker.issueKind.Default,
    component: null,
    milestone: null,
    estimation: 0,
    remainingTime: 0,
    reportedTime: 0,
    relations: [],
    childInfo: [],
    parents: [],
    dueDate: null,
    rank: '',
  });
}

export async function updateIssue(
  id: Ref<Issue>,
  space: Ref<Space>,
  update: DocumentUpdate<Issue>
): Promise<void> {
  const client = getApiClient();
  await client.updateDoc(tracker.class.Issue, space, id, update);
}
```

### Repository layer -- messages

```typescript
// src/repositories/messages.ts
import type { DocumentQuery, FindOptions, Ref, Space } from '@hcengineering/core';
import chunter, { type ChunterMessage } from '@hcengineering/chunter';

import { getApiClient } from '@/client/api';

export async function findMessages(
  channelId: Ref<Space>,
  options?: FindOptions<ChunterMessage>
): Promise<ChunterMessage[]> {
  const client = getApiClient();
  const result = await client.findAll(chunter.class.ChunterMessage, {
    space: channelId,
  }, {
    sort: { createdOn: -1 },
    limit: 50,
    ...options,
  });
  return [...result];
}

export async function sendMessage(
  channelId: Ref<Space>,
  content: string
): Promise<Ref<ChunterMessage>> {
  const client = getApiClient();
  return await client.createDoc(chunter.class.ChunterMessage, channelId, {
    content,
  });
}
```

### Hook layer -- TanStack Query integration

```typescript
// src/hooks/use-issues.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Ref, Space } from '@hcengineering/core';
import type { Issue } from '@hcengineering/tracker';

import { findIssues, findIssue, createIssue, updateIssue } from '@/repositories/issues';

const ISSUES_STALE_TIME = 30_000;      // 30 seconds
const ISSUES_GC_TIME = 5 * 60_000;     // 5 minutes

export function useIssues(projectId?: string) {
  return useQuery({
    queryKey: ['issues', projectId],
    queryFn: () => findIssues(
      projectId ? { space: projectId as Ref<Space> } : {}
    ),
    staleTime: ISSUES_STALE_TIME,
    gcTime: ISSUES_GC_TIME,
    enabled: projectId !== undefined,
  });
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: ['issues', 'detail', id],
    queryFn: () => findIssue(id as Ref<Issue>),
    staleTime: ISSUES_STALE_TIME,
    gcTime: ISSUES_GC_TIME,
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      space: Ref<Space>;
      title: string;
      description: string;
      priority: number;
      status: Ref<any>;
    }) => createIssue(params.space, params),

    onSuccess: (_data, variables) => {
      // Invalidate the issue list for this project
      queryClient.invalidateQueries({ queryKey: ['issues', variables.space] });
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: Ref<Issue>;
      space: Ref<Space>;
      update: Record<string, unknown>;
    }) => updateIssue(params.id, params.space, params.update),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issues', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['issues', variables.space] });
    },
  });
}
```

### Error handling in repositories

```typescript
// src/repositories/base.ts -- shared error handling
import { PlatformError } from '@hcengineering/platform';

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly domain: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(`[${domain}:${operation}] ${message}`);
    this.name = 'RepositoryError';
  }
}

export function wrapRepositoryError(
  domain: string,
  operation: string,
  error: unknown
): RepositoryError {
  if (error instanceof PlatformError) {
    return new RepositoryError(error.message, domain, operation, error);
  }
  if (error instanceof Error) {
    return new RepositoryError(error.message, domain, operation, error);
  }
  return new RepositoryError('Unknown error', domain, operation, error);
}
```

## When

### Data access decision tree

| Question | Answer | Layer |
|---|---|---|
| Need to configure platform connection? | Yes | `src/client/` |
| Need to query/mutate Huly documents? | Yes | `src/repositories/` |
| Need data in a React component? | Yes | `src/hooks/` with TanStack Query |
| Need data outside React (e.g., push handler)? | Yes | Call repository directly |

### When to use findAll vs findOne

| Situation | Method |
|---|---|
| List screen (issues, messages, notifications) | `findAll` with query + limit + sort |
| Detail screen (single issue, single message) | `findOne` with `{ _id: id }` |
| Count / existence check | `findAll` with `{ limit: 1 }`, check result length |

### TanStack Query configuration per domain

| Domain | staleTime | gcTime | refetchOnWindowFocus | Notes |
|---|---|---|---|---|
| Issues | 30s | 5 min | false | Moderate staleness OK |
| Messages | 10s | 2 min | false | Fresher data for chat |
| Notifications | 15s | 5 min | false | Badge count accuracy |
| Workspaces | 5 min | 30 min | false | Rarely changes |
| Members | 2 min | 10 min | false | Moderate staleness OK |

### When to use optimistic updates

Use optimistic updates via `onMutate` when: (1) the mutation is likely to succeed, (2) the user expects instant feedback, and (3) rollback is straightforward.

```typescript
export function useToggleIssueDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: Ref<Issue>; space: Ref<Space>; done: boolean }) =>
      updateIssue(params.id, params.space, { isDone: params.done }),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['issues', variables.space] });
      const previous = queryClient.getQueryData(['issues', variables.space]);
      queryClient.setQueryData(['issues', variables.space], (old: Issue[] | undefined) =>
        old?.map((issue) =>
          issue._id === variables.id ? { ...issue, isDone: variables.done } : issue
        )
      );
      return { previous };
    },

    onError: (_error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['issues', variables.space], context.previous);
      }
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issues', variables.space] });
    },
  });
}
```

## Never

- **Never call repositories from components directly.** Always go through hooks.

```typescript
// WRONG -- repository called from component
import { findIssues } from '@/repositories/issues';
function IssueList() {
  const [issues, setIssues] = useState([]);
  useEffect(() => { findIssues().then(setIssues); }, []);
}

// RIGHT -- hook wrapping repository with TanStack Query
import { useIssues } from '@/hooks/use-issues';
function IssueList() {
  const { data: issues, isLoading, error } = useIssues(projectId);
}
```

- **Never use raw fetch in any layer.** All Huly data access goes through PlatformClient.

```typescript
// WRONG
const res = await fetch('https://app.huly.io/api/v1/find-all', { ... });

// RIGHT
const client = getApiClient();
const result = await client.findAll(tracker.class.Issue, query);
```

- **Never store query results in Zustand.** TanStack Query is the cache for server data.

```typescript
// WRONG -- duplicating cache
const useIssueStore = create((set) => ({
  issues: [],
  fetchIssues: async () => {
    const issues = await findIssues();
    set({ issues });
  },
}));

// RIGHT -- TanStack Query is the cache
export function useIssues(projectId: string) {
  return useQuery({ queryKey: ['issues', projectId], queryFn: () => findIssues({ space: projectId }) });
}
```

- **Never skip query invalidation after mutations.** Stale list data confuses users.
- **Never use inline queryFn with complex logic.** Extract to a repository function.
- **Never forget the `enabled` option** when a query depends on a value that may be undefined. Without it, the query fires immediately with undefined parameters.
- **Never swallow errors in catch blocks.** Always re-throw or wrap with `RepositoryError`.
