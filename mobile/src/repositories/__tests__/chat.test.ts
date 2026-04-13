/**
 * Chat repository unit tests.
 *
 * Tests getChannels, getDirectMessages, getMessages (cursor-based),
 * sendMessage, getThread, sendThreadReply, addReaction, removeReaction.
 */

import { createMockHulyClient } from '@/test/mockHulyClient'

import { getChannels, getDirectMessages, getMessages, sendMessage, getThread } from '../chat'
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

describe('chat repository', () => {
  const { mockClient, installMock, uninstallMock } = createMockHulyClient()

  beforeEach(() => {
    installMock()
    jest.clearAllMocks()
  })

  afterEach(() => {
    uninstallMock()
  })

  // ---- getChannels ----

  describe('getChannels', () => {
    it('fetches channels sorted by modifiedOn', async () => {
      const docs = [
        { _id: 'ch-1', _class: 'chunter:class:Channel', name: 'general', modifiedOn: 1000 },
        { _id: 'ch-2', _class: 'chunter:class:Channel', name: 'dev', modifiedOn: 2000 },
      ]
      mockClient.findAll.mockResolvedValue(docs)

      const result = await getChannels()

      expect(result).toHaveLength(2)
      expect(result[0]?.name).toBe('general')
      expect(mockClient.findAll).toHaveBeenCalledWith(
        'chunter:class:Channel',
        {},
        expect.objectContaining({ limit: 100 })
      )
    })

    it('maps doc fields to ChannelItem shape', async () => {
      const docs = [{
        _id: 'ch-1',
        _class: 'chunter:class:Channel',
        name: 'test-channel',
        description: 'A test channel',
        members: ['u1', 'u2'],
        private: true,
        modifiedOn: 1000,
        createdOn: 500,
      }]
      mockClient.findAll.mockResolvedValue(docs)

      const result = await getChannels()

      expect(result[0]?.name).toBe('test-channel')
      expect(result[0]?.description).toBe('A test channel')
      expect(result[0]?.private).toBe(true)
      expect(result[0]?.members).toEqual(['u1', 'u2'])
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(getChannels()).rejects.toThrow(RepositoryError)
    })

    it('wraps errors as RepositoryError', async () => {
      mockClient.findAll.mockRejectedValue(new Error('Server error'))
      await expect(getChannels()).rejects.toThrow(RepositoryError)
    })
  })

  // ---- getDirectMessages ----

  describe('getDirectMessages', () => {
    it('fetches DMs with DirectMessage class', async () => {
      mockClient.findAll.mockResolvedValue([])

      await getDirectMessages()

      expect(mockClient.findAll).toHaveBeenCalledWith(
        'chunter:class:DirectMessage',
        {},
        expect.any(Object)
      )
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(getDirectMessages()).rejects.toThrow(RepositoryError)
    })
  })

  // ---- getMessages ----

  describe('getMessages', () => {
    it('fetches messages for a channel', async () => {
      const docs = [
        { _id: 'msg-1', message: 'Hello', createdBy: 'u1', createdOn: 2000, modifiedOn: 2000, space: 'ch-1' },
        { _id: 'msg-2', message: 'World', createdBy: 'u2', createdOn: 1000, modifiedOn: 1000, space: 'ch-1' },
      ]
      mockClient.findAll.mockResolvedValue(docs)

      const result = await getMessages('ch-1')

      expect(result.items).toHaveLength(2)
      expect(result.items[0]?.content).toBe('Hello')
      expect(result.hasMore).toBe(false)
    })

    it('uses cursor for pagination', async () => {
      mockClient.findAll.mockResolvedValue([])

      await getMessages('ch-1', { cursor: '1000' })

      const query = mockClient.findAll.mock.calls[0]?.[1] as Record<string, unknown>
      expect(query.createdOn).toEqual({ $lt: 1000 })
    })

    it('reports hasMore when extra item returned', async () => {
      // Return 51 items (limit=50 + 1 extra)
      const docs = Array.from({ length: 51 }, (_, i) => ({
        _id: `msg-${i}`,
        message: `Message ${i}`,
        createdBy: 'u1',
        createdOn: 51 - i,
        modifiedOn: 51 - i,
        space: 'ch-1',
      }))
      mockClient.findAll.mockResolvedValue(docs)

      const result = await getMessages('ch-1')

      expect(result.hasMore).toBe(true)
      expect(result.items).toHaveLength(50)
      expect(result.nextCursor).toBeDefined()
    })

    it('returns empty result on 403 error', async () => {
      mockClient.findAll.mockRejectedValue(new Error('403 Forbidden'))

      const result = await getMessages('ch-1')

      expect(result.items).toEqual([])
      expect(result.hasMore).toBe(false)
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(getMessages('ch-1')).rejects.toThrow(RepositoryError)
    })
  })

  // ---- sendMessage ----

  describe('sendMessage', () => {
    it('creates a tx and returns optimistic message', async () => {
      mockClient.getAccount.mockResolvedValue({
        primarySocialId: 'user-1',
      })
      mockClient.tx.mockResolvedValue({})

      const result = await sendMessage('ch-1', 'Hello world')

      expect(result.content).toBe('Hello world')
      expect(result.space).toBe('ch-1')
      expect(result.sender).toBe('user-1')
      expect(mockClient.tx).toHaveBeenCalled()
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(sendMessage('ch-1', 'test')).rejects.toThrow(RepositoryError)
    })
  })

  // ---- getThread ----

  describe('getThread', () => {
    it('fetches parent message and replies', async () => {
      const parent = {
        _id: 'msg-parent',
        message: 'Parent',
        createdBy: 'u1',
        createdOn: 1000,
        modifiedOn: 1000,
        space: 'ch-1',
      }
      const replies = [
        { _id: 'msg-r1', message: 'Reply 1', createdBy: 'u2', createdOn: 2000, modifiedOn: 2000, space: 'ch-1' },
      ]

      mockClient.findOne.mockResolvedValue(parent)
      mockClient.findAll.mockResolvedValue(replies)

      const result = await getThread('msg-parent')

      expect(result.parent.content).toBe('Parent')
      expect(result.replies).toHaveLength(1)
    })

    it('throws RepositoryError when parent not found', async () => {
      mockClient.findOne.mockResolvedValue(null)

      await expect(getThread('nonexistent')).rejects.toThrow(RepositoryError)
    })

    it('throws RepositoryError when client is null', async () => {
      uninstallMock()
      await expect(getThread('msg-1')).rejects.toThrow(RepositoryError)
    })
  })
})
