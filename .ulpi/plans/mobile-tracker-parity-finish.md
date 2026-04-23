# Finish Mobile Tracker Parity — Component/Milestone CRUD + Attachment Delete

- **Plan name**: `mobile-tracker-parity-finish`
- **Mode**: `EXPANSION`
- **Default review**: `claude`
- **Default agent**: `expo-react-native-engineer`

## Overview

Close the two tracker-parity items that slipped past the original ship cut — **component/milestone management surfaces** (expanded to full CRUD per user direction) and **attachment delete** — both originally promised in the `mobile-tracker-parity` plan's `delivers` list. All work targets visible parity with `plugins/tracker-resources/src/components/{components,milestones}/` on the web side, **including matching the web's hard-delete semantics for components and milestones**.

## Scope Challenge

- **Assumed mode**: `EXPANSION`
- **Assumed default review**: `claude`
- **Scope cuts**:
  - Focus on tracker project-scoped components/milestones management screens and tracker issue attachment delete
  - Exclude chat attachment delete (separate chat-parity scope), labels/templates/my-issues/kanban/bulk-ops (still safe-to-defer per original plan)
  - Exclude server-side schema changes — all mutations use existing `TxCreate/Update/RemoveDoc` through `HulyClient.tx()`

## Prerequisites

- Tracker read APIs already exist: `getComponents`, `getMilestones` in `mobile/src/repositories/tracker.ts`.
- Read hooks already exist: `useComponents`, `useMilestones` in `mobile/src/hooks/useProjects.ts` (cache key shape: `['tracker','components',spaceId]` and `['tracker','milestones',spaceId]`).
- **Canonical CRUD pattern to mirror**: Project CRUD in `mobile/src/repositories/tracker.ts` (`createProject`, `updateProject`, `deleteProject`) — uses `TxFactory` + `factory.createTx{Create,Update,Remove}Doc` + `client.tx()`.
- **Canonical mutation hook pattern to mirror**: `useUpdateProject` in `mobile/src/hooks/useProjects.ts` — uses raw `useMutation` from `@tanstack/react-query` with explicit `queryClient.invalidateQueries`. **Do NOT use the generic `useHulyMutation` family** (`useHulyCreate/Update/Remove`) because those invalidate the `['huly', _class, ...]` keyspace, not the tracker-specific keys the read hooks register.
- `AttachmentThumbnail` at `mobile/src/components/features/AttachmentThumbnail.tsx` exposes `onPress` only — `onDelete` needs to be added.
- **`AttachmentMeta`** in `mobile/src/repositories/attachment.ts` currently exposes only `{blobId, name, size, contentType, lastModified}` — `getAttachments` mapper drops `_id`/`space`/`attachedTo`. **TASK-009 must extend the interface AND mapper** to expose the fields `TxRemoveDoc` requires.
- `IssueDetailView` at `mobile/src/components/features/IssueDetail.tsx` renders the attachment list via map over `attachments[]` and existing `onAttachmentPress` prop.
- **Toast API**: `useToastStore.getState().push({...})` — or the helpers `showErrorToast(err)` / `showInfoToast` / `showSuccessToast` exported from `mobile/src/store/toast.ts`. **There is no `useToastStore.show()`.**
- **Mobile-side enum mirror precedent**: `ISSUE_PRIORITY` in `mobile/src/components/ui/PriorityIcon.tsx` — the project's RN-Safety Matrix forbids value-importing from `@hcengineering/tracker` because it pulls `@hcengineering/ui` → `svelte`. ALL existing mobile code uses `import type` for tracker. TASK-002 introduces an analogous `MILESTONE_STATUS` mirror.
- Web parity targets: `plugins/tracker-resources/src/components/components/{ComponentBrowser,EditComponent,NewComponent,DeleteComponentPresenter}.svelte` and `plugins/tracker-resources/src/components/milestones/{MilestoneBrowser,EditMilestone,MoveAndDeleteMilestonePopup}.svelte` — note web does **HARD DELETE** via `client.remove(value)`, not archive (`DeleteComponentPresenter.svelte` hard-deletes on confirm).
- Schema: `plugins/tracker/src/index.ts` — `Component` and `Milestone` interfaces extend `Doc` (NOT `Space`). They have **NO** `archived`/`isArchived` field. The canonical name field in the schema is `label`. Existing mobile readers diverge: `getMilestones` coerces `r.name ?? r.label` and returns `name`; **`getComponents` only reads `r.name` and sorts by `name`** — TASK-001 must fix this divergence.
- **Expo Router co-existence**: `mobile/src/app/(app)/tracker/project/[id].tsx` (file) and `mobile/src/app/(app)/tracker/project/[id]/` (directory) co-exist; Expo Router v6 surfaces both at runtime. Precedent: `mobile/src/app/(app)/tracker/project/edit/[id].tsx` already uses this pattern.

## Non-Goals

- Adding Component/Milestone schema fields (e.g. `archived` flag) — **preserved by adopting hard-delete semantics matching the web**
- Chat attachment delete (separate chat-parity scope)
- Server-side capability changes
- Re-opening labels/templates/my-issues/kanban/bulk-ops which remain explicitly safe-to-defer per the original plan
- Standardizing the mobile name↔label naming inconsistency repo-wide — out of scope; new screens conform to the existing convention (form field 'Name' maps to tx field `label`, read mappers continue returning `name`)

## Contracts

- All component/milestone reads continue using `useComponents`/`useMilestones`; mutations use new `use{Create,Update,Delete}{Component,Milestone}` hooks added to `mobile/src/hooks/useProjects.ts`.
- Mutation hooks are built with **raw `useMutation`** from `@tanstack/react-query` (NOT `useHulyMutation`) and call `queryClient.invalidateQueries({queryKey: ['tracker','components',spaceId]})` / `['tracker','milestones',spaceId]` in `onSuccess`.
- Repository mutations build Tx objects via the existing `TxFactory` + `factory.createTx{Create,Update,Remove}Doc` pattern and submit through `HulyClient.tx()` — no new client-wrapper surface introduced.
- **Delete uses `TxRemoveDoc` (hard delete) on the Component or Milestone doc — matching web parity.** NO `isArchived`/`archived` field is read or written; the schema does not have one.
- **`MilestoneStatus` is consumed in mobile via a mobile-side `MILESTONE_STATUS` const map** from `mobile/src/lib/milestoneStatus.ts` — NOT by value-importing the enum from `@hcengineering/tracker`. The TS type can still be `import type { MilestoneStatus }` for field typing.
- **`createComponent` / `createMilestone` include the schema's optional collection counters explicitly**: `{ comments: 0, attachments: 0 }` — matching web's `NewComponent.svelte` init shape and avoiding any server-side default ambiguity.
- Project-scoped management screens live under `mobile/src/app/(app)/tracker/project/[id]/` — Expo Router auto-discovers them at runtime; both `[id].tsx` (existing issue list) and `[id]/*` (new nested routes) co-exist (precedent: `tracker/project/edit/[id].tsx`).
- **`AttachmentMeta` is extended** to include the doc identity needed for delete: `{ _id: Ref<Doc>, space: Ref<Space>, attachedTo: Ref<Doc> }` in addition to the existing display fields. **`getAttachments` mapper captures `record._id` into `_id` BEFORE the `blobId` fallback chain consumes it** — `_id` and `blobId` are independent fields.
- `deleteAttachment` uses `TxRemoveDoc` on the `Attachment` doc; the parent issue's `attachments[]` count field is decremented by the server collection mechanic (no client-side count edit).
- `AttachmentThumbnail.onDelete` is optional — when undefined no affordance renders, preserving existing read-only callsites.
- Failed mutations surface via `showErrorToast(error)` from `@/store/toast`; UI does not silently desync (failed delete leaves the item visible).
- **Form field 'Name' maps to tx field `label`** in component/milestone create/edit screens (matches schema while preserving the existing mobile picker convention that reads `item.name`); **readers in TASK-001 are patched to coerce `r.label ?? r.name`** for forward compatibility.

## Existing Code Leverage

- `mobile/src/repositories/tracker.ts` (Project CRUD pattern, `getComponents`/`getMilestones` — to extend)
- `mobile/src/repositories/attachment.ts` (`AttachmentMeta` + `getAttachments` mapper — to extend)
- `mobile/src/hooks/useProjects.ts` (`useComponents`/`useMilestones` reads + `useUpdateProject` mutation pattern)
- `mobile/src/hooks/useAttachments.ts` (existing query hooks; new `useDeleteAttachment` lives here)
- `mobile/src/hooks/index.ts` (export barrel)
- `mobile/src/components/features/IssueDetail.tsx` (attachment rendering site)
- `mobile/src/components/features/AttachmentThumbnail.tsx` (thumbnail to extend with `onDelete`)
- `mobile/src/components/features/ProjectForm.tsx` (form pattern reference for new component/milestone forms)
- `mobile/src/components/ui/PriorityIcon.tsx` (mobile-side enum mirror precedent for the new `MILESTONE_STATUS` const)
- `mobile/src/app/(app)/tracker/project/[id].tsx` (issue list screen — receives the new metadata strip above `IssueFilterControls`)
- `mobile/src/app/(app)/tracker/issue/[id].tsx` (issue screen — wires attachment delete handler)
- `mobile/src/store/toast.ts` (`showErrorToast` helper)

---

## Tasks

### TASK-001 — Add component create/update/delete helpers + patch getComponents mapper

- **Type**: feature · **Priority**: P0 · **Effort**: S · **Agent**: expo-react-native-engineer
- **Depends on**: —
- **Description**: Add `createComponent`, `updateComponent`, and `deleteComponent` functions to `repositories/tracker.ts` mirroring the existing Project CRUD pattern. **Also patch the existing `getComponents` mapper** to coerce `r.label ?? r.name` and switch the sort key from `name` to `label`, so new components written with the schema-correct `label` field are read back with a non-empty name. Hard delete via `TxRemoveDoc` matches web parity — no `isArchived` flag is set or read.
- **Acceptance criteria**:
  1. Exports `createComponent({label, description?, lead?, space})`, `updateComponent(id, patch)`, and `deleteComponent(id, space)` that build TxCreate/Update/RemoveDoc via the existing `TxFactory` + factory pattern (mirror `createProject` in the same file) and submit through `client.tx()`. **`createComponent`'s tx data includes `comments: 0, attachments: 0`** to match the web's `NewComponent.svelte` init shape.
  2. Each function throws `RepositoryError('HulyClient not connected', DOMAIN, fnName)` when `getClient()` is null and wraps any other error via `wrapRepositoryError(DOMAIN, fnName, error)`. `deleteComponent` calls `factory.createTxRemoveDoc(TRACKER_CLASS.Component, space, id)` — **NO `isArchived` field is touched**; calling `deleteComponent` on a removed `_id` surfaces the wrapped server error (no silent success).
  3. **`getComponents` mapper is patched** to read `String(r.label ?? r.name ?? '')` for the returned `name` field (matching `getMilestones`' existing coercion), and the `findAll` sort option is switched from `{ name: SortingOrder.Ascending }` to `{ label: SortingOrder.Ascending }` so a list created via `createComponent` (which writes `label`) returns sorted, non-blank names.
- **Write scope**: `mobile/src/repositories/tracker.ts`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-002 — Add milestone CRUD helpers + mobile-side MilestoneStatus mirror

- **Type**: feature · **Priority**: P0 · **Effort**: S · **Agent**: expo-react-native-engineer
- **Depends on**: TASK-001
- **Description**: Add `createMilestone`, `updateMilestone`, and `deleteMilestone` to `repositories/tracker.ts` (depends on TASK-001 because both edit the same file). **Create `mobile/src/lib/milestoneStatus.ts`** with a `MILESTONE_STATUS` const map mirroring the web enum values — value-importing the real enum from `@hcengineering/tracker` would pull svelte through the dependency chain and break Metro (project rule).
- **Acceptance criteria**:
  1. Creates `mobile/src/lib/milestoneStatus.ts` exporting `export const MILESTONE_STATUS = { Planned: 0, InProgress: 1, Completed: 2, Canceled: 3 } as const` and `export type MilestoneStatusValue = (typeof MILESTONE_STATUS)[keyof typeof MILESTONE_STATUS]`. The TS field type can still be `import type { MilestoneStatus } from '@hcengineering/tracker'`; values come from the local mirror.
  2. Exports `createMilestone({label, description?, status, space, targetDate})`, `updateMilestone(id, patch)`, `deleteMilestone(id, space)` mirroring the component pattern. `status` uses `MilestoneStatusValue` from the mobile mirror and defaults to `MILESTONE_STATUS.Planned` when omitted on create. **`createMilestone`'s tx data includes `comments: 0, attachments: 0`** to match the web's create init shape.
  3. Each function throws `RepositoryError` when `getClient()` is null and wraps unknown errors via `wrapRepositoryError`; `deleteMilestone` calls `factory.createTxRemoveDoc(TRACKER_CLASS.Milestone, space, id)` — **NO `isArchived` field is touched**; calling `updateMilestone` on a missing `_id` surfaces the wrapped server error (no silent success).
- **Write scope**: `mobile/src/repositories/tracker.ts`, `mobile/src/lib/milestoneStatus.ts`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-003 — Add component/milestone mutation hooks (raw useMutation)

- **Type**: feature · **Priority**: P0 · **Effort**: S · **Agent**: expo-react-native-engineer
- **Depends on**: TASK-002
- **Description**: Add `useCreate/Update/DeleteComponent` and the matching milestone hooks to `useProjects.ts` using raw `useMutation` from `@tanstack/react-query` plus explicit `queryClient.invalidateQueries` — mirroring `useUpdateProject`. Re-export from `hooks/index.ts`.
- **Acceptance criteria**:
  1. Exports `useCreateComponent`, `useUpdateComponent`, `useDeleteComponent`, `useCreateMilestone`, `useUpdateMilestone`, `useDeleteMilestone` built with raw `useMutation` (mirroring `useUpdateProject`) and re-exported from `mobile/src/hooks/index.ts`.
  2. Each mutation invalidates the matching cache key on success via `queryClient.invalidateQueries`: components hooks invalidate `['tracker','components',spaceId]`; milestone hooks invalidate `['tracker','milestones',spaceId]` — matching the keys the existing `useComponents`/`useMilestones` read hooks register.
  3. Mutation errors are returned through the `useMutation` tuple (not thrown uncaught) and the global toast renders the wrapped error message via `showErrorToast(error)` from `@/store/toast`.
- **Write scope**: `mobile/src/hooks/useProjects.ts`, `mobile/src/hooks/index.ts`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-004 — Add project-scoped component list screen

- **Type**: feature · **Priority**: P1 · **Effort**: M · **Agent**: expo-react-native-engineer
- **Depends on**: TASK-003
- **Description**: Create the `components.tsx` route under `tracker/project/[id]/`. Lists components reading `item.name` from the (now label-coercing) `ComponentItem` mapper, with lead avatar, empty state, and Edit/Delete row actions.
- **Acceptance criteria**:
  1. Renders components for the route's `projectId` via `useComponents(projectId)`, reading `item.name` (the existing `ComponentItem` shape — **TASK-001 patches the mapper so newly-created components surface their `label` here**). Includes lead avatar via existing `AvatarCircle` and a clear empty state when zero results.
  2. Each row shows Edit (navigates to `components/[componentId]`) and Delete (calls `useDeleteComponent` after a confirmation Alert: 'Delete component? This cannot be undone.'); deleted rows disappear after successful cache invalidation without a screen reload.
  3. Query loading shows a centered spinner; query error shows a Retry button that calls `refetch` — failed delete surfaces `showErrorToast(err)` and leaves the row visible (no UI desync).
- **Write scope**: `mobile/src/app/(app)/tracker/project/[id]/components.tsx`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-005 — Add component create + edit screens

- **Type**: feature · **Priority**: P1 · **Effort**: M · **Agent**: expo-react-native-engineer
- **Depends on**: TASK-004
- **Description**: Create `new.tsx` and `[componentId].tsx` under `tracker/project/[id]/components/`. Both render the same form (Name required, description, lead picker) and submit via the appropriate mutation hook. Form's 'Name' field maps to tx field `label`.
- **Acceptance criteria**:
  1. Both screens render a form with Name (required, max 80 chars; bound to tx field `label` on submit), description (multiline, optional), and lead picker reusing the existing assignee/member picker pattern from issue create.
  2. Submit calls `useCreateComponent({label: form.name, ...})` or `useUpdateComponent` then `router.back()`; the parent component list reflects the change via cache invalidation without a full screen reload.
  3. Empty/whitespace-only Name disables submit and shows an inline 'Name required' error; submit failure (server error) keeps the form state intact and renders `showErrorToast(err)`.
- **Write scope**:
  - `mobile/src/app/(app)/tracker/project/[id]/components/new.tsx`
  - `mobile/src/app/(app)/tracker/project/[id]/components/[componentId].tsx`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-006 — Add project-scoped milestone list screen

- **Type**: feature · **Priority**: P1 · **Effort**: M · **Agent**: expo-react-native-engineer
- **Depends on**: TASK-003
- **Description**: Create `milestones.tsx` route under `tracker/project/[id]/`. Lists milestones (reads `item.name` from existing `MilestoneItem` mapper which already coerces label) with status badge, target date, empty state, and Edit/Delete row actions.
- **Acceptance criteria**:
  1. Renders milestones for the route's `projectId` via `useMilestones(projectId)` reading `item.name`. **Status badge color-maps via the `MILESTONE_STATUS` const map from `mobile/src/lib/milestoneStatus.ts`** (no value-import from `@hcengineering/tracker`). `targetDate` is formatted via existing format helpers; empty state when zero results.
  2. Each row shows Edit and Delete (with confirmation Alert noting that issues referencing this milestone will lose their reference, mirroring web's `MoveAndDeleteMilestonePopup` intent in a simpler form); deleted rows disappear after invalidation; deleting the currently-displayed milestone navigates back to the list cleanly.
  3. Loading shows centered spinner; error shows Retry; failed delete surfaces `showErrorToast(err)` and leaves the row visible.
- **Write scope**: `mobile/src/app/(app)/tracker/project/[id]/milestones.tsx`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-007 — Add milestone create + edit screens

- **Type**: feature · **Priority**: P1 · **Effort**: M · **Agent**: expo-react-native-engineer
- **Depends on**: TASK-006
- **Description**: Create `new.tsx` and `[milestoneId].tsx` under `tracker/project/[id]/milestones/`. Both render Name/description/status/targetDate form. Status picker uses the mobile-side `MILESTONE_STATUS` const map. Form's 'Name' field maps to tx field `label`.
- **Acceptance criteria**:
  1. Both screens render Name (required, max 80 chars; bound to tx field `label`), description (multiline), **status picker (options sourced from `MILESTONE_STATUS` in `mobile/src/lib/milestoneStatus.ts` — no string literals, no value-import from `@hcengineering/tracker`)**, and `targetDate` picker (DateTimePicker) seeded from the existing milestone on edit.
  2. Submit calls `useCreateMilestone({label: form.name, status, targetDate, ...})` or `useUpdateMilestone` then `router.back()`; list reflects the change via invalidation.
  3. Past `targetDate` combined with `status === MILESTONE_STATUS.InProgress` or `MILESTONE_STATUS.Planned` shows a non-blocking inline warning matching the web's permissive validation; empty Name disables submit; submit failure renders `showErrorToast(err)` and preserves form state.
- **Write scope**:
  - `mobile/src/app/(app)/tracker/project/[id]/milestones/new.tsx`
  - `mobile/src/app/(app)/tracker/project/[id]/milestones/[milestoneId].tsx`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-008 — Add Components/Milestones metadata strip on the project issue list screen

- **Type**: feature · **Priority**: P1 · **Effort**: S · **Agent**: expo-react-native-engineer
- **Depends on**: TASK-004, TASK-006
- **Description**: Add a metadata navigation strip above `IssueFilterControls` in `mobile/src/app/(app)/tracker/project/[id].tsx` (the existing `IssueListScreen`) showing Components and Milestones counts; tapping each navigates to the matching management route. This is the right surface because users already enter `[id].tsx` to view the project; the edit screen is a form, not a discovery surface.
- **Acceptance criteria**:
  1. `mobile/src/app/(app)/tracker/project/[id].tsx` renders a horizontal metadata strip immediately above `IssueFilterControls` containing two tappable chips: 'Components (n)' and 'Milestones (n)' with counts derived from `useComponents(projectId)` and `useMilestones(projectId)`.
  2. Tapping each calls `router.push` to `'/(app)/tracker/project/[id]/components'` or `'/(app)/tracker/project/[id]/milestones'` with the active projectId interpolated.
  3. Counts re-render after a component or milestone is created/deleted in the same project — verified by triggering a mutation and observing the count update without screen navigation. While counts load, chips render with a single-line placeholder ('Components …') instead of '(NaN)'.
- **Write scope**: `mobile/src/app/(app)/tracker/project/[id].tsx`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-009 — Extend AttachmentMeta + add deleteAttachment to attachment repo + mutation hook

- **Type**: feature · **Priority**: P0 · **Effort**: S · **Agent**: expo-react-native-engineer
- **Depends on**: —
- **Description**: Extend `AttachmentMeta` to expose the doc identity fields (`_id`, `space`, `attachedTo`) needed by `TxRemoveDoc`, **update `getAttachments` mapper to capture `_id` BEFORE the existing `blobId` fallback chain consumes it**, add `deleteAttachment` function, and add `useDeleteAttachment` hook. The hook takes `attachedTo` from the mutation variables (mirroring `useUpdateProject`'s shape), not as a hook argument.
- **Acceptance criteria**:
  1. `AttachmentMeta` in `mobile/src/repositories/attachment.ts` is extended with `_id: Ref<Doc>`, `space: Ref<Space>`, and `attachedTo: Ref<Doc>` fields. **The `getAttachments` mapper captures `record._id` into the new `_id` field BEFORE the existing `blobId` fallback chain (`record.file ?? record.uuid ?? record._id`) reads it** — `_id` and `blobId` are independent fields, and downstream `TxRemoveDoc` always uses doc identity (`_id`), never the `blobId` value. `record.space` and `record.attachedTo` are likewise preserved unconditionally; existing display fields (`blobId`, `name`, `size`, `contentType`, `lastModified`) remain unchanged.
  2. Exports `deleteAttachment({_id, space, attachedTo})` building `TxRemoveDoc` for `ATTACHMENT_CLASS` via the existing `TxFactory` pattern and submitting via `client.tx`; throws `RepositoryError('HulyClient not connected', 'attachment', 'deleteAttachment')` when client is null.
  3. Exports `useDeleteAttachment()` hook (raw `useMutation`, mirroring `useUpdateProject`'s variables-on-mutate shape) whose mutate variables are `{_id, space, attachedTo}`. `onSuccess` invalidates queryKey `['attachments', variables.attachedTo]`; errors surface via `showErrorToast(err)`; calling delete on an `_id` that no longer exists returns the wrapped server error (no silent success).
- **Write scope**: `mobile/src/repositories/attachment.ts`, `mobile/src/hooks/useAttachments.ts`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-010 — Add onDelete affordance to AttachmentThumbnail

- **Type**: feature · **Priority**: P1 · **Effort**: S · **Agent**: expo-react-native-engineer
- **Depends on**: —
- **Description**: Add an optional `onDelete` prop to `AttachmentThumbnail` that renders a small X overlay with a 44pt touch target. Parent owns confirmation; thumbnail just emits the event.
- **Acceptance criteria**:
  1. Adds optional `onDelete?: (blobId: string) => void` prop. When provided, renders an X overlay with min 44x44pt hit slop in the top-right corner of the thumbnail.
  2. When `onDelete` is undefined, no overlay renders — the existing `IssueDetail` callsite (the only consumer in the repo today) keeps the prior layout pixel-for-pixel.
  3. Tapping the X fires `onDelete(blobId)` — the thumbnail does NOT show its own confirmation (parent owns the Alert); accessibilityLabel uses a template literal `` `Delete attachment ${filename}` `` (interpolated, not the raw curly-brace string).
- **Write scope**: `mobile/src/components/features/AttachmentThumbnail.tsx`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

### TASK-011 — Wire attachment delete in IssueDetail and issue screen

- **Type**: feature · **Priority**: P1 · **Effort**: S · **Agent**: expo-react-native-engineer
- **Depends on**: TASK-009, TASK-010
- **Description**: Thread an `onAttachmentDelete` prop through `IssueDetailView` and wire the issue screen to call `useDeleteAttachment` after a confirmation Alert, with toast-on-error and no UI desync. Consumes the extended `AttachmentMeta` from TASK-009.
- **Acceptance criteria**:
  1. `IssueDetailView` accepts a new optional `onAttachmentDelete?: (att: AttachmentInfo) => void` prop and passes through `onDelete` to each rendered `AttachmentThumbnail` when defined. **The local `AttachmentInfo` type is widened to include `_id`, `space`, and `attachedTo` from the extended `AttachmentMeta` (TASK-009).**
  2. Issue screen at `tracker/issue/[id].tsx` wires `onAttachmentDelete` to a confirmation Alert ('Delete attachment? This cannot be undone.') that, on confirm, calls `useDeleteAttachment().mutate({_id: att._id, space: att.space, attachedTo: att.attachedTo})`; on success the attachment disappears via cache invalidation without a full screen reload.
  3. Failed delete (mocked tx rejection) keeps the attachment visible AND surfaces `showErrorToast(err)` — UI does not silently desync; user can retry the delete immediately. **If `att._id` is null/undefined (defensive guard for stale-cached `AttachmentMeta` predating TASK-009), the screen does not call `mutate` and surfaces a 'Cannot delete this attachment' toast instead.**
- **Write scope**:
  - `mobile/src/components/features/IssueDetail.tsx`
  - `mobile/src/app/(app)/tracker/issue/[id].tsx`
- **Validate**: `cd mobile && npx tsc --noEmit`
- **Review**: claude

---

## Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| Component/milestone delete returns server error | `client.tx` promise rejects (e.g. permission denied, not found) | Wrapped error surfaces via `showErrorToast(err)`; row remains visible; user can retry |
| Milestone deleted while issues still reference it | Server allows delete; affected issues now have a dangling milestone ref | Confirmation Alert warns the user before delete; web's `MoveAndDeleteMilestonePopup` remains the richer flow — mobile falls back to plain delete with explicit warning copy |
| Stale `AttachmentMeta` cached pre-TASK-009 lacks `_id`/`space`/`attachedTo` at runtime | `att._id` is null/undefined at the delete callsite | TASK-011 callsite defensively skips mutate and surfaces a toast; the next refetch repopulates the cache with the new shape |
| `_id` collides with `blobId` fallback in mapper | Without explicit capture order, `deleteAttachment` could `TxRemoveDoc` against a blob URI | TASK-009 mapper captures `record._id` BEFORE the `blobId` fallback chain reads it; `TxRemoveDoc` always uses doc `_id` |
| Past targetDate set on active-status milestone | Form validation checks `targetDate < Date.now() && status in [MILESTONE_STATUS.Planned, MILESTONE_STATUS.InProgress]` | Inline warning (not a hard block) per parity with web's permissive validation |
| Form submit while query refetching or mutation already in flight | `useMutation isPending` or `useQuery isFetching` is true | Submit button disabled until both idle; prevents duplicate submissions and write-while-stale |
| Delete on `_id` that no longer exists (race with another client) | `client.tx` returns server-side not-found | `wrapRepositoryError` surfaces the error; UI shows toast and refetches the list to converge |

## Ship Cut

- **Minimum coherent cut after**: TASK-008
- **Delivers**: Component CRUD (list/create/edit/hard delete) with mapper coercion fix, Milestone CRUD (list/create/edit/hard delete) using mobile-side `MILESTONE_STATUS` mirror, Project-issue-list metadata strip with live counts and navigation
- **Safe to defer**: Attachment delete chain (TASK-009/010/011) — small enough to ship together but extractable

## Test Coverage Map

- **TASK-001**: createComponent happy path with comments/attachments init + null-client error + deleteComponent issues TxRemoveDoc (no isArchived write) + getComponents mapper returns label-coerced name and sorts by label
- **TASK-002**: createMilestone happy path with comments/attachments init + null-client error + deleteMilestone issues TxRemoveDoc + MILESTONE_STATUS const exports the 4 expected values with the right numeric mapping
- **TASK-003**: each mutation hook invalidates the right tracker-keyspace key + error surfaces via showErrorToast
- **TASK-004**: list renders, empty state, delete confirmation flow, retry on error, no UI desync on failed delete
- **TASK-005**: Name field validation, label-on-submit mapping, create round-trip, edit round-trip
- **TASK-006**: list renders with status badges sourced from MILESTONE_STATUS, delete flow with reference-loss warning, retry on error
- **TASK-007**: form fields, MILESTONE_STATUS-driven status picker, label mapping, create/edit round-trip, past-date warning behavior
- **TASK-008**: metadata strip renders with counts, taps navigate, counts react to mutations, loading placeholder shape
- **TASK-009**: AttachmentMeta extension + getAttachments mapper preserves _id BEFORE blobId fallback consumes it + deleteAttachment tx call + null-client error + missing-_id propagation + useDeleteAttachment invalidates by variables.attachedTo
- **TASK-010**: onDelete optional prop renders/hides overlay, accessibilityLabel template-interpolated correctly
- **TASK-011**: confirmation flow, success removes attachment, error keeps it + toast, AttachmentInfo carries the new identity fields, defensive guard fires on stale-cache att._id null

## Execution Summary

- **Task count**: 11
- **P0 foundation**: TASK-001, TASK-009
- **Critical path (component arm)**: TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-008
- **Milestone path**: TASK-001 → TASK-002 → TASK-003 → TASK-006 → TASK-007 → TASK-008
- **Attachment path**: TASK-009 → (TASK-010 in parallel) → TASK-011

### Parallel layers

| Layer | Tasks |
|---|---|
| 0 | TASK-001, TASK-009, TASK-010 |
| 1 | TASK-002 |
| 2 | TASK-003 |
| 3 | TASK-004, TASK-006 |
| 4 | TASK-005, TASK-007, TASK-008, TASK-011 |

## Dependency Map

| Task | Depends on |
|---|---|
| TASK-001 | — |
| TASK-002 | TASK-001 |
| TASK-003 | TASK-002 |
| TASK-004 | TASK-003 |
| TASK-005 | TASK-004 |
| TASK-006 | TASK-003 |
| TASK-007 | TASK-006 |
| TASK-008 | TASK-004, TASK-006 |
| TASK-009 | — |
| TASK-010 | — |
| TASK-011 | TASK-009, TASK-010 |
