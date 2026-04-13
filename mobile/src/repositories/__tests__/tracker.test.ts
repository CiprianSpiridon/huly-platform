/**
 * Tracker repository unit tests.
 *
 * Tests getProjects, getIssues, getIssue, searchIssues with mock HulyClient.
 * Verifies correct class refs, query construction, and error handling.
 */

import { createMockHulyClient } from '@/test/mockHulyClient'
import { buildIssue, buildIssueList, buildProject } from '@/test/factories'

import { getProjects, getIssues, getIssue, searchIssues } from '../tracker'
import { RepositoryError } from '../base'

// Mock the client module
jest.mock('@/client', () => {
  let _client: unknown = null
  return {
    getClient: () => _client,
    setClient: (c: unknown) => { _client = c },
    clearClient: () => { _client = null },
  }
})

describe('tracker repository', () => {
  const { mockClient, installMock, uninstallMock } = createMockHulyClient()

  beforeEach(() => {
    installMock()
    jest.clearAllMocks()
  })

  afterEach(() => {
    uninstallMock()
  })

  // ---- getProjects ----

  describe('getProjects', () => {
    it('returns projects from client.findAll', async () => {
      const projects = [buildProject(), buildProject()]
      mockClient.findAll.mockResolvedValue(projects)

      const result = await getProjects()

      expect(result).toHaveLength(2)
      expect(mockClient.findAll).toHaveBeenCalledWith(
        'tracker:class:Project',
        {},
        expect.objectContaining({ sort: expect.any(Object) })
      )
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(getProjects()).rejects.toThrow(RepositoryError)
    })

    it('wraps network errors as RepositoryError', async () => {
      mockClient.findAll.mockRejectedValue(new Error('Network timeout'))
      await expect(getProjects()).rejects.toThrow(RepositoryError)
    })
  })

  // ---- getIssues ----

  describe('getIssues', () => {
    it('fetches issues for a project', async () => {
      const issues = buildIssueList(3)
      mockClient.findAll.mockResolvedValue(
        Object.assign([...issues], { total: 3 })
      )

      const result = await getIssues('project-1' as never)

      expect(result.items).toHaveLength(3)
      expect(result.total).toBe(3)
      expect(result.hasMore).toBe(false)
      expect(mockClient.findAll).toHaveBeenCalledWith(
        'tracker:class:Issue',
        expect.objectContaining({ space: 'project-1' }),
        expect.objectContaining({ limit: 50, total: true })
      )
    })

    it('applies priority filter', async () => {
      mockClient.findAll.mockResolvedValue(
        Object.assign([], { total: 0 })
      )

      await getIssues('project-1' as never, { priority: [1, 2] })

      const query = mockClient.findAll.mock.calls[0]?.[1] as Record<string, unknown>
      expect(query.priority).toEqual({ $in: [1, 2] })
    })

    it('applies status filter', async () => {
      mockClient.findAll.mockResolvedValue(
        Object.assign([], { total: 0 })
      )

      await getIssues('project-1' as never, { status: ['s1', 's2'] as never[] })

      const query = mockClient.findAll.mock.calls[0]?.[1] as Record<string, unknown>
      expect(query.status).toEqual({ $in: ['s1', 's2'] })
    })

    it('applies assignee filter', async () => {
      mockClient.findAll.mockResolvedValue(
        Object.assign([], { total: 0 })
      )

      await getIssues('project-1' as never, { assignee: ['u1'] as never[] })

      const query = mockClient.findAll.mock.calls[0]?.[1] as Record<string, unknown>
      expect(query.assignee).toEqual({ $in: ['u1'] })
    })

    it('reports hasMore when results exceed page size', async () => {
      const issues = buildIssueList(50)
      mockClient.findAll.mockResolvedValue(
        Object.assign([...issues], { total: 100 })
      )

      const result = await getIssues('project-1' as never)

      expect(result.hasMore).toBe(true)
    })

    it('includes lookup options for status and assignee', async () => {
      mockClient.findAll.mockResolvedValue(
        Object.assign([], { total: 0 })
      )

      await getIssues('project-1' as never)

      const options = mockClient.findAll.mock.calls[0]?.[2] as Record<string, unknown>
      expect(options.lookup).toBeDefined()
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(getIssues('project-1' as never)).rejects.toThrow(RepositoryError)
    })
  })

  // ---- getIssue ----

  describe('getIssue', () => {
    it('returns a single issue by ID', async () => {
      const issue = buildIssue({ _id: 'issue-99' })
      mockClient.findOne.mockResolvedValue(issue)

      const result = await getIssue('issue-99' as never)

      expect(result).toBeDefined()
      expect(mockClient.findOne).toHaveBeenCalledWith(
        'tracker:class:Issue',
        { _id: 'issue-99' },
        expect.objectContaining({ lookup: expect.any(Object) })
      )
    })

    it('returns undefined when issue not found', async () => {
      mockClient.findOne.mockResolvedValue(undefined)

      const result = await getIssue('nonexistent' as never)

      expect(result).toBeUndefined()
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(getIssue('issue-1' as never)).rejects.toThrow(RepositoryError)
    })
  })

  // ---- searchIssues ----

  describe('searchIssues', () => {
    it('searches fulltext with query', async () => {
      mockClient.searchFulltext.mockResolvedValue({
        docs: [
          { id: 'issue-1', title: 'Fix bug', shortTitle: 'HULY-1' },
          { id: 'issue-2', title: 'Add feature', shortTitle: 'HULY-2' },
        ],
      })

      const results = await searchIssues('bug')

      expect(results).toHaveLength(2)
      expect(results[0]?.title).toBe('Fix bug')
      expect(mockClient.searchFulltext).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'bug',
          classes: expect.arrayContaining(['tracker:class:Issue']),
        }),
        expect.objectContaining({ limit: 20 })
      )
    })

    it('respects custom limit', async () => {
      mockClient.searchFulltext.mockResolvedValue({ docs: [] })

      await searchIssues('test', 5)

      expect(mockClient.searchFulltext).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ limit: 5 })
      )
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(searchIssues('test')).rejects.toThrow(RepositoryError)
    })
  })
})
