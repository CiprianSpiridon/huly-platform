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
import type { Issue, IssueStatus, Project } from '@hcengineering/tracker'

import { getClient } from '@/client'
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
}

export interface IssueSort {
  key: 'modifiedOn' | 'priority' | 'status' | 'dueDate'
  order: 'ascending' | 'descending'
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

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export async function getIssues(
  projectId: Ref<Space>,
  filters?: IssueFilters,
  sort?: IssueSort,
  page: number = 0
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

    const sortOrder = sort?.order === 'ascending' ? SortingOrder.Ascending : SortingOrder.Descending
    const sortKey = sort?.key ?? 'modifiedOn'

    const limit = (page + 1) * DEFAULT_PAGE_SIZE

    const options: FindOptions<Issue> = {
      sort: { [sortKey]: sortOrder } as Record<string, SortingOrder>,
      limit,
      total: true,
    }

    const result = await client.findAll(TRACKER_CLASS.Issue, query, options)

    // When page > 0, slice off already-fetched items
    const items = page > 0 ? [...result].slice(page * DEFAULT_PAGE_SIZE) : [...result]

    return {
      items,
      total: result.total,
      hasMore: (page + 1) * DEFAULT_PAGE_SIZE < result.total,
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
      { _id: issueId }
    )
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getIssue', error)
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
