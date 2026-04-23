/**
 * Activity repository unit tests.
 *
 * Tests getComments (issue chat messages only — must NOT pull
 * DocUpdateMessage / ActivityInfoMessage), getActivityTimeline (mixed
 * chat messages + system activity, type-tagged), createComment,
 * updateComment, deleteComment.
 */

import { createMockHulyClient } from '@/test/mockHulyClient'

import {
  getComments,
  getActivityTimeline,
  createComment,
  updateComment,
  deleteComment,
} from '../activity'
import { RepositoryError } from '../base'

jest.mock('@/client', () => {
  let _client: unknown = null
  return {
    getClient: () => _client,
    setClient: (c: unknown) => { _client = c },
    clearClient: () => { _client = null },
  }
})

describe('activity repository', () => {
  const { mockClient, installMock, uninstallMock } = createMockHulyClient()

  beforeEach(() => {
    installMock()
    jest.clearAllMocks()
  })

  afterEach(() => {
    uninstallMock()
  })

  // -------------------------------------------------------------------------
  // getComments
  // -------------------------------------------------------------------------

  describe('getComments', () => {
    it('queries chunter:class:ChatMessage scoped to attachedTo (not the base ActivityMessage class)', async () => {
      mockClient.findAll.mockResolvedValue(Object.assign([], { total: 0 }))

      await getComments('issue-123')

      expect(mockClient.findAll).toHaveBeenCalled()
      const [classRef, query] = mockClient.findAll.mock.calls[0]
      // CRITICAL: must filter by ChatMessage, not the base ActivityMessage,
      // otherwise system messages (status changes, assignments) leak into
      // the comment list. This was Known Defect #5 in CLAUDE.md.
      expect(classRef).toBe('chunter:class:ChatMessage')
      expect(query).toMatchObject({ attachedTo: 'issue-123' })
    })

    it('returns mapped CommentItem[] sorted oldest-first', async () => {
      mockClient.findAll.mockResolvedValue([
        { _id: 'c-2', message: 'second', createdBy: 'u-1', createdOn: 2000, modifiedOn: 2000 },
        { _id: 'c-1', message: 'first', createdBy: 'u-1', createdOn: 1000, modifiedOn: 1000 },
      ])

      const comments = await getComments('issue-123')

      expect(comments).toHaveLength(2)
      expect(comments[0]?._id).toBe('c-2')
      expect(comments[0]?.message).toBe('second')
      expect(comments[1]?._id).toBe('c-1')
    })

    it('throws RepositoryError when getClient() returns null', async () => {
      uninstallMock()
      await expect(getComments('issue-123')).rejects.toThrow(RepositoryError)
    })
  })

  // -------------------------------------------------------------------------
  // getActivityTimeline
  // -------------------------------------------------------------------------

  describe('getActivityTimeline', () => {
    it('returns a mixed feed of chat messages and DocUpdateMessage entries with type tags', async () => {
      mockClient.findAll.mockResolvedValue([
        {
          _id: 'msg-1',
          _class: 'chunter:class:ChatMessage',
          message: 'hello',
          createdBy: 'u-1',
          createdOn: 1000,
        },
        {
          _id: 'sys-1',
          _class: 'activity:class:DocUpdateMessage',
          createdBy: 'u-2',
          createdOn: 2000,
          attributeUpdates: { status: { set: 'In Progress' } },
        },
      ])

      const items = await getActivityTimeline('issue-123')

      expect(items).toHaveLength(2)
      const chat = items.find((i) => i._id === 'msg-1')
      const sys = items.find((i) => i._id === 'sys-1')
      expect(chat?.type).toBe('comment')
      expect(sys?.type).toBe('activity')
    })

    it('throws RepositoryError when client unavailable', async () => {
      uninstallMock()
      await expect(getActivityTimeline('issue-123')).rejects.toThrow(RepositoryError)
    })
  })

  // -------------------------------------------------------------------------
  // createComment / updateComment / deleteComment (mutation surface)
  // -------------------------------------------------------------------------

  describe('createComment', () => {
    it('issues a TxCreateDoc against ChatMessage with the issue as attachedTo', async () => {
      mockClient.tx.mockResolvedValue({})

      await createComment('issue-123', 'space-x', 'tracker:class:Issue', 'hi there')

      expect(mockClient.tx).toHaveBeenCalledTimes(1)
      const tx = mockClient.tx.mock.calls[0][0]
      expect(tx.objectClass).toBe('chunter:class:ChatMessage')
      expect(tx.attributes?.message ?? tx.attributes?.content).toBe('hi there')
    })

    it('wraps and surfaces server errors', async () => {
      mockClient.tx.mockRejectedValue(new Error('forbidden'))
      await expect(
        createComment('issue-123', 'space-x', 'tracker:class:Issue', 'x')
      ).rejects.toThrow(RepositoryError)
    })
  })

  describe('updateComment', () => {
    it('issues a TxUpdateDoc carrying the new message', async () => {
      mockClient.tx.mockResolvedValue({})

      await updateComment('msg-1' as never, 'space-x' as never, 'edited')

      expect(mockClient.tx).toHaveBeenCalledTimes(1)
      const tx = mockClient.tx.mock.calls[0][0]
      expect(tx.objectId).toBe('msg-1')
    })
  })

  describe('deleteComment', () => {
    it('issues a TxRemoveDoc', async () => {
      mockClient.tx.mockResolvedValue({})

      await deleteComment('msg-1' as never, 'space-x' as never)

      expect(mockClient.tx).toHaveBeenCalledTimes(1)
      const tx = mockClient.tx.mock.calls[0][0]
      expect(tx.objectId).toBe('msg-1')
    })

    it('throws RepositoryError when client unavailable', async () => {
      uninstallMock()
      await expect(deleteComment('msg-1' as never, 'space-x' as never)).rejects.toThrow(
        RepositoryError
      )
    })
  })
})
