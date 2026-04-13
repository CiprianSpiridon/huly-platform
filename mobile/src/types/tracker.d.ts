/**
 * Local type declarations for @hcengineering/tracker.
 *
 * The tracker package's type declarations (types/index.d.ts) are not
 * built in the Rush monorepo workspace link. We declare simplified
 * types here that are compatible with our mobile usage without pulling
 * in the full svelte dependency chain.
 *
 * These are intentionally simplified stubs -- NOT exact mirrors of the
 * real types. They provide enough shape for our screens and hooks.
 */

declare module '@hcengineering/tracker' {
  import type {
    Doc,
    Markup,
    Ref,
    Space,
    Status,
    Timestamp,
  } from '@hcengineering/core'

  export interface IssueStatus extends Status {}

  /**
   * Simplified Project -- extends Doc (not Space) to avoid structural
   * compatibility issues with Space.description being required.
   */
  export interface Project extends Doc {
    identifier: string
    sequence: number
    name: string
    description: string
    members: Ref<Doc>[]
    space: Ref<Space>
    defaultIssueStatus?: Ref<IssueStatus>
  }

  export enum IssuePriority {
    NoPriority = 0,
    Urgent = 1,
    High = 2,
    Medium = 3,
    Low = 4,
  }

  export interface IssueParentInfo {
    parentId: Ref<Doc>
    identifier: string
    parentTitle: string
    space: Ref<Space>
  }

  export interface IssueChildInfo {
    childId: Ref<Doc>
    estimation: number
    reportedTime: number
  }

  /**
   * Simplified Issue type -- extends Doc to avoid deep type hierarchy
   * issues with AttachedDoc -> Doc<Space>.
   */
  export interface Issue extends Doc {
    attachedTo: Ref<Doc>
    title: string
    description: string | null
    status: Ref<IssueStatus>
    priority: number
    component: Ref<Doc> | null
    subIssues: number
    blockedBy?: Array<{ _id: Ref<Doc>; _class: Ref<Doc> }>
    relations?: Array<{ _id: Ref<Doc>; _class: Ref<Doc> }>
    parents: IssueParentInfo[]
    space: Ref<Space>
    milestone?: Ref<Doc> | null
    estimation: number
    remainingTime: number
    reportedTime: number
    reports: number
    childInfo: IssueChildInfo[]
    number: number
    assignee: Ref<Doc> | null
    dueDate: Timestamp | null
    comments?: number
    attachments?: number
    identifier: string
    kind: Ref<Doc>
    rank: string
    isDone?: boolean
  }

  export interface Component extends Doc {
    label: string
    description?: Markup
    lead: Ref<Doc> | null
    space: Ref<Space>
    comments: number
    attachments?: number
  }

  export enum MilestoneStatus {
    Planned = 0,
    InProgress = 1,
    Completed = 2,
    Canceled = 3,
  }

  export interface Milestone extends Doc {
    label: string
    description?: Markup
    status: MilestoneStatus
    space: Ref<Space>
    comments: number
    attachments?: number
    targetDate: Timestamp
  }

  export interface TimeSpendReport extends Doc {
    attachedTo: Ref<Doc>
    employee: Ref<Doc> | null
    date: Timestamp | null
    value: number
    description: string
  }

  export interface IssueDraft {
    _id: Ref<Doc>
    title: string
    description: Markup
    status?: Ref<IssueStatus>
    priority: number
    assignee: Ref<Doc> | null
    component: Ref<Doc> | null
    space: Ref<Space>
    dueDate: Timestamp | null
    milestone?: Ref<Doc> | null
    estimation: number
  }

  const tracker: {
    class: {
      Project: Ref<Doc>
      Issue: Ref<Doc>
      IssueTemplate: Ref<Doc>
      Component: Ref<Doc>
      IssueStatus: Ref<Doc>
      Milestone: Ref<Doc>
      TimeSpendReport: Ref<Doc>
    }
  }

  export default tracker
}
