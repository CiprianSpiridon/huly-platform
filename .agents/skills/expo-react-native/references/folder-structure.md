# Folder Structure

## What

The Huly mobile app uses Expo's managed workflow with expo-router v6 for file-based routing. The `app/` directory defines routes only. Business logic, components, hooks, and data access live under `src/`. This separation keeps route files thin and prevents coupling between navigation structure and application logic.

### Directory ownership table

| Directory | Owner | Contains | Never contains |
|---|---|---|---|
| `app/` | Routing | `_layout.tsx`, `page.tsx`, `+not-found.tsx`, route groups | Business logic, data fetching, shared components |
| `src/client/` | Platform integration | API client setup, account client wrapper, socket config | UI code, React components |
| `src/repositories/` | Data access | Domain-specific data access (issues, messages, notifications) | React hooks, UI components, navigation |
| `src/hooks/` | Screen-safe hooks | Custom hooks for screens (useIssues, useMessages, useAuth) | Raw fetch calls, direct API access |
| `src/store/` | Client state | Zustand stores for auth, workspace, UI preferences | Server data caching (use TanStack Query), API calls |
| `src/components/ui/` | Primitives | Props-only, no data, no navigation, no hooks with side effects | Data fetching, navigation calls, business logic |
| `src/components/features/` | Feature widgets | Compose ui/ primitives, may use hooks, may navigate | Data fetching, direct API calls |
| `src/lib/` | Pure utilities | Formatters, type guards, date helpers, constants | React hooks, components, side effects |
| `src/theme/` | Design system | Color tokens, spacing, typography, NativeWind config helpers | Components, hooks, business logic |
| `src/test/` | Test infrastructure | Jest setup, mock factories, test utilities | Production code |
| `assets/` | Static files | Fonts (IBM Plex Sans TTF), icons, images, splash | Code, config files |

## How

### Full directory tree

```
mobile/
  app/                              # expo-router routes -- files here become URL paths
    _layout.tsx                     # Root layout -- providers, fonts, splash screen
    +not-found.tsx                  # 404 fallback for unknown routes
    (auth)/                         # Auth route group -- no tab bar
      _layout.tsx                   # Stack navigator for auth screens
      login.tsx                     # Login screen
      workspace-select.tsx          # Workspace selection after login
    (app)/                          # Authenticated route group -- has tab bar
      _layout.tsx                   # Tab navigator (inbox, tracker, chat, settings)
      (tabs)/                       # Tab group
        _layout.tsx                 # Tab bar configuration
        inbox/
          _layout.tsx               # Stack for inbox tab
          index.tsx                 # Notification list
          [id].tsx                  # Notification detail
        tracker/
          _layout.tsx               # Stack for tracker tab
          index.tsx                 # Issue list / board view
          [id].tsx                  # Issue detail
          create.tsx                # Create issue
        chat/
          _layout.tsx               # Stack for chat tab
          index.tsx                 # Channel list
          [id].tsx                  # Channel messages
        settings/
          _layout.tsx               # Stack for settings tab
          index.tsx                 # Settings menu
          profile.tsx               # Profile editor
          notifications.tsx         # Notification preferences
      modal/                        # Modal routes (presented as modals)
        issue-create.tsx            # Quick issue creation modal
        attachment-preview.tsx      # Full-screen attachment viewer
  src/
    client/                         # Platform integration layer
      api.ts                        # PlatformClient singleton, connect/disconnect
      account.ts                    # AccountClient wrapper, server config loading
      config.ts                     # Server URL, environment config
      types.ts                      # Client-specific type re-exports
    repositories/                   # Domain data access -- one file per domain
      issues.ts                     # findIssues, findIssue, createIssue, updateIssue
      messages.ts                   # findMessages, sendMessage, markRead
      inbox.ts                      # findNotifications, markNotificationRead
      members.ts                    # findMembers, findMember
      spaces.ts                     # findSpaces (projects, channels)
    hooks/                          # Screen-safe hooks wrapping repositories + TanStack Query
      use-issues.ts                 # useIssues(), useIssue(id), useCreateIssue()
      use-messages.ts               # useMessages(channelId), useSendMessage()
      use-inbox.ts                  # useInbox(), useMarkRead()
      use-auth.ts                   # useAuth(), useLogin(), useLogout()
      use-workspace.ts              # useWorkspaces(), useSelectWorkspace()
      use-connection.ts             # useConnection() -- PlatformClient lifecycle
    store/                          # Zustand stores -- client state only
      auth.ts                       # token, account, isAuthenticated, login/logout actions
      workspace.ts                  # selectedWorkspace, workspaceList, selectWorkspace
      ui.ts                         # sidebarOpen, theme preference, local UI toggles
    components/
      ui/                           # Tier 1 -- primitives (props-only, no side effects)
        button.tsx                  # Pressable with Huly styling
        text.tsx                    # Typography component with IBM Plex Sans
        avatar.tsx                  # User avatar with initials fallback
        badge.tsx                   # Status badge (colored dot + label)
        card.tsx                    # Card container
        input.tsx                   # TextInput with label and error state
        icon.tsx                    # Icon wrapper
        spinner.tsx                 # Loading spinner
        empty-state.tsx             # Empty state placeholder
        error-state.tsx             # Error display with retry button
      features/                     # Tier 2 -- feature widgets (compose ui/, may use hooks)
        issue-card.tsx              # Issue summary card (avatar, title, priority, status)
        message-bubble.tsx          # Chat message with sender info
        notification-item.tsx       # Inbox notification row
        member-row.tsx              # Team member display
        attachment-thumbnail.tsx    # File/image attachment preview
        priority-icon.tsx           # Issue priority indicator
        status-badge.tsx            # Issue/project status with color
    lib/                            # Pure helpers -- no React, no side effects
      format.ts                     # formatDate, formatRelativeTime, formatFileSize
      guards.ts                     # isIssue, isMessage, isNotification type guards
      constants.ts                  # App-wide constants, priority labels, status maps
      deep-link.ts                  # Deep link URL parsing and building
      platform.ts                   # Platform.OS helpers, isIOS, isAndroid
    theme/                          # Design system tokens
      colors.ts                     # Huly color palette exported as constants
      tokens.ts                     # Spacing, radii, shadows, typography scales
      fonts.ts                      # Font family mapping for IBM Plex Sans
    test/                           # Test infrastructure
      setup.ts                      # Jest setup, mock native modules
      mocks/                        # Shared mock factories
        api.ts                      # Mock PlatformClient, mock AccountClient
        navigation.ts               # Mock expo-router
        storage.ts                  # Mock expo-secure-store
      factories/                    # Test data factories
        issue.ts                    # createMockIssue(), createMockIssueList()
        message.ts                  # createMockMessage()
        user.ts                     # createMockUser()
  assets/
    fonts/                          # IBM Plex Sans TTF files
      IBMPlexSans-Regular.ttf
      IBMPlexSans-Medium.ttf
      IBMPlexSans-SemiBold.ttf
      IBMPlexSans-Bold.ttf
    images/                         # Static images
      logo.png
      splash.png
      icon.png
      adaptive-icon.png
      notification-icon.png
  global.css                        # Tailwind directives
  tailwind.config.ts                # NativeWind/Tailwind config with Huly tokens
  metro.config.js                   # Metro bundler + NativeWind + monorepo
  babel.config.js                   # Babel + NativeWind plugin
  app.json                          # Expo config
  eas.json                          # EAS Build profiles
  tsconfig.json                     # TypeScript config
  jest.config.ts                    # Jest config
  package.json                      # Dependencies, scripts
```

### Component tiers

| Tier | Location | Can do | Cannot do |
|---|---|---|---|
| 1 -- primitives | `src/components/ui/` | Accept props, render UI, forward refs, use className | Data fetching, navigation, business logic, hooks with side effects |
| 2 -- features | `src/components/features/` | Compose ui/ primitives, use hooks, navigate | Direct API calls, raw fetch, inline queries |
| 3 -- route-specific | `app/**/_components/` | Everything: fetch data via hooks, compose any tier | Reuse outside its route. If needed in 2+ routes, promote to features/ |

### Promotion rules

| Trigger | Direction | Action |
|---|---|---|
| `app/_components/` used in 2+ routes | route --> `features/` | Move file, update imports, remove route-specific data logic |
| `features/` stripped of all hooks and logic | `features/` --> `ui/` | Make props-only, remove hook calls, update imports |
| `ui/` component gains hooks or business logic | **Stop** | It does not belong in `ui/`. Keep in `features/` |

### Repository file pattern

Every repository file follows the same structure:

```typescript
// src/repositories/issues.ts
import type { Doc, Ref, Class, FindOptions, DocumentQuery } from '@hcengineering/core';
import type { Issue } from '@hcengineering/tracker';

import { getApiClient } from '@/client/api';

export async function findIssues(
  query: DocumentQuery<Issue>,
  options?: FindOptions<Issue>
): Promise<Issue[]> {
  const client = getApiClient();
  return await client.findAll(tracker.class.Issue, query, options);
}

export async function findIssue(id: Ref<Issue>): Promise<Issue | undefined> {
  const client = getApiClient();
  return await client.findOne(tracker.class.Issue, { _id: id });
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

### Hook file pattern

Every hook wraps a repository with TanStack Query:

```typescript
// src/hooks/use-issues.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { findIssues, findIssue, updateIssue } from '@/repositories/issues';
import type { Issue } from '@hcengineering/tracker';
import type { Ref } from '@hcengineering/core';

export function useIssues(projectId: string) {
  return useQuery({
    queryKey: ['issues', projectId],
    queryFn: () => findIssues({ space: projectId as Ref<Space> }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useIssue(id: Ref<Issue>) {
  return useQuery({
    queryKey: ['issues', id],
    queryFn: () => findIssue(id),
    staleTime: 30_000,
  });
}
```

## When

**Where does this file go?**

```
Is it a route screen or layout?
  --> app/{group}/{path}.tsx

Is it an API/platform integration?
  --> src/client/{concern}.ts

Is it domain data access (findAll, createDoc, updateDoc)?
  --> src/repositories/{domain}.ts

Is it a React hook wrapping a repository?
  --> src/hooks/use-{domain}.ts

Is it client-only state (auth token, UI toggle)?
  --> src/store/{concern}.ts

Is it a presentational component with zero side effects?
  --> src/components/ui/{name}.tsx

Is it a feature widget that composes primitives?
  --> src/components/features/{name}.tsx

Is it a pure helper function (formatter, guard, constant)?
  --> src/lib/{concern}.ts

Is it a design token or color definition?
  --> src/theme/{concern}.ts

Is it test infrastructure?
  --> src/test/{concern}.ts
```

**When to create a route group:** When two or more sibling routes share a layout. `(auth)` screens share a minimal layout with no tab bar. `(app)` screens share the tab navigator. Route groups add no URL segment.

**When to add a `_components/` directory:** When a route needs a component that is specific to that screen and will not be reused. If it gets reused, promote it.

**When to add a new repository:** When a new Huly domain (e.g., `documents`, `hr`) needs data access. One file per domain. Never mix domains in one repository.

## Never

- **Never put business logic in `app/` route files.** Route files import hooks and components. They do not contain fetch calls, data transformations, or complex state logic.
- **Never use barrel exports** (`index.ts` re-exports). They defeat tree-shaking and create circular dependencies in React Native.
- **Never put data fetching in `src/components/`.** Data access goes through `src/hooks/` which wrap `src/repositories/`.
- **Never mix domains in a single repository file.** `issues.ts` handles issues only. Messages get their own `messages.ts`.
- **Never use relative imports beyond one level.** Always `@/` alias: `'@/components/ui/button'`, never `'../../../components/ui/button'`.
- **Never use PascalCase file names.** Files: `kebab-case.tsx`. Exports: `PascalCase`. Exception: route files follow expo-router conventions (`[id].tsx`, `_layout.tsx`).
- **Never put a component in `ui/` if it uses hooks with side effects.** It belongs in `features/`.
- **Never store server data in Zustand.** Server data belongs in TanStack Query via hooks. Zustand is for client-only state.
- **Never put React components in `src/lib/`.** The lib directory is for pure functions only.
