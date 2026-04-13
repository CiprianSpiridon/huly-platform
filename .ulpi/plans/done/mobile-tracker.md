# Mobile Tracker (Phase 3)

## Context

Build the full issue tracking experience for the Huly mobile app. This is the core Jira-replacement
screen set: project list, issue list with filters/sorts/kanban, issue detail with all fields,
create/update issue, and search. Depends on auth (Phase 1) and API client (Phase 2) being complete.

## Stack (locked)

| Layer | Choice |
|---|---|
| Navigation | expo-router file-based, `(app)/tracker/` route group |
| Server state | TanStack Query (`@tanstack/react-query`) |
| Client state | Zustand (filter/sort preferences, draft state) |
| Lists | `@shopify/flash-list` for issue lists |
| Data access | Repository pattern (`src/repositories/tracker.ts`) |
| Styling | NativeWind v4 + Huly design tokens |
| Types | `import type` from `@hcengineering/tracker`, `task`, `contact`, `activity` |

## Mode

- **Planning mode:** HOLD
- **Default review:** claude
- **Agent:** expo-react-native-engineer
- **Prerequisites:** Phase 1 (auth) and Phase 2 (API client) completed

## Key Huly Types (type-only imports)

| Type | Source | Fields used |
|---|---|---|
| `Issue` | `@hcengineering/tracker` | title, description, status, priority, assignee, component, milestone, estimation, subIssues, parents, space, reportedTime |
| `Project` | `@hcengineering/tracker` | identifier, sequence, defaultIssueStatus, defaultAssignee |
| `IssueStatus` | `@hcengineering/tracker` | extends Status |
| `IssuePriority` | `@hcengineering/tracker` | enum: NoPriority, Urgent, High, Medium, Low |
| `Component` | `@hcengineering/tracker` | label, lead, space |
| `Milestone` | `@hcengineering/tracker` | label, status, targetDate |
| `IssueDraft` | `@hcengineering/tracker` | title, description, status, priority, assignee, component, space, dueDate, milestone, estimation |
| `TimeSpendReport` | `@hcengineering/tracker` | employee, date, value |
| `Employee` | `@hcengineering/contact` | active, position, personUuid |
| `Task` | `@hcengineering/task` | kind, status, number, assignee, dueDate, identifier, rank |

## Tasks

### TASK-001: Tracker repository layer
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** none (assumes Phase 2 API client exists)
- **writeScope:** [`mobile/src/repositories/tracker.ts`, `mobile/src/repositories/index.ts`]
- **Description:** Create `TrackerRepository` class with methods: `getProjects()`, `getIssues(projectId, filters?, sort?, pagination?)`, `getIssue(issueId)`, `createIssue(draft)`, `updateIssue(issueId, patch)`, `searchIssues(query)`. Uses the API client from Phase 2. Returns plain DTOs that mirror the Huly type shapes. Handles pagination cursors and error mapping.
- **Acceptance Criteria:**
  1. All 6 methods exist with typed parameters and return types
  2. Pagination returns `{ items, nextCursor, hasMore }` shape
  3. Returns typed error (e.g., `TrackerError.PROJECT_NOT_FOUND`) when API returns 404 for a deleted project
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-002: Tracker TanStack Query hooks
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-001]
- **writeScope:** [`mobile/src/hooks/useProjects.ts`, `mobile/src/hooks/useIssues.ts`, `mobile/src/hooks/useIssue.ts`]
- **Description:** Create query hooks: `useProjects()`, `useIssues(projectId, filters, sort)`, `useIssue(issueId)`, `useSearchIssues(query)`. Create mutation hooks: `useCreateIssue()`, `useUpdateIssue()`. All use `TrackerRepository`. Queries use stale-while-revalidate with 30s staleTime. Mutations invalidate affected query keys. `useIssues` supports infinite query for pagination.
- **Acceptance Criteria:**
  1. `useIssues` returns `{ data, fetchNextPage, hasNextPage, isLoading, error, refetch }`
  2. `useCreateIssue().mutate(draft)` invalidates the project's issue list query key
  3. When `issueId` is undefined/null, `useIssue` returns disabled query (no network request)
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-003: Tracker Zustand store
- **Type:** feature
- **Priority:** P1
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none
- **writeScope:** [`mobile/src/store/tracker.ts`]
- **Description:** Create `useTrackerStore` with Zustand. State: `selectedProjectId`, `issueFilters` (status[], priority[], assignee[]), `issueSort` (field + direction), `viewMode` ('list' | 'kanban'), `issueDraft` (partial IssueDraft for create flow). Actions: `setProject`, `setFilter`, `clearFilters`, `setSort`, `setViewMode`, `updateDraft`, `clearDraft`. Persist filter preferences to AsyncStorage via Zustand persist middleware.
- **Acceptance Criteria:**
  1. `setFilter('priority', [IssuePriority.High])` updates `issueFilters.priority`
  2. Closing and reopening the app preserves the last-used filter/sort via persistence
  3. `clearDraft()` resets all draft fields to defaults (empty title, NoPriority, null assignee)
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-004: Tab navigator with all tabs + Tracker route group
- **Type:** feature
- **Priority:** P0
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Dependencies:** none
- **writeScope:** [`mobile/src/app/(app)/_layout.tsx`, `mobile/src/app/(app)/tracker/_layout.tsx`, `mobile/src/app/(app)/tracker/index.tsx`, `mobile/src/app/(app)/chat/index.tsx`, `mobile/src/app/(app)/inbox/index.tsx`, `mobile/src/app/(app)/settings/index.tsx`]
- **Description:** REPLACE the placeholder `(app)/_layout.tsx` created by the auth phase (TASK-108) with the full tab layout using `@react-navigation/bottom-tabs`. Add all 4 tabs: Tracker (active), Chat, Inbox, Settings. Each tab points to its route group. Chat/Inbox/Settings groups will be populated by their respective phases -- use placeholder screens for now. Create the `tracker/` route group with a Stack navigator inside for push navigation between project list, issue list, and issue detail. Placeholder screens initially for tracker too. The tab shell reads badge counts from `useChatStore.unreadTotal` and `useInboxStore.unreadTotal` Zustand stores when they exist. Since these stores are created by later phases, use optional chaining or default to 0 when the stores are not yet available. When chat/inbox phases create those stores, badges automatically appear without changes to the tab shell.
- **Acceptance Criteria:**
  1. Bottom tab bar shows all 4 tabs: Tracker, Chat, Inbox, Settings
  2. Tab bar uses Huly design tokens: `bg-surface`, `text-nav-icon` inactive, `text-primary` active
  3. Tab bar remains visible when navigating within the tracker stack (no layout flash)
  4. Tab shell reads badge counts from `useChatStore` and `useInboxStore` Zustand stores when they exist (defaults to 0 when stores not yet created)
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-005: Project list screen
- **Type:** feature
- **Priority:** P0
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-004]
- **writeScope:** [`mobile/src/app/(app)/tracker/index.tsx`, `mobile/src/components/features/ProjectCard.tsx`]
- **Description:** Replace tracker index placeholder with project list. Use `useProjects()` hook. Show each project with identifier badge, name, and issue count. Tap navigates to issue list via `router.push`. Pull-to-refresh via `refetch()`. Loading skeleton while fetching. Empty state when user has no projects.
- **Acceptance Criteria:**
  1. Projects render with identifier (e.g., "HULY"), name, and member count
  2. Pull-to-refresh triggers re-fetch and shows refresh indicator
  3. Empty state shows illustration and "No projects" message when API returns empty array
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-006: Issue list screen
- **Type:** feature
- **Priority:** P0
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-003, TASK-005]
- **writeScope:** [`mobile/src/app/(app)/tracker/project/[id].tsx`, `mobile/src/components/features/IssueRow.tsx`, `mobile/src/components/features/IssueFilters.tsx`]
- **Description:** Issue list screen at `tracker/project/[id]`. Uses `useIssues(projectId, filters, sort)` with infinite scroll via FlashList. Header shows project name + filter/sort controls. `IssueRow` shows priority icon, identifier (HULY-123), title, status chip, assignee avatar. Filter bottom sheet: status checkboxes, priority checkboxes, assignee picker. Sort by: status, priority, last updated, due date. Pull-to-refresh. Kanban toggle (view mode from store) -- kanban view groups issues by status in horizontal scroll sections.
- **Acceptance Criteria:**
  1. Scrolling past the last loaded page triggers `fetchNextPage` and shows a footer spinner
  2. Applying a priority filter immediately filters the displayed list; clearing filters shows all
  3. Switching to kanban view groups issues into columns by status name with horizontal scroll
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-007: Issue detail screen
- **Type:** feature
- **Priority:** P0
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-006]
- **writeScope:** [`mobile/src/app/(app)/tracker/issue/[id].tsx`, `mobile/src/components/features/IssueDetail.tsx`, `mobile/src/components/features/IssueComments.tsx`]
- **Description:** Full issue detail at `tracker/issue/[id]`. Uses `useIssue(issueId)`. Shows: title (editable inline), description (rendered markdown), status selector, priority selector, assignee selector, component, milestone, parent issue link, sub-issues list, estimated/reported time, comments thread. Each selector opens a bottom sheet picker. Comments load via activity messages. Pull-to-refresh.
- **Acceptance Criteria:**
  1. All issue fields render: title, description, status chip, priority icon, assignee with avatar, component, milestone
  2. Tapping status chip opens bottom sheet with all project statuses; selecting one calls `useUpdateIssue`
  3. When the issue has been deleted server-side, navigating to it shows an error state with "back" action instead of crashing
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-008: Create issue screen
- **Type:** feature
- **Priority:** P1
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-003, TASK-007]
- **writeScope:** [`mobile/src/app/(app)/tracker/create.tsx`, `mobile/src/components/features/IssueForm.tsx`]
- **Description:** Modal screen for creating issues. Uses `useTrackerStore` draft state for form persistence across navigations. Form fields: title (required), description (plain text initially), status (defaults to project default), priority, assignee, component, milestone, estimation. Submit calls `useCreateIssue()`. Success navigates to the new issue detail. Cancel confirms if draft is dirty.
- **Acceptance Criteria:**
  1. Submitting with an empty title shows inline validation error; submit button stays disabled
  2. Navigating away and back preserves the draft (Zustand persist)
  3. After successful creation, issue list query is invalidated and new issue appears at top
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-009: Issue search
- **Type:** feature
- **Priority:** P2
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** [TASK-002, TASK-006]
- **writeScope:** [`mobile/src/app/(app)/tracker/search.tsx`, `mobile/src/components/features/SearchResults.tsx`]
- **Description:** Search screen accessible from project header. Debounced text input (300ms). Uses `useSearchIssues(query)`. Results show same `IssueRow` component. Search across title and identifier. Shows recent searches (persisted in AsyncStorage, max 10). Empty state when no results.
- **Acceptance Criteria:**
  1. Typing fewer than 2 characters shows "Type to search" hint; 2+ characters triggers API search after 300ms debounce
  2. Tapping a result navigates to issue detail screen
  3. Recent searches persist across app restarts and can be cleared
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

### TASK-010: UI primitives for Tracker
- **Type:** feature
- **Priority:** P1
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Dependencies:** none
- **writeScope:** [`mobile/src/components/ui/PriorityIcon.tsx`, `mobile/src/components/ui/StatusChip.tsx`, `mobile/src/components/ui/AvatarCircle.tsx`]
- **Description:** Shared UI primitives used across tracker screens. `PriorityIcon`: renders colored icon per IssuePriority enum value (Urgent=red, High=orange, Medium=yellow, Low=blue, NoPriority=gray). `StatusChip`: colored pill showing status name with category color. `AvatarCircle`: circular avatar with image or initials fallback + color from avatar palette. All props-only, no data fetching, max 80 lines each.
- **Acceptance Criteria:**
  1. `PriorityIcon priority={IssuePriority.Urgent}` renders a red urgent icon with `accessibilityLabel="Urgent"`
  2. `AvatarCircle` shows initials "JD" with deterministic color when no avatar image is provided
  3. All three components accept `testID` prop for testing
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit 2>&1 | tail -5`

---

## Dependency Graph

