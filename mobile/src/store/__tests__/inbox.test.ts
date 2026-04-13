/**
 * Inbox store unit tests.
 *
 * Tests unread badge count, filter selection, and bulk selection mode.
 */

import { useInboxStore } from '../inbox'

describe('inbox store', () => {
  beforeEach(() => {
    useInboxStore.setState({
      unreadTotal: 0,
      activeFilter: 'all',
      selectedIds: new Set<string>(),
      isSelectionMode: false,
    })
  })

  // ---- Unread total ----

  it('starts with zero unread total', () => {
    expect(useInboxStore.getState().unreadTotal).toBe(0)
  })

  it('sets unread total', () => {
    useInboxStore.getState().setUnreadTotal(42)
    expect(useInboxStore.getState().unreadTotal).toBe(42)
  })

  // ---- Filter ----

  it('starts with "all" filter', () => {
    expect(useInboxStore.getState().activeFilter).toBe('all')
  })

  it('sets filter to mentions', () => {
    useInboxStore.getState().setFilter('mentions')
    expect(useInboxStore.getState().activeFilter).toBe('mentions')
  })

  it('sets filter to reactions', () => {
    useInboxStore.getState().setFilter('reactions')
    expect(useInboxStore.getState().activeFilter).toBe('reactions')
  })

  it('resets filter back to all', () => {
    useInboxStore.getState().setFilter('mentions')
    useInboxStore.getState().setFilter('all')
    expect(useInboxStore.getState().activeFilter).toBe('all')
  })

  // ---- Selection mode ----

  it('starts not in selection mode', () => {
    const state = useInboxStore.getState()
    expect(state.isSelectionMode).toBe(false)
    expect(state.selectedIds.size).toBe(0)
  })

  it('enters selection mode with one item', () => {
    useInboxStore.getState().enterSelectionMode('notif-1')

    const state = useInboxStore.getState()
    expect(state.isSelectionMode).toBe(true)
    expect(state.selectedIds.has('notif-1')).toBe(true)
    expect(state.selectedIds.size).toBe(1)
  })

  it('toggles selection on and off', () => {
    useInboxStore.getState().enterSelectionMode('notif-1')
    useInboxStore.getState().toggleSelected('notif-2')

    expect(useInboxStore.getState().selectedIds.size).toBe(2)

    // Toggle off notif-1
    useInboxStore.getState().toggleSelected('notif-1')
    expect(useInboxStore.getState().selectedIds.has('notif-1')).toBe(false)
    expect(useInboxStore.getState().selectedIds.size).toBe(1)
  })

  it('exits selection mode when last item is deselected', () => {
    useInboxStore.getState().enterSelectionMode('notif-1')
    useInboxStore.getState().toggleSelected('notif-1')

    expect(useInboxStore.getState().isSelectionMode).toBe(false)
    expect(useInboxStore.getState().selectedIds.size).toBe(0)
  })

  it('selects all items', () => {
    useInboxStore.getState().selectAll(['notif-1', 'notif-2', 'notif-3'])

    const state = useInboxStore.getState()
    expect(state.isSelectionMode).toBe(true)
    expect(state.selectedIds.size).toBe(3)
  })

  it('select all with empty array does not enter selection mode', () => {
    useInboxStore.getState().selectAll([])

    expect(useInboxStore.getState().isSelectionMode).toBe(false)
  })

  it('clears selection', () => {
    useInboxStore.getState().enterSelectionMode('notif-1')
    useInboxStore.getState().toggleSelected('notif-2')
    useInboxStore.getState().clearSelection()

    const state = useInboxStore.getState()
    expect(state.isSelectionMode).toBe(false)
    expect(state.selectedIds.size).toBe(0)
  })
})
