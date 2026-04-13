# Plan: Mobile Tracker Feature Parity

## Overview

Close the highest-value tracker gap between the web workbench tracker and the Expo mobile app.
Current mobile tracker covers project list, issue list, issue detail, comments, create, and search.
Web tracker additionally exposes project CRUD, milestone and component management, richer issue
field editing, parent/sub-issue and relation workflows, labels, templates, richer comments, and
my-issues style entry points. This plan targets those user-facing tracker workflows without widening
into workspace-admin tracker configuration.

## Scope Challenge

- Assumed planning mode: `HOLD`
- Assumed default review: `claude`
- Scope cut applied: focus on tracker parity inside `mobile/src/app/(app)/tracker/**` and adjacent
  tracker hooks/components only
- Explicitly excluded from this plan:
  - tracker space-type administration
  - permission matrix editors
  - workflow/status-model administration outside per-project defaults
  - non-tracker cross-app integrations
  - project templates for non-tracker modules

## Prerequisites

- Existing scaffold/auth/api client/tracker phases are already implemented in `mobile/`
- `mobile-richtext` should be complete before rich issue-description or comment composition parity is called done
- `mobile-attachments` should be complete before issue attachment parity is called done

## Non-Goals

- Rebuilding the full workbench viewlet/filter architecture on mobile
- Porting tracker workspace settings screens from Svelte one-to-one
- Changing server-side tracker models or web tracker behavior
- Introducing non-tracker admin surfaces into the tracker tab

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

## Scope Update (2026-04-13)

Added TASK-012 through TASK-022 to cover gaps identified in the feature-comparison audit:
delete issue, labels/tags, comment edit/delete, activity timeline, comment reactions/mentions,
saved filters, kanban enhancements, bulk operations, project delete, sub-issue parity, attachment
delete, and comment richtext parity.

## Tasks

### TASK-001: Expand tracker repository parity contract

Add repository methods for project detail, project members, components, milestones, issue relations,
template summaries, time-report mutations, issue delete, labels, and the richer issue-filter query
contract used by parity screens.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **writeScope:** `mobile/src/repositories/tracker.ts`, `mobile/src/repositories/index.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Repository exposes typed read methods for project detail, components, milestones, members, issue relations, template summaries, labels, and my-issues queries.
  2. Repository exposes typed write methods for project create/update, component create/update, milestone create/update, issue time reporting, issue delete, and label assignment.
  3. Filter/query contract supports component, milestone, assignee, due date, label, and relation-aware filters without leaking raw transport errors for missing project-scoped entities.

### TASK-002: Extend tracker hooks for parity data and mutations

Wire the repository parity contract into TanStack Query so project metadata, relations, templates,
my-issues, and advanced filters all stay centralized.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-001`
- **writeScope:** `mobile/src/hooks/useProjects.ts`, `mobile/src/hooks/useIssues.ts`, `mobile/src/hooks/useIssue.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Hooks expose project detail, component, milestone, template, relation, and my-issues queries without forcing screens to call repositories directly.
  2. Project, component, milestone, and issue-field mutations invalidate the exact project and issue keys they affect.
  3. Disabled queries stay inert when `projectId` or `issueId` is absent, and advanced filter params participate in stable query keys.

### TASK-003: Expand tracker store for full draft and filter parity

Extend the tracker Zustand store so create/edit flows and advanced filters can carry the full parity
field set without ad hoc screen state.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **writeScope:** `mobile/src/store/tracker.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Draft state includes component, milestone, due date, estimation, parent issue, template selection, and attachment ids.
  2. Filter state includes component, milestone, assignee, due-date, and relation-aware options, and clearing the draft resets all parity fields.
  3. Persisted state does not leak stale project-specific selections across workspace changes.

### TASK-004: Add project create flow

Introduce a mobile project-create route and form so tracker parity includes project creation and the
defaults that issue creation depends on.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`
- **writeScope:** `mobile/src/app/(app)/tracker/index.tsx`, `mobile/src/app/(app)/tracker/project/new.tsx`, `mobile/src/components/features/ProjectForm.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Tracker index exposes a create-project entry point and the new route resolves with typed navigation.
  2. Project form supports name, identifier, privacy, default assignee, and default issue status.
  3. Submitting invalid or duplicate identifiers shows a recoverable validation state instead of closing the form.

### TASK-005: Add project edit flow

Add project-scoped edit routing so an existing project can be modified through a stable
`project/[id]/edit` route.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-004`
- **writeScope:** `mobile/src/app/(app)/tracker/project/[id].tsx`, `mobile/src/app/(app)/tracker/project/[id]/edit.tsx`, `mobile/src/components/features/ProjectForm.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Project detail exposes an edit entry point that routes to `project/[id]/edit`.
  2. Edit form loads the existing project defaults and saves only valid changes for the targeted project.
  3. If the project has been deleted or archived, the edit route shows a recoverable error state instead of a blank screen.

### TASK-006: Add component and milestone management surfaces

Bring project-scoped tracker metadata management to mobile with project-addressable routes.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-005`
- **writeScope:** `mobile/src/app/(app)/tracker/project/[id].tsx`, `mobile/src/app/(app)/tracker/project/[id]/components.tsx`, `mobile/src/app/(app)/tracker/project/[id]/milestones.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Users can navigate from a specific project into component and milestone management routes scoped to that project id.
  2. Lists render human-readable labels, lead/status metadata, and empty states for projects with no entries.
  3. Archived or deleted entities are excluded from selection lists after mutation invalidation.

### TASK-007: Add issue field editor components

Create the missing editor/picker surfaces required for issue-detail and issue-form parity so the
integration tasks do not overload existing files.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-006`
- **writeScope:** `mobile/src/components/features/ComponentPicker.tsx`, `mobile/src/components/features/MilestonePicker.tsx`, `mobile/src/components/features/IssueRelationPicker.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Component, milestone, and relation pickers render project-scoped choices from the parity hooks.
  2. Pickers support empty and not-found states without rendering raw ids.
  3. Selecting a value returns stable ids usable by issue detail and issue form without additional lookups in the screen layer.

### TASK-008: Bring issue detail to field parity

Upgrade issue detail from a mostly-read surface into the parity screen for component, milestone,
parent/sub-issue, relation, due date, estimation, time spent, and attachments.

- **Type:** feature
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-002`, `TASK-003`, `TASK-006`, `TASK-007`
- **writeScope:** `mobile/src/app/(app)/tracker/issue/[id].tsx`, `mobile/src/components/features/IssueDetail.tsx`, `mobile/src/components/features/IssueComments.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Issue detail renders editable component, milestone, due date, estimation, parent issue, relations, and sub-issue summaries using real lookup data.
  2. Time-report creation and refresh update reported-time UI without forcing a full app reload.
  3. Missing related docs or deleted parents show a safe fallback row instead of rendering raw refs or crashing the screen.

### TASK-009: Bring create/edit issue flow to parity

Upgrade issue creation into a shared create/edit form that supports the parity field set and proper
project defaults.

- **Type:** feature
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Priority:** P0
- **Depends on:** `TASK-002`, `TASK-003`, `TASK-006`, `TASK-007`
- **writeScope:** `mobile/src/app/(app)/tracker/create.tsx`, `mobile/src/app/(app)/tracker/edit/[id].tsx`, `mobile/src/components/features/IssueForm.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Shared form supports status, priority, assignee, component, milestone, due date, estimation, parent issue, description markup, and attachments.
  2. Edit mode preloads existing issue state and preserves parity fields when saving partial changes.
  3. Submission is blocked when required project defaults or parity metadata are still loading, instead of sending partial payloads.

### TASK-010: Add issue templates flow

Expose tracker issue templates on mobile so users can start from the same reusable tracker patterns
available on the web.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-009`
- **writeScope:** `mobile/src/app/(app)/tracker/templates.tsx`, `mobile/src/app/(app)/tracker/create.tsx`, `mobile/src/components/features/IssueTemplateCard.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Mobile tracker exposes a template list with project-scoped template summaries and empty/error states.
  2. Selecting a template hydrates the create form draft without discarding manually-entered overrides.
  3. Templates that reference missing metadata surface a blocking explanation instead of creating malformed issues.

### TASK-011: Add my-issues and advanced filter UI parity

Close the remaining day-to-day parity gap by adding a personal issue entry point and the richer filter
UI that consumes the expanded repository/store/hook contracts.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-003`, `TASK-006`, `TASK-008`
- **writeScope:** `mobile/src/app/(app)/tracker/my-issues.tsx`, `mobile/src/components/features/IssueFilters.tsx`, `mobile/src/app/(app)/tracker/search.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Mobile exposes a dedicated “My Issues” surface scoped to the authenticated user with the same repository/filter contract as project issues.
  2. Filter UI supports component, milestone, assignee, due date, and relation-aware combinations without raw-id rendering.
  3. Clearing or restoring saved filters resets both list and search results consistently.

### TASK-012: Add issue delete flow

Add a delete action to issue detail with confirmation dialog and proper cache invalidation.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`
- **writeScope:** `mobile/src/app/(app)/tracker/issue/[id].tsx`, `mobile/src/components/features/IssueDetail.tsx`, `mobile/src/repositories/tracker.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Issue detail header exposes a delete action (via menu or icon) that opens a confirmation dialog with the issue identifier.
  2. Successful deletion invalidates the project issue list, navigates back, and removes the issue from query cache.
  3. Attempting to delete an already-deleted issue shows a recoverable error instead of a crash.

### TASK-013: Add labels/tags support on issues

Bring label/tag assignment to issue detail and issue create/edit forms matching the web tracker label system.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-008`, `TASK-009`
- **writeScope:** `mobile/src/components/features/LabelPicker.tsx`, `mobile/src/components/features/IssueDetail.tsx`, `mobile/src/components/features/IssueForm.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Issue detail renders assigned labels as colored chips and allows adding/removing via a label picker.
  2. Issue create/edit form includes a label selector that shows project-scoped labels with color indicators.
  3. Labels with deleted or missing refs render a safe fallback instead of raw ids.

### TASK-014: Add comment edit/delete and activity timeline

Upgrade the comments section to support edit/delete on user comments and display system activity
messages (status changes, field updates) in a unified timeline.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-008`
- **writeScope:** `mobile/src/components/features/IssueComments.tsx`, `mobile/src/repositories/activity.ts`, `mobile/src/hooks/useComments.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. User comments show edit and delete actions (via long-press or swipe) for comments authored by the current user.
  2. Activity timeline renders system messages (DocUpdateMessage, ActivityInfoMessage) with human-readable field-change descriptions alongside user comments.
  3. Editing a comment preserves the original timestamp and shows an "edited" indicator; deleting shows a confirmation first.

### TASK-015: Add comment reactions and mentions

Add emoji reactions on comments and @mention rendering/insertion in the comment composer.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-014`
- **writeScope:** `mobile/src/components/features/IssueComments.tsx`, `mobile/src/components/features/CommentReactions.tsx`, `mobile/src/components/features/MentionPicker.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Comments display reaction pills (emoji + count) and long-press opens a reaction picker to add/remove reactions.
  2. Comment composer supports @mention insertion via a searchable member picker triggered by typing "@".
  3. Rendered mentions in existing comments are tappable and navigate to the referenced user/document.

### TASK-016: Add saved/custom filters

Allow users to save, name, and recall filter presets for issue lists.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-003`, `TASK-011`
- **writeScope:** `mobile/src/store/tracker.ts`, `mobile/src/components/features/IssueFilters.tsx`, `mobile/src/components/features/SavedFilterPicker.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Users can save the current filter combination as a named preset persisted to AsyncStorage.
  2. Saved filters appear in a picker accessible from the filter bar with options to apply, rename, or delete.
  3. Saved filters are scoped per-workspace and cleared on workspace switch to prevent stale cross-workspace state.

### TASK-017: Kanban multi-grouping and drag-drop

Extend kanban view to support grouping by assignee, priority, component, and milestone, and add
drag-drop card movement between columns.

- **Type:** feature
- **Effort:** L
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-002`, `TASK-006`
- **writeScope:** `mobile/src/app/(app)/tracker/project/[id].tsx`, `mobile/src/components/features/KanbanBoard.tsx`, `mobile/src/store/tracker.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Kanban view offers a grouping picker (status, assignee, priority, component, milestone) persisted in tracker store.
  2. Drag-drop between columns updates the grouped field (e.g., dragging to a different status column changes the issue status) with optimistic UI.
  3. Columns with no issues show an empty placeholder; grouping by fields with many values (assignee) limits visible columns with a "show more" action.

### TASK-018: Bulk issue operations

Add multi-select mode to the issue list with bulk status, priority, and assignee changes.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-002`, `TASK-008`
- **writeScope:** `mobile/src/app/(app)/tracker/project/[id].tsx`, `mobile/src/components/features/BulkIssueBar.tsx`, `mobile/src/repositories/tracker.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Long-press on an issue row enters selection mode with checkboxes; a bottom action bar shows selected count and available actions.
  2. Bulk actions support changing status, priority, and assignee for all selected issues in a single batch (Promise.all in chunks of 50).
  3. Exiting selection mode clears all selections and restores normal list interaction without stale visual state.

### TASK-019: Add project delete flow

Close the project CRUD gap by adding project deletion with confirmation and list/detail invalidation.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-001`, `TASK-002`, `TASK-005`
- **writeScope:** `mobile/src/app/(app)/tracker/project/[id].tsx`, `mobile/src/components/features/ProjectDangerZone.tsx`, `mobile/src/repositories/tracker.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Project detail exposes a delete action gated behind an explicit confirmation that names the targeted project.
  2. Successful deletion invalidates tracker index and project-detail queries, then returns the user to the project list without stale project rows.
  3. Attempting to delete an archived, missing, or already-removed project shows a recoverable error state instead of leaving the user on a broken route.

### TASK-020: Add sub-issue tree and create flow

Close the remaining sub-issue parity gap by rendering a real sub-issue tree and letting users create
sub-issues from a parent issue context.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-002`, `TASK-007`, `TASK-008`, `TASK-009`
- **writeScope:** `mobile/src/app/(app)/tracker/issue/[id].tsx`, `mobile/src/components/features/SubIssueTree.tsx`, `mobile/src/components/features/IssueForm.tsx`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Issue detail renders a nested sub-issue tree with status, identifier, and title instead of only a count summary.
  2. Creating a sub-issue from a parent issue pre-fills the parent relation and returns to the parent detail with the new child visible after save.
  3. Missing or deleted child issues render a safe fallback row and do not break parent issue rendering.

### TASK-021: Add attachment delete parity

Finish the tracker attachment workflow by allowing users to remove issue attachments and see the
detail view update immediately.

- **Type:** feature
- **Effort:** S
- **Agent:** expo-react-native-engineer
- **Priority:** P1
- **Depends on:** `TASK-008`
- **writeScope:** `mobile/src/app/(app)/tracker/issue/[id].tsx`, `mobile/src/components/features/IssueDetail.tsx`, `mobile/src/repositories/attachment.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Issue detail renders a delete/remove action for attachments the current user is allowed to remove.
  2. Successful attachment removal updates the visible attachment list without requiring a full issue reload.
  3. Failed or unauthorized deletes leave the attachment visible and show a recoverable error instead of silently desynchronizing the UI.

### TASK-022: Add rich comment composer parity

Close the remaining comment-composer gap by upgrading tracker comments from plain text to the same
rich composition baseline used for issue descriptions.

- **Type:** feature
- **Effort:** M
- **Agent:** expo-react-native-engineer
- **Priority:** P2
- **Depends on:** `TASK-014`
- **writeScope:** `mobile/src/components/features/IssueComments.tsx`, `mobile/src/components/features/RichCommentComposer.tsx`, `mobile/src/hooks/useComments.ts`
- **validateCommand:** `cd /Users/ciprian/work_cip/huly-platform/mobile && npx tsc --noEmit`
- **Acceptance Criteria:**
  1. Comment creation and editing use a richtext composer with formatting controls instead of a plain text field.
  2. Existing markdown/rich comment content renders consistently after edit round-trips without dropping formatting.
  3. When richtext capabilities are unavailable, the composer shows an explicit degraded state instead of silently falling back to malformed plain text submission.

## Failure Modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| Project defaults missing during create/edit | Form has no valid status or default assignee context | Block submit and show explicit metadata-loading state |
| Deleted milestone/component referenced by an issue | Detail screen receives missing related doc | Render safe fallback row and offer reassignment |
| Template references stale project metadata | Template apply cannot resolve fields | Stop hydration and show template repair message |
| Time-report mutation succeeds but detail stays stale | Reported time does not update after save | Invalidate issue detail and project issue list query keys together |
| Draft leaks across workspace switch | Issue form opens with wrong project metadata | Clear persisted tracker draft when workspace identity changes |
| Bulk mutation partial failure | Some issues in a batch fail to update | Show per-issue error count and offer retry for failed items |
| Project delete leaves stale project routes | Deleted project is still reachable from back stack | Invalidate tracker list/detail keys and redirect to project index after successful delete |
| Attachment delete desynchronizes issue detail | Removed file still appears until manual refresh | Optimistically remove only after id match and invalidate issue detail on settle |
| Comment delete removes wrong comment | Race between optimistic remove and server response | Confirm by id match before cache eviction |
| Drag-drop field mismatch | Card dropped on wrong column updates wrong field | Validate target column field before mutation |

## Ship Cut

If execution stops halfway, the minimum coherent cut is after `TASK-021`.

That cut yields:
- full project CRUD
- component and milestone management
- full issue create/edit/detail parity for core fields
- issue delete
- sub-issue tree + create flow
- attachment delete
- comment edit/delete with activity timeline

Items below that cut and safe to defer:
- issue templates
- my-issues entry point
- labels/tags
- comment reactions/mentions
- saved filters
- kanban enhancements
- bulk operations
- comment richtext composer parity
- advanced filter UI beyond the current list/search core

## Test Coverage Map

- `TASK-001`: repository contract + typed failure handling + advanced filter query contract
- `TASK-002`: query invalidation and disabled-query behavior
- `TASK-003`: persisted draft/reset/filter behavior across workspace changes
- `TASK-004`: project-create form success + duplicate identifier failure path
- `TASK-005`: project-edit route success + archived-project fallback
- `TASK-006`: component/milestone CRUD success + archived-entity exclusion
- `TASK-007`: picker success + missing-related-doc fallback
- `TASK-008`: issue detail edit flow + time-report refresh + missing-related-doc fallback
- `TASK-009`: create/edit form submission gating + preloaded edit state
- `TASK-010`: template hydration + stale-template failure path
- `TASK-011`: my-issues scoping + filter clear/restore consistency
- `TASK-012`: delete confirmation + already-deleted fallback + cache invalidation
- `TASK-013`: label picker rendering + label assignment + missing label fallback
- `TASK-014`: comment edit/delete auth check + activity timeline rendering + edited indicator
- `TASK-015`: reaction add/remove + mention insertion + mention tap navigation
- `TASK-016`: saved filter persistence + cross-workspace clear + rename/delete preset
- `TASK-017`: kanban grouping switch + drag-drop mutation + empty column + overflow
- `TASK-018`: bulk selection enter/exit + batch mutation chunking + partial failure handling
- `TASK-019`: project delete confirmation + list/detail invalidation + already-removed fallback
- `TASK-020`: sub-issue tree rendering + create-from-parent flow + deleted-child fallback
- `TASK-021`: attachment delete authorization + list refresh consistency + failed-delete recovery
- `TASK-022`: rich comment compose/edit round-trip + degraded-state fallback

## Execution Summary

- Tasks: 22
- Parallelizable foundations:
  - `TASK-001`
  - `TASK-003`
- Main critical path:
  - `TASK-001 -> TASK-002 -> TASK-006 -> TASK-007 -> TASK-008 -> TASK-009`
- Secondary path:
  - `TASK-001 -> TASK-002 -> TASK-004 -> TASK-005 -> TASK-006`
- Delete path (short):
  - `TASK-001 -> TASK-002 -> TASK-012`
- Project CRUD path:
  - `TASK-001 -> TASK-002 -> TASK-004 -> TASK-005 -> TASK-019`
- Comments/activity path:
  - `TASK-008 -> TASK-014 -> TASK-015 -> TASK-022`
- Labels path:
  - `TASK-008 + TASK-009 -> TASK-013`
- Kanban/bulk path:
  - `TASK-002 -> TASK-017`
  - `TASK-002 + TASK-008 -> TASK-018`
- Sub-issue/attachment path:
  - `TASK-008 + TASK-009 -> TASK-020`
  - `TASK-008 -> TASK-021`
- Optional parity path:
  - `TASK-009 -> TASK-010`
  - `TASK-008 -> TASK-011 -> TASK-016`

## Task Dependencies

```text
TASK-001 -> TASK-002
TASK-001 -> TASK-004
TASK-001 -> TASK-005
TASK-001 -> TASK-006
TASK-001 -> TASK-007
TASK-001 -> TASK-010
TASK-001 -> TASK-011
TASK-001 -> TASK-012
TASK-001 -> TASK-019

TASK-002 -> TASK-004
TASK-002 -> TASK-005
TASK-002 -> TASK-006
TASK-002 -> TASK-007
TASK-002 -> TASK-008
TASK-002 -> TASK-009
TASK-002 -> TASK-010
TASK-002 -> TASK-011
TASK-002 -> TASK-012
TASK-002 -> TASK-017
TASK-002 -> TASK-018
TASK-002 -> TASK-019
TASK-002 -> TASK-020

TASK-003 -> TASK-008
TASK-003 -> TASK-009
TASK-003 -> TASK-011
TASK-003 -> TASK-016

TASK-004 -> TASK-005
TASK-005 -> TASK-019
TASK-005 -> TASK-006
TASK-006 -> TASK-007
TASK-006 -> TASK-008
TASK-006 -> TASK-009
TASK-006 -> TASK-011
TASK-006 -> TASK-017
TASK-007 -> TASK-008
TASK-007 -> TASK-009
TASK-008 -> TASK-011
TASK-008 -> TASK-013
TASK-008 -> TASK-014
TASK-008 -> TASK-018
TASK-008 -> TASK-020
TASK-008 -> TASK-021
TASK-009 -> TASK-010
TASK-009 -> TASK-013
TASK-009 -> TASK-020
TASK-011 -> TASK-016
TASK-014 -> TASK-015
TASK-014 -> TASK-022
```
