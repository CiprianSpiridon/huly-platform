/**
 * Mobile-side mirror of the @hcengineering/tracker MilestoneStatus enum.
 *
 * Cannot value-import the real enum because @hcengineering/tracker pulls in
 * @hcengineering/ui transitively, which depends on svelte and breaks Metro
 * (per the project's RN-Safety Matrix). The TS field type can still be
 * obtained via `import type { MilestoneStatus } from '@hcengineering/tracker'`
 * for typing — only the numeric values are mirrored here.
 *
 * Mirrors the precedent set by `ISSUE_PRIORITY` in
 * `mobile/src/components/ui/PriorityIcon.tsx`.
 */

export const MILESTONE_STATUS = {
  Planned: 0,
  InProgress: 1,
  Completed: 2,
  Canceled: 3,
} as const

export type MilestoneStatusValue = (typeof MILESTONE_STATUS)[keyof typeof MILESTONE_STATUS]
