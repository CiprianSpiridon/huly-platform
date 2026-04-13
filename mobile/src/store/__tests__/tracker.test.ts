/**
 * Tracker store unit tests.
 *
 * Tests project selection, filter/sort state, view mode toggling,
 * and issue draft management.
 */

import { useTrackerStore } from '../tracker'

// Mock AsyncStorage (already mocked in jest.setup.ts)
jest.mock('@react-native-async-storage/async-storage')

describe('tracker store', () => {
  beforeEach(() => {
    useTrackerStore.setState({
      selectedProjectId: null,
      issueFilters: { priority: [], status: [], assignee: [] },
      issueSort: { key: 'modifiedOn', order: 'descending' },
      viewMode: 'list',
      issueDraft: {
        title: '',
        description: '',
        priority: 0,
        statusId: null,
        assigneeId: null,
        projectId: null,
      },
    })
  })

  // ---- Project selection ----

  it('starts with no project selected', () => {
    expect(useTrackerStore.getState().selectedProjectId).toBeNull()
  })

  it('sets selected project', () => {
    useTrackerStore.getState().setSelectedProjectId('project-1' as never)
    expect(useTrackerStore.getState().selectedProjectId).toBe('project-1')
  })

  it('clears selected project', () => {
    useTrackerStore.getState().setSelectedProjectId('project-1' as never)
    useTrackerStore.getState().setSelectedProjectId(null)
    expect(useTrackerStore.getState().selectedProjectId).toBeNull()
  })

  // ---- Filters ----

  it('starts with empty filters', () => {
    const { issueFilters } = useTrackerStore.getState()
    expect(issueFilters.priority).toEqual([])
    expect(issueFilters.status).toEqual([])
    expect(issueFilters.assignee).toEqual([])
  })

  it('sets a single filter key', () => {
    useTrackerStore.getState().setFilter('priority', [1, 2])
    expect(useTrackerStore.getState().issueFilters.priority).toEqual([1, 2])
    // Other filters should be unchanged
    expect(useTrackerStore.getState().issueFilters.status).toEqual([])
  })

  it('clears all filters', () => {
    useTrackerStore.getState().setFilter('priority', [1])
    useTrackerStore.getState().setFilter('status', ['s1' as never])
    useTrackerStore.getState().clearFilters()

    const { issueFilters } = useTrackerStore.getState()
    expect(issueFilters.priority).toEqual([])
    expect(issueFilters.status).toEqual([])
    expect(issueFilters.assignee).toEqual([])
  })

  // ---- Sort ----

  it('starts with default sort', () => {
    const { issueSort } = useTrackerStore.getState()
    expect(issueSort.key).toBe('modifiedOn')
    expect(issueSort.order).toBe('descending')
  })

  it('sets custom sort', () => {
    useTrackerStore.getState().setSort({ key: 'priority', order: 'ascending' })
    const { issueSort } = useTrackerStore.getState()
    expect(issueSort.key).toBe('priority')
    expect(issueSort.order).toBe('ascending')
  })

  // ---- View mode ----

  it('starts in list mode', () => {
    expect(useTrackerStore.getState().viewMode).toBe('list')
  })

  it('toggles to kanban mode', () => {
    useTrackerStore.getState().setViewMode('kanban')
    expect(useTrackerStore.getState().viewMode).toBe('kanban')
  })

  // ---- Issue draft ----

  it('starts with empty draft', () => {
    const { issueDraft } = useTrackerStore.getState()
    expect(issueDraft.title).toBe('')
    expect(issueDraft.description).toBe('')
    expect(issueDraft.priority).toBe(0)
  })

  it('updates draft fields partially', () => {
    useTrackerStore.getState().updateDraft({ title: 'New issue' })
    expect(useTrackerStore.getState().issueDraft.title).toBe('New issue')
    expect(useTrackerStore.getState().issueDraft.description).toBe('')

    useTrackerStore.getState().updateDraft({ priority: 2 })
    expect(useTrackerStore.getState().issueDraft.title).toBe('New issue')
    expect(useTrackerStore.getState().issueDraft.priority).toBe(2)
  })

  it('clears draft to initial state', () => {
    useTrackerStore.getState().updateDraft({
      title: 'Some issue',
      description: 'Some desc',
      priority: 3,
    })

    useTrackerStore.getState().clearDraft()

    const { issueDraft } = useTrackerStore.getState()
    expect(issueDraft.title).toBe('')
    expect(issueDraft.description).toBe('')
    expect(issueDraft.priority).toBe(0)
    expect(issueDraft.statusId).toBeNull()
  })
})
