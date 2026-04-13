/**
 * Chat store unit tests.
 *
 * Tests unread count management, draft message handling,
 * active channel tracking, and total unread computation.
 */

import { useChatStore } from '../chat'

describe('chat store', () => {
  beforeEach(() => {
    useChatStore.setState({
      unreadCounts: new Map(),
      draftMessages: new Map(),
      activeChannelId: null,
      unreadTotal: 0,
    })
  })

  // ---- Unread counts ----

  it('starts with zero unread', () => {
    const state = useChatStore.getState()
    expect(state.unreadTotal).toBe(0)
    expect(state.unreadCounts.size).toBe(0)
  })

  it('sets unread count for a channel', () => {
    useChatStore.getState().setUnreadCount('ch-1', 5)

    const state = useChatStore.getState()
    expect(state.unreadCounts.get('ch-1')).toBe(5)
    expect(state.unreadTotal).toBe(5)
  })

  it('removes channel from unread map when count is zero', () => {
    useChatStore.getState().setUnreadCount('ch-1', 5)
    useChatStore.getState().setUnreadCount('ch-1', 0)

    expect(useChatStore.getState().unreadCounts.has('ch-1')).toBe(false)
    expect(useChatStore.getState().unreadTotal).toBe(0)
  })

  it('clears unread for a specific channel', () => {
    useChatStore.getState().setUnreadCount('ch-1', 3)
    useChatStore.getState().setUnreadCount('ch-2', 7)
    useChatStore.getState().clearUnread('ch-1')

    expect(useChatStore.getState().unreadCounts.has('ch-1')).toBe(false)
    expect(useChatStore.getState().unreadTotal).toBe(7)
  })

  it('increments unread count', () => {
    useChatStore.getState().setUnreadCount('ch-1', 3)
    useChatStore.getState().incrementUnread('ch-1')

    expect(useChatStore.getState().unreadCounts.get('ch-1')).toBe(4)
    expect(useChatStore.getState().unreadTotal).toBe(4)
  })

  it('increments unread for new channel from zero', () => {
    useChatStore.getState().incrementUnread('ch-new')

    expect(useChatStore.getState().unreadCounts.get('ch-new')).toBe(1)
    expect(useChatStore.getState().unreadTotal).toBe(1)
  })

  it('computes total across multiple channels', () => {
    useChatStore.getState().setUnreadCount('ch-1', 3)
    useChatStore.getState().setUnreadCount('ch-2', 7)
    useChatStore.getState().setUnreadCount('ch-3', 2)

    expect(useChatStore.getState().unreadTotal).toBe(12)
  })

  it('resets all unread counts', () => {
    useChatStore.getState().setUnreadCount('ch-1', 3)
    useChatStore.getState().setUnreadCount('ch-2', 7)
    useChatStore.getState().resetAllUnread()

    expect(useChatStore.getState().unreadCounts.size).toBe(0)
    expect(useChatStore.getState().unreadTotal).toBe(0)
  })

  // ---- Draft messages ----

  it('saves a draft message', () => {
    useChatStore.getState().saveDraft('ch-1', 'Hello')
    expect(useChatStore.getState().getDraft('ch-1')).toBe('Hello')
  })

  it('returns empty string for channel with no draft', () => {
    expect(useChatStore.getState().getDraft('ch-nonexistent')).toBe('')
  })

  it('removes draft when text is empty', () => {
    useChatStore.getState().saveDraft('ch-1', 'Hello')
    useChatStore.getState().saveDraft('ch-1', '')

    expect(useChatStore.getState().draftMessages.has('ch-1')).toBe(false)
  })

  it('clears a specific draft', () => {
    useChatStore.getState().saveDraft('ch-1', 'Hello')
    useChatStore.getState().clearDraft('ch-1')

    expect(useChatStore.getState().draftMessages.has('ch-1')).toBe(false)
  })

  // ---- Active channel ----

  it('starts with no active channel', () => {
    expect(useChatStore.getState().activeChannelId).toBeNull()
  })

  it('sets active channel', () => {
    useChatStore.getState().setActiveChannel('ch-1')
    expect(useChatStore.getState().activeChannelId).toBe('ch-1')
  })

  it('clears active channel', () => {
    useChatStore.getState().setActiveChannel('ch-1')
    useChatStore.getState().setActiveChannel(null)
    expect(useChatStore.getState().activeChannelId).toBeNull()
  })
})
