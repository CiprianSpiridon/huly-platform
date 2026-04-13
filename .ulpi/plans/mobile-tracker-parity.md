# Plan: Mobile Tracker Feature Parity

## Overview

Close the highest-value tracker gap between the web workbench tracker and the Expo mobile app.
Current mobile tracker covers project list, issue list, issue detail, comments, create, and search.
Web tracker additionally exposes project create/edit, milestone and component management, richer issue
field editing, parent/sub-issue and relation workflows, issue templates, and my-issues style entry
points. This plan targets parity for those user-facing tracker workflows without widening into
workspace-admin tracker configuration.

## Scope Challenge

- Assumed planning mode: `HOLD`
- Assumed default review: `claude`
- Scope cut applied: focus on user-facing tracker parity inside `mobile/src/app/(app)/tracker/**`
  and adjacent tracker hooks/components only
- Explicitly excluded from this plan:
  - tracker space-type administration
  - permission matrix editors
  - workflow/status-model administration outside per-project defaults
  - non-tracker cross-app integrations

## Prerequisites

- Existing scaffold/auth/api client/tracker phases are already implemented in `mobile/`
- `mobile-richtext` should be complete before rich issue-description editing is called done
- `mobile-attachments` should be complete before issue attachment parity is called done
- `mobile-websocket` is helpful but not required for this tracker parity cut

## Non-Goals

- Rebuilding the full workbench viewlet/filter architecture on mobile
- Porting tracker workspace settings screens from Svelte one-to-one
- Introducing project templates for non-tracker modules
- Changing server-side tracker models or web tracker behavior

## Contracts

- Persistence and mutations continue to flow through `mobile/src/repositories/tracker.ts`
- Server state remains in TanStack Query; draft/preferences remain in Zustand
- New tracker routes must stay under `mobile/src/app/(app)/tracker/**`
- New create/edit surfaces must not regress the existing create route
- If project metadata required for a form is not loaded, the form must block submission with an
  explicit state instead of silently sending partial payloads

## Existing Code Leverage

- Current tracker routes:
  - [index.tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/tracker/index.tsx)
  - [project/[id].tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/tracker/project/[id].tsx)
  - [issue/[id].tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/tracker/issue/[id].tsx)
  - [create.tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/tracker/create.tsx)
  - [search.tsx](/Users/ciprian/work_cip/huly-platform/mobile/src/app/(app)/tracker/search.tsx)
- Current tracker data/state:
  - [tracker.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/repositories/tracker.ts)
  - [useIssues.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/hooks/useIssues.ts)
  - [tracker.ts](/Users/ciprian/work_cip/huly-platform/mobile/src/store/tracker.ts)
- Web tracker parity reference surface:
  - [CreateProject.svelte](/Users/ciprian/work_cip/huly-platform/plugins/tracker-resources/src/components/projects/CreateProject.svelte)
  - [IssuesView.svelte](/Users/ciprian/work_cip/huly-platform/plugins/tracker-resources/src/components/issues/IssuesView.svelte)
  - [Milestones.svelte](/Users/ciprian/work_cip/huly-platform/plugins/tracker-resources/src/components/milestones/Milestones.svelte)
  - [Components.svelte](/Users/ciprian/work_cip/huly-platform/plugins/tracker-resources/src/components/components/Components.svelte)
  - [IssueTemplates.svelte](/Users/ciprian/work_cip/huly-platform/plugins/tracker-resources/src/components/templates/IssueTemplates.svelte)
  - [MyIssues.svelte](/Users/ciprian/work_cip/huly-platform/plugins/tracker-resources/src/components/myissues/MyIssues.svelte)

## Tasks

### TASK-001: Expand tracker repository parity contract

Add repository methods for project detail, project members, components, milestones, issue relations,
template summaries, and time-report mutations so later UI tasks do not invent their own data access.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/src/repositories/tracker.ts`, `mobile/src/repositories/index.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Repository exposes typed read methods for project detail, components, milestones, members, and issue relations.
  2. Repository exposes typed write methods for project create/update, component create/update, milestone create/update, and issue time reporting.
  3. When a project-scoped entity is missing or archived, repository methods return a typed failure instead of leaking raw transport errors.

### TASK-002: Extend tracker hooks for parity data and mutations

Wire the new repository contract into TanStack Query so project metadata, relations, templates, and
mutation invalidation stay centralized.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-001`
- **writeScope:** `mobile/src/hooks/useProjects.ts`, `mobile/src/hooks/useIssues.ts`, `mobile/src/hooks/useIssue.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Hooks expose project detail, component, milestone, template, and relation queries without forcing screens to call repositories directly.
  2. Project, component, milestone, and issue-field mutations invalidate the exact project and issue keys they affect.
  3. Disabled queries stay inert when `projectId` or `issueId` is absent, instead of issuing malformed network requests.

### TASK-003: Expand tracker store for full issue/project draft state

Extend the tracker Zustand store so create/edit flows can carry parity fields without ad hoc screen
state.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **writeScope:** `mobile/src/store/tracker.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Draft state includes component, milestone, due date, estimation, parent issue, template selection, and attachment ids.
  2. Clearing the draft resets all parity fields, not just title/description/priority.
  3. Persisted state does not leak stale project-specific selections across workspace changes.

### TASK-004: Add project create/edit flow

Introduce a mobile project form and route so tracker parity includes project creation and editing,
including defaults that mobile issue creation depends on.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`
- **writeScope:** `mobile/src/app/(app)/tracker/index.tsx`, `mobile/src/app/(app)/tracker/project/edit.tsx`, `mobile/src/components/features/ProjectForm.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Tracker index exposes a create/edit project entry point and edit route wiring resolves with typed params.
  2. Project form supports name, identifier, privacy, default assignee, and default issue status.
  3. Submitting invalid or duplicate identifiers shows a recoverable validation state instead of closing the form.

### TASK-005: Add component and milestone management surfaces

Bring project-scoped tracker metadata management to mobile so issue forms and filters can use real
project entities instead of opaque refs.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-004`
- **writeScope:** `mobile/src/app/(app)/tracker/project/components.tsx`, `mobile/src/app/(app)/tracker/project/milestones.tsx`, `mobile/src/components/features/TrackerEntityRow.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Users can view and create/edit project components and milestones from mobile tracker routes.
  2. Lists render human-readable labels, lead/status metadata, and empty states for projects with no entries.
  3. Archived or deleted entities are excluded from selection lists after mutation invalidation.

### TASK-006: Bring issue detail to field parity

Upgrade issue detail from a mostly-read surface into the parity screen for component, milestone,
parent/sub-issue, relation, due date, estimation, time spent, and attachments.

- **Type:** feature
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-002`, `TASK-003`, `TASK-005`
- **writeScope:** `mobile/src/app/(app)/tracker/issue/[id].tsx`, `mobile/src/components/features/IssueDetail.tsx`, `mobile/src/components/features/IssueComments.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Issue detail renders editable component, milestone, due date, estimation, parent issue, relations, and sub-issue summaries using real lookup data.
  2. Time-report creation and refresh update reported-time UI without forcing a full app reload.
  3. Missing related docs or deleted parents show a safe fallback row instead of rendering raw refs or crashing the screen.

### TASK-007: Bring create/edit issue flow to parity

Upgrade issue creation into a shared create/edit form that supports the parity field set and proper
project defaults.

- **Type:** feature
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-002`, `TASK-003`, `TASK-005`
- **writeScope:** `mobile/src/app/(app)/tracker/create.tsx`, `mobile/src/app/(app)/tracker/edit/[id].tsx`, `mobile/src/components/features/IssueForm.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Shared form supports status, priority, assignee, component, milestone, due date, estimation, parent issue, description markup, and attachments.
  2. Edit mode preloads existing issue state and preserves parity fields when saving partial changes.
  3. Submission is blocked when required project defaults or parity metadata are still loading, instead of sending partial payloads.

### TASK-008: Add issue templates flow

Expose tracker issue templates on mobile so users can start from the same reusable tracker patterns
available on the web.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-007`
- **writeScope:** `mobile/src/app/(app)/tracker/templates.tsx`, `mobile/src/app/(app)/tracker/create.tsx`, `mobile/src/components/features/IssueTemplateCard.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Mobile tracker exposes a template list with project-scoped template summaries and empty/error states.
  2. Selecting a template hydrates the create form draft without discarding manually-entered overrides.
  3. Templates that reference missing metadata surface a blocking explanation instead of creating malformed issues.

### TASK-009: Add my-issues and advanced filter parity

Close the remaining day-to-day parity gap by adding a personal issue entry point and richer filters
for the existing list/search surfaces.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-002`, `TASK-005`, `TASK-006`
- **writeScope:** `mobile/src/app/(app)/tracker/my-issues.tsx`, `mobile/src/components/features/IssueFilters.tsx`, `mobile/src/app/(app)/tracker/search.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Mobile exposes a dedicated “My Issues” surface scoped to the authenticated user with the same repository/filter contract as project issues.
  2. Filters include component, milestone, assignee, due date, and relation-aware combinations without raw-id rendering.
  3. Clearing or restoring saved filters resets both list and search results consistently.

## Failure Modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| Project defaults missing during create/edit | Form has no valid status or default assignee context | Block submit and show explicit metadata-loading state |
| Deleted milestone/component referenced by an issue | Detail screen receives missing related doc | Render safe fallback row and offer reassignment |
| Template references stale project metadata | Template apply cannot resolve fields | Stop hydration and show template repair message |
| Time-report mutation succeeds but detail stays stale | Reported time does not update after save | Invalidate issue detail and project issue list query keys together |
| Draft leaks across workspace switch | Issue form opens with wrong project metadata | Clear persisted tracker draft when workspace identity changes |

## Ship Cut

If execution stops halfway, the minimum coherent cut is after `TASK-007`.

That cut yields:
- project create/edit
- component and milestone management
- full issue create/edit/detail parity for core fields

Items below that cut and safe to defer:
- issue templates
- my-issues entry point
- richer advanced filters beyond the current list/search core

## Test Coverage Map

- `TASK-001`: repository contract + typed failure handling
- `TASK-002`: query invalidation and disabled-query behavior
- `TASK-003`: persisted draft/reset behavior across workspace changes
- `TASK-004`: project form success + duplicate identifier failure path
- `TASK-005`: component/milestone CRUD success + archived-entity exclusion
- `TASK-006`: issue detail edit flow + missing-related-doc fallback
- `TASK-007`: create/edit form submission gating + preloaded edit state
- `TASK-008`: template hydration + stale-template failure path
- `TASK-009`: my-issues scoping + filter clear/restore consistency

## Execution Summary

- Tasks: 9
- Parallelizable foundations:
  - `TASK-001`
  - `TASK-003`
- Main critical path:
  - `TASK-001 -> TASK-002 -> TASK-005 -> TASK-006 -> TASK-007`
- Secondary delivery path:
  - `TASK-001 -> TASK-002 -> TASK-004 -> TASK-005`
- Optional polish path:
  - `TASK-007 -> TASK-008`
  - `TASK-006 -> TASK-009`

## Task Dependencies

```text
TASK-001 -> TASK-002
TASK-001 -> TASK-004
TASK-001 -> TASK-005
TASK-001 -> TASK-008

TASK-002 -> TASK-004
TASK-002 -> TASK-006
TASK-002 -> TASK-007
TASK-002 -> TASK-009

TASK-003 -> TASK-006
TASK-003 -> TASK-007

TASK-004 -> TASK-005

TASK-005 -> TASK-006
TASK-005 -> TASK-007
TASK-005 -> TASK-009

TASK-006 -> TASK-009

TASK-007 -> TASK-008
```
