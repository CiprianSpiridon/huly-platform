/**
 * Notification repository unit tests.
 *
 * Tests getNotifications, markAsRead, markAllAsRead, archiveNotifications,
 * archiveAll, getUnreadCount. Verifies correct class refs, filter mapping,
 * cursor-based pagination, and error handling.
 */

import { createMockHulyClient } from '@/test/mockHulyClient'

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotifications,
  archiveAll,
  getUnreadCount,
} from '../notification'
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

describe('notification repository', () => {
  const { mockClient, installMock, uninstallMock } = createMockHulyClient()

  beforeEach(() => {
    installMock()
    jest.clearAllMocks()
  })

  afterEach(() => {
    uninstallMock()
  })

  // ---- getNotifications ----

  describe('getNotifications', () => {
    it('fetches notifications with InboxNotification class by default', async () => {
      const docs = [
        {
          _id: 'n1',
          _class: 'notification:class:ActivityInboxNotification',
          isViewed: false,
          archived: false,
          title: 'Update',
          modifiedOn: 1000,
          modifiedBy: 'u2',
        },
      ]
      mockClient.findAll.mockResolvedValue(
        Object.assign([...docs], { total: 1 })
      )

      const result = await getNotifications()

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockClient.findAll).toHaveBeenCalledWith(
        'notification:class:InboxNotification',
        expect.objectContaining({ archived: false }),
        expect.objectContaining({ total: true })
      )
    })

    it('uses MentionInboxNotification class for mentions filter', async () => {
      mockClient.findAll.mockResolvedValue(
        Object.assign([], { total: 0 })
      )

      await getNotifications({ type: 'mentions' })

      expect(mockClient.findAll).toHaveBeenCalledWith(
        'notification:class:MentionInboxNotification',
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('uses ReactionInboxNotification class for reactions filter', async () => {
      mockClient.findAll.mockResolvedValue(
        Object.assign([], { total: 0 })
      )

      await getNotifications({ type: 'reactions' })

      expect(mockClient.findAll).toHaveBeenCalledWith(
        'notification:class:ReactionInboxNotification',
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('applies cursor for pagination', async () => {
      mockClient.findAll.mockResolvedValue(
        Object.assign([], { total: 0 })
      )

      await getNotifications(undefined, { cursor: '5000' })

      const query = mockClient.findAll.mock.calls[0]?.[1] as Record<string, unknown>
      expect(query.modifiedOn).toEqual({ $lt: 5000 })
    })

    it('reports hasMore when extra item returned', async () => {
      const docs = Array.from({ length: 31 }, (_, i) => ({
        _id: `n-${i}`,
        _class: 'notification:class:InboxNotification',
        modifiedOn: 31 - i,
      }))
      mockClient.findAll.mockResolvedValue(
        Object.assign([...docs], { total: 100 })
      )

      const result = await getNotifications()

      expect(result.hasMore).toBe(true)
      expect(result.items).toHaveLength(30)
    })

    it('maps document fields to NotificationItem', async () => {
      const docs = [{
        _id: 'n1',
        _class: 'notification:class:MentionInboxNotification',
        isViewed: true,
        archived: false,
        title: 'Mentioned',
        body: 'You were mentioned',
        objectId: 'issue-1',
        objectClass: 'tracker:class:Issue',
        modifiedOn: 1000,
        modifiedBy: 'u2',
      }]
      mockClient.findAll.mockResolvedValue(
        Object.assign([...docs], { total: 1 })
      )

      const result = await getNotifications()

      expect(result.items[0]?.notificationType).toBe('mentions')
      expect(result.items[0]?.isViewed).toBe(true)
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(getNotifications()).rejects.toThrow(RepositoryError)
    })
  })

  // ---- markAsRead ----

  describe('markAsRead', () => {
    it('updates each notification to isViewed=true', async () => {
      const docs = [
        { _id: 'n1', space: 'space-1' },
        { _id: 'n2', space: 'space-1' },
      ]
      mockClient.findAll.mockResolvedValue(docs)
      mockClient.getAccount.mockResolvedValue({ primarySocialId: 'u1' })
      mockClient.tx.mockResolvedValue({})

      await markAsRead(['n1', 'n2'])

      // Should have called tx twice (once per notification)
      expect(mockClient.tx).toHaveBeenCalledTimes(2)
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(markAsRead(['n1'])).rejects.toThrow(RepositoryError)
    })
  })

  // ---- markAllAsRead ----

  describe('markAllAsRead', () => {
    it('marks all unread non-archived notifications', async () => {
      const docs = [
        { _id: 'n1', space: 'space-1' },
        { _id: 'n2', space: 'space-1' },
      ]
      mockClient.findAll.mockResolvedValue(docs)
      mockClient.getAccount.mockResolvedValue({ primarySocialId: 'u1' })
      mockClient.tx.mockResolvedValue({})

      await markAllAsRead()

      expect(mockClient.tx).toHaveBeenCalledTimes(2)
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(markAllAsRead()).rejects.toThrow(RepositoryError)
    })
  })

  // ---- archiveNotifications ----

  describe('archiveNotifications', () => {
    it('archives specific notifications', async () => {
      const docs = [{ _id: 'n1', space: 'space-1' }]
      mockClient.findAll.mockResolvedValue(docs)
      mockClient.getAccount.mockResolvedValue({ primarySocialId: 'u1' })
      mockClient.tx.mockResolvedValue({})

      await archiveNotifications(['n1'])

      expect(mockClient.tx).toHaveBeenCalledTimes(1)
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(archiveNotifications(['n1'])).rejects.toThrow(RepositoryError)
    })
  })

  // ---- archiveAll ----

  describe('archiveAll', () => {
    it('archives all non-archived notifications', async () => {
      mockClient.findAll.mockResolvedValue([
        { _id: 'n1', space: 's1' },
      ])
      mockClient.getAccount.mockResolvedValue({ primarySocialId: 'u1' })
      mockClient.tx.mockResolvedValue({})

      await archiveAll()

      expect(mockClient.tx).toHaveBeenCalledTimes(1)
    })
  })

  // ---- getUnreadCount ----

  describe('getUnreadCount', () => {
    it('returns total from findAll result', async () => {
      mockClient.findAll.mockResolvedValue(
        Object.assign([], { total: 42 })
      )

      const count = await getUnreadCount()

      expect(count).toBe(42)
    })

    it('returns 0 when client is null', async () => {
      uninstallMock()
      const count = await getUnreadCount()
      expect(count).toBe(0)
    })

    it('returns 0 on error', async () => {
      mockClient.findAll.mockRejectedValue(new Error('Server error'))
      const count = await getUnreadCount()
      expect(count).toBe(0)
    })
  })
})
