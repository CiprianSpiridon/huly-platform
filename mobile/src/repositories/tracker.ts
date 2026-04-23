/**
 * Tracker repository.
 *
 * Domain-specific data access for projects, issues, and search.
 * Uses `import type` exclusively for tracker types to avoid pulling
 * in svelte via the @hcengineering/ui transitive dependency.
 */

import {
  SortingOrder,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type Ref,
  type Space,
  type WithLookup,
} from '@hcengineering/core'
import type { Issue, IssueStatus, MilestoneStatus, Project } from '@hcengineering/tracker'

import { getClient } from '@/client'
import { MILESTONE_STATUS, type MilestoneStatusValue } from '@/lib/milestoneStatus'
import { RepositoryError, wrapRepositoryError } from './base'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Huly class refs for tracker types.
 *
 * These match the plugin-state values from @hcengineering/tracker but are
 * declared as plain strings so we avoid a value import that would pull
 * in svelte.
 */
const TRACKER_CLASS = {
  Project: 'tracker:class:Project' as Ref<Class<Project>>,
  Issue: 'tracker:class:Issue' as Ref<Class<Issue>>,
  IssueStatus: 'tracker:class:IssueStatus' as Ref<Class<IssueStatus>>,
  Component: 'tracker:class:Component' as Ref<Class<Doc>>,
  Milestone: 'tracker:class:Milestone' as Ref<Class<Doc>>,
  TimeSpendReport: 'tracker:class:TimeSpendReport' as Ref<Class<Doc>>,
  IssueRelation: 'tracker:class:IssueRelation' as Ref<Class<Doc>>,
} as const

const CONTACT_CLASS = {
  Person: 'contact:class:Person' as Ref<Class<Doc>>,
} as const

const TAGS_CLASS = {
  TagReference: 'tags:class:TagReference' as Ref<Class<Doc>>,
} as const

const DOMAIN = 'tracker'
const DEFAULT_PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}

export interface IssueFilters {
  priority?: number[]
  status?: Array<Ref<IssueStatus>>
  assignee?: Array<Ref<Doc>>
  component?: Array<Ref<Doc>>
  milestone?: Array<Ref<Doc>>
  dueDate?: { from?: number; to?: number }
}

export interface IssueSort {
  key: 'modifiedOn' | 'priority' | 'status' | 'dueDate'
  order: 'ascending' | 'descending'
}

// ---------------------------------------------------------------------------
// Lightweight types for components/milestones/labels/relations
// ---------------------------------------------------------------------------

export interface ComponentItem {
  _id: string
  name: string
  description?: string
  lead?: string
}

export interface MilestoneItem {
  _id: string
  name: string
  description?: string
  status?: string
  targetDate?: number
}

export interface LabelItem {
  _id: string
  title: string
  color?: number
  tag: string
}

export interface IssueRelationItem {
  _id: string
  relationType: string
  targetIssueId: string
  targetIssue?: {
    _id: string
    title: string
    identifier: string
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function getProjects(): Promise<Project[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getProjects')
  }

  try {
    const result = await client.findAll(
      TRACKER_CLASS.Project,
      {},
      { sort: { name: SortingOrder.Ascending } }
    )
    return [...result]
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getProjects', error)
  }
}

export async function getProjectDetail(
  projectId: Ref<Space>
): Promise<WithLookup<Project> | undefined> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getProjectDetail')
  }

  try {
    return await client.findOne(
      TRACKER_CLASS.Project,
      { _id: projectId as unknown as Ref<Project> }
    )
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getProjectDetail', error)
  }
}

export async function createProject(
  data: Record<string, unknown>
): Promise<Ref<Doc>> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'createProject')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const tx = factory.createTxCreateDoc(
      TRACKER_CLASS.Project as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      data as unknown as Record<string, unknown>
    )
    await client.tx(tx)
    return tx.objectId as Ref<Doc>
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'createProject', error)
  }
}

export async function updateProject(
  projectId: Ref<Space>,
  update: Record<string, unknown>
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'updateProject')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const tx = factory.createTxUpdateDoc(
      TRACKER_CLASS.Project as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      projectId as unknown as Ref<Doc>,
      update
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'updateProject', error)
  }
}

export async function deleteProject(
  projectId: Ref<Space>
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'deleteProject')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const tx = factory.createTxRemoveDoc(
      TRACKER_CLASS.Project as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      projectId as unknown as Ref<Doc>
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'deleteProject', error)
  }
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

/**
 * Cursor value for keyset pagination. Undefined for the first page.
 * Contains the sort-key value and _id of the last item for tiebreaking.
 */
export interface IssueCursorValue {
  sortValue: number
  id: string
}
export type IssueCursor = IssueCursorValue | undefined

export async function getIssues(
  projectId: Ref<Space>,
  filters?: IssueFilters,
  sort?: IssueSort,
  cursor?: IssueCursor
): Promise<PaginatedResult<Issue>> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getIssues')
  }

  try {
    const query: DocumentQuery<Issue> = { space: projectId }

    if (filters?.priority !== undefined && filters.priority.length > 0) {
      ;(query as Record<string, unknown>).priority = { $in: filters.priority }
    }
    if (filters?.status !== undefined && filters.status.length > 0) {
      ;(query as Record<string, unknown>).status = { $in: filters.status }
    }
    if (filters?.assignee !== undefined && filters.assignee.length > 0) {
      ;(query as Record<string, unknown>).assignee = { $in: filters.assignee }
    }
    if (filters?.component !== undefined && filters.component.length > 0) {
      ;(query as Record<string, unknown>).component = { $in: filters.component }
    }
    if (filters?.milestone !== undefined && filters.milestone.length > 0) {
      ;(query as Record<string, unknown>).milestone = { $in: filters.milestone }
    }
    if (filters?.dueDate !== undefined) {
      const dueDateQuery: Record<string, unknown> = {}
      if (filters.dueDate.from !== undefined) dueDateQuery.$gte = filters.dueDate.from
      if (filters.dueDate.to !== undefined) dueDateQuery.$lte = filters.dueDate.to
      if (Object.keys(dueDateQuery).length > 0) {
        ;(query as Record<string, unknown>).dueDate = dueDateQuery
      }
    }

    const sortOrder = sort?.order === 'ascending' ? SortingOrder.Ascending : SortingOrder.Descending
    const sortKey = sort?.key ?? 'modifiedOn'

    if (cursor !== undefined) {
      const cursorOp = sortOrder === SortingOrder.Descending ? '$lt' : '$gt'
      const idOp = sortOrder === SortingOrder.Descending ? '$lt' : '$gt'
      ;(query as Record<string, unknown>).$or = [
        { [sortKey]: { [cursorOp]: cursor.sortValue } },
        { [sortKey]: cursor.sortValue, _id: { [idOp]: cursor.id } },
      ]
    }

    const options: FindOptions<Issue> = {
      sort: { [sortKey]: sortOrder, _id: sortOrder } as Record<string, SortingOrder>,
      limit: DEFAULT_PAGE_SIZE + 1,
      total: true,
      // Expand status and assignee refs so UI can show human-readable values
      lookup: {
        status: TRACKER_CLASS.IssueStatus,
        assignee: CONTACT_CLASS.Person,
      } as unknown as FindOptions<Issue>['lookup'],
    }

    const result = await client.findAll(TRACKER_CLASS.Issue, query, options)
    const all = [...result]
    const hasMore = all.length > DEFAULT_PAGE_SIZE
    const items = hasMore ? all.slice(0, DEFAULT_PAGE_SIZE) : all

    return {
      items,
      total: result.total,
      hasMore,
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getIssues', error)
  }
}

// ---------------------------------------------------------------------------
// Single issue
// ---------------------------------------------------------------------------

export async function getIssue(
  issueId: Ref<Issue>
): Promise<WithLookup<Issue> | undefined> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getIssue')
  }

  try {
    return await client.findOne(
      TRACKER_CLASS.Issue,
      { _id: issueId },
      {
        lookup: {
          status: TRACKER_CLASS.IssueStatus,
          assignee: CONTACT_CLASS.Person,
        } as unknown as FindOptions<Issue>['lookup'],
      }
    )
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getIssue', error)
  }
}

// ---------------------------------------------------------------------------
// Sub-issues
// ---------------------------------------------------------------------------

export async function getSubIssues(
  parentIssueId: Ref<Issue>
): Promise<Issue[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getSubIssues')
  }

  try {
    const result = await client.findAll(
      TRACKER_CLASS.Issue,
      { attachedTo: parentIssueId } as unknown as DocumentQuery<Issue>,
      {
        sort: { modifiedOn: SortingOrder.Descending } as Record<string, SortingOrder>,
        lookup: {
          status: TRACKER_CLASS.IssueStatus,
        } as unknown as FindOptions<Issue>['lookup'],
      }
    )
    return [...result]
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getSubIssues', error)
  }
}

export async function createSubIssue(
  parentIssueId: Ref<Issue>,
  projectId: Ref<Space>,
  data: Record<string, unknown>
): Promise<Ref<Doc>> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'createSubIssue')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const attrs: Record<string, unknown> = {
      ...data,
      attachedTo: parentIssueId,
    }
    const tx = factory.createTxCreateDoc(
      TRACKER_CLASS.Issue as unknown as Ref<Class<Doc>>,
      projectId,
      attrs as unknown as Record<string, unknown>
    )
    await client.tx(tx)
    return tx.objectId as Ref<Doc>
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'createSubIssue', error)
  }
}

// ---------------------------------------------------------------------------
// Update/delete issue
// ---------------------------------------------------------------------------

export async function updateIssueField(
  issueId: Ref<Issue>,
  projectId: Ref<Space>,
  field: string,
  value: unknown
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'updateIssueField')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const tx = factory.createTxUpdateDoc(
      TRACKER_CLASS.Issue as unknown as Ref<Class<Doc>>,
      projectId,
      issueId as unknown as Ref<Doc>,
      { [field]: value }
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'updateIssueField', error)
  }
}

export async function deleteIssue(
  issueId: Ref<Issue>,
  projectId: Ref<Space>
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'deleteIssue')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const tx = factory.createTxRemoveDoc(
      TRACKER_CLASS.Issue as unknown as Ref<Class<Doc>>,
      projectId,
      issueId as unknown as Ref<Doc>
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'deleteIssue', error)
  }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export async function getComponents(
  projectId: Ref<Space>
): Promise<ComponentItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getComponents')
  }

  try {
    const result = await client.findAll<Doc>(
      TRACKER_CLASS.Component,
      { space: projectId } as Record<string, unknown>,
      { sort: { label: SortingOrder.Ascending } as Record<string, SortingOrder> }
    )
    return [...result].map((doc) => {
      const r = doc as unknown as Record<string, unknown>
      return {
        _id: String(r._id ?? ''),
        name: String(r.label ?? r.name ?? ''),
        description: r.description != null ? String(r.description) : undefined,
        lead: r.lead != null ? String(r.lead) : undefined,
      }
    })
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getComponents', error)
  }
}

// ---------------------------------------------------------------------------
// Component CRUD
// ---------------------------------------------------------------------------

export interface CreateComponentInput {
  label: string
  description?: string
  lead?: Ref<Doc> | null
  space: Ref<Space>
}

export async function createComponent(
  input: CreateComponentInput
): Promise<Ref<Doc>> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'createComponent')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const attrs: Record<string, unknown> = {
      label: input.label,
      description: input.description ?? '',
      lead: input.lead ?? null,
      comments: 0,
      attachments: 0,
    }
    const tx = factory.createTxCreateDoc(
      TRACKER_CLASS.Component,
      input.space,
      attrs
    )
    await client.tx(tx)
    return tx.objectId as Ref<Doc>
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'createComponent', error)
  }
}

export async function updateComponent(
  id: Ref<Doc>,
  space: Ref<Space>,
  patch: Record<string, unknown>
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'updateComponent')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const tx = factory.createTxUpdateDoc(
      TRACKER_CLASS.Component,
      space,
      id,
      patch
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'updateComponent', error)
  }
}

export async function deleteComponent(
  id: Ref<Doc>,
  space: Ref<Space>
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'deleteComponent')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const tx = factory.createTxRemoveDoc(
      TRACKER_CLASS.Component,
      space,
      id
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'deleteComponent', error)
  }
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function getMilestones(
  projectId: Ref<Space>
): Promise<MilestoneItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getMilestones')
  }

  try {
    const result = await client.findAll<Doc>(
      TRACKER_CLASS.Milestone,
      { space: projectId } as Record<string, unknown>,
      { sort: { targetDate: SortingOrder.Ascending } as Record<string, SortingOrder> }
    )
    return [...result].map((doc) => {
      const r = doc as unknown as Record<string, unknown>
      return {
        _id: String(r._id ?? ''),
        name: String(r.name ?? r.label ?? ''),
        description: r.description != null ? String(r.description) : undefined,
        status: r.status != null ? String(r.status) : undefined,
        targetDate: r.targetDate != null ? Number(r.targetDate) : undefined,
      }
    })
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getMilestones', error)
  }
}

// ---------------------------------------------------------------------------
// Milestone CRUD
// ---------------------------------------------------------------------------

export interface CreateMilestoneInput {
  label: string
  description?: string
  status?: MilestoneStatusValue
  space: Ref<Space>
  targetDate: number
}

export async function createMilestone(
  input: CreateMilestoneInput
): Promise<Ref<Doc>> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'createMilestone')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const status = (input.status ?? MILESTONE_STATUS.Planned) as unknown as MilestoneStatus
    const attrs: Record<string, unknown> = {
      label: input.label,
      description: input.description ?? '',
      status,
      targetDate: input.targetDate,
      comments: 0,
      attachments: 0,
    }
    const tx = factory.createTxCreateDoc(
      TRACKER_CLASS.Milestone,
      input.space,
      attrs
    )
    await client.tx(tx)
    return tx.objectId as Ref<Doc>
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'createMilestone', error)
  }
}

export async function updateMilestone(
  id: Ref<Doc>,
  space: Ref<Space>,
  patch: Record<string, unknown>
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'updateMilestone')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const tx = factory.createTxUpdateDoc(
      TRACKER_CLASS.Milestone,
      space,
      id,
      patch
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'updateMilestone', error)
  }
}

export async function deleteMilestone(
  id: Ref<Doc>,
  space: Ref<Space>
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'deleteMilestone')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const tx = factory.createTxRemoveDoc(
      TRACKER_CLASS.Milestone,
      space,
      id
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'deleteMilestone', error)
  }
}

// ---------------------------------------------------------------------------
// Labels (tag references)
// ---------------------------------------------------------------------------

export async function getLabels(
  issueId: string
): Promise<LabelItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getLabels')
  }

  try {
    const result = await client.findAll<Doc>(
      TAGS_CLASS.TagReference,
      { attachedTo: issueId as Ref<Doc> } as Record<string, unknown>,
      { limit: 100 }
    )
    return [...result].map((doc) => {
      const r = doc as unknown as Record<string, unknown>
      return {
        _id: String(r._id ?? ''),
        title: String(r.title ?? r.tag ?? ''),
        color: r.color != null ? Number(r.color) : undefined,
        tag: String(r.tag ?? ''),
      }
    })
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getLabels', error)
  }
}

export async function getProjectLabels(
  projectId: Ref<Space>
): Promise<LabelItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getProjectLabels')
  }

  try {
    const result = await client.findAll<Doc>(
      TAGS_CLASS.TagReference,
      { space: projectId } as Record<string, unknown>,
      { limit: 200 }
    )
    // Deduplicate by tag title
    const seen = new Map<string, LabelItem>()
    for (const doc of [...result]) {
      const r = doc as unknown as Record<string, unknown>
      const title = String(r.title ?? r.tag ?? '')
      if (!seen.has(title)) {
        seen.set(title, {
          _id: String(r._id ?? ''),
          title,
          color: r.color != null ? Number(r.color) : undefined,
          tag: String(r.tag ?? ''),
        })
      }
    }
    return Array.from(seen.values())
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getProjectLabels', error)
  }
}

// ---------------------------------------------------------------------------
// Issue relations
// ---------------------------------------------------------------------------

export async function getIssueRelations(
  issueId: Ref<Issue>
): Promise<IssueRelationItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getIssueRelations')
  }

  try {
    const result = await client.findAll<Doc>(
      TRACKER_CLASS.Issue,
      { _id: issueId } as Record<string, unknown>,
      { limit: 1 }
    )
    const issue = [...result][0]
    if (issue == null) return []

    const relations = (issue as unknown as Record<string, unknown>).relations as Array<Record<string, unknown>> | undefined
    if (relations == null || !Array.isArray(relations)) return []

    return relations.map((rel) => ({
      _id: String(rel._id ?? ''),
      relationType: String(rel._class ?? rel.type ?? 'related'),
      targetIssueId: String(rel._id ?? ''),
      targetIssue: undefined,
    }))
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getIssueRelations', error)
  }
}

// ---------------------------------------------------------------------------
// Time reports
// ---------------------------------------------------------------------------

export async function createTimeReport(
  issueId: Ref<Issue>,
  projectId: Ref<Space>,
  value: number,
  description?: string
): Promise<Ref<Doc>> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'createTimeReport')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)
    const attrs: Record<string, unknown> = {
      attachedTo: issueId,
      attachedToClass: TRACKER_CLASS.Issue,
      collection: 'reports',
      value,
      date: Date.now(),
    }
    if (description != null && description.length > 0) {
      attrs.description = description
    }
    const tx = factory.createTxCreateDoc(
      TRACKER_CLASS.TimeSpendReport as unknown as Ref<Class<Doc>>,
      projectId,
      attrs as unknown as Record<string, unknown>
    )
    await client.tx(tx)
    return tx.objectId as Ref<Doc>
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'createTimeReport', error)
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface IssueSearchResult {
  id: Ref<Doc>
  title?: string
  shortTitle?: string
  description?: string
}

export async function searchIssues(
  query: string,
  limit: number = 20
): Promise<IssueSearchResult[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'searchIssues')
  }

  try {
    const result = await client.searchFulltext(
      {
        query,
        classes: [TRACKER_CLASS.Issue as unknown as Ref<Class<Doc>>],
      },
      { limit }
    )
    return result.docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      shortTitle: doc.shortTitle,
      description: doc.description,
    }))
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'searchIssues', error)
  }
}
