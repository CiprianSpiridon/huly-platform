/**
 * Attachment repository unit tests.
 *
 * Tests getAttachments mapper field-capture order (the _id field MUST be
 * captured into the new `_id` slot BEFORE the blobId fallback chain reads
 * it — otherwise a delete tx would target a blob URI instead of the doc),
 * deleteAttachment tx shape, and the URL builders.
 */

import { createMockHulyClient } from '@/test/mockHulyClient'

import {
  getAttachments,
  deleteAttachment,
  getAuthenticatedFileUrl,
  getAuthenticatedThumbnailUrl,
} from '../attachment'
import { RepositoryError } from '../base'

jest.mock('@/client', () => {
  let _client: unknown = null
  return {
    getClient: () => _client,
    setClient: (c: unknown) => { _client = c },
    clearClient: () => { _client = null },
  }
})

// Stub config + workspace for URL builders that read them
jest.mock('@/client/config', () => ({
  getConfig: () => ({ FILES_URL: 'https://files.test/api' }),
  getServerUrl: () => 'https://huly.test',
  loadServerConfig: jest.fn(),
}))

jest.mock('@/store/workspace', () => ({
  useWorkspaceStore: {
    getState: () => ({
      selectedWorkspace: 'ws-1',
      workspaceToken: 'tok',
      workspaceEndpoint: null,
    }),
  },
}))

describe('attachment repository', () => {
  const { mockClient, installMock, uninstallMock } = createMockHulyClient()

  beforeEach(() => {
    installMock()
    jest.clearAllMocks()
  })

  afterEach(() => {
    uninstallMock()
  })

  // -------------------------------------------------------------------------
  // getAttachments — mapper field-capture order is the safety-critical bit
  // -------------------------------------------------------------------------

  describe('getAttachments', () => {
    it('captures record._id into the dedicated _id field, independent of blobId fallback', async () => {
      // Record where neither `file` nor `uuid` is set — the blobId fallback
      // chain WILL read `record._id`. The mapper must still preserve `_id`
      // as the doc identity for downstream TxRemoveDoc.
      mockClient.findAll.mockResolvedValue([
        {
          _id: 'att-doc-1',
          _class: 'attachment:class:Attachment',
          space: 'space-x',
          attachedTo: 'issue-123',
          name: 'photo.png',
          size: 1024,
          contentType: 'image/png',
          modifiedOn: 1000,
        },
      ])

      const result = await getAttachments('issue-123')

      expect(result).toHaveLength(1)
      const att = result[0]!
      // Doc identity preserved for TxRemoveDoc
      expect(att._id).toBe('att-doc-1')
      expect(att.space).toBe('space-x')
      expect(att.attachedTo).toBe('issue-123')
      // blobId fell back to _id (no file/uuid present), but the dedicated
      // _id field is unaffected by that fallback
      expect(att.blobId).toBe('att-doc-1')
    })

    it('keeps _id and blobId distinct when file is set', async () => {
      mockClient.findAll.mockResolvedValue([
        {
          _id: 'att-doc-1',
          _class: 'attachment:class:Attachment',
          file: 'blob-storage-uuid-xyz',
          space: 'space-x',
          attachedTo: 'issue-123',
          name: 'doc.pdf',
        },
      ])

      const [att] = await getAttachments('issue-123')

      expect(att?._id).toBe('att-doc-1')
      expect(att?.blobId).toBe('blob-storage-uuid-xyz')
    })

    it('preserves space and attachedTo even when missing on the record (empty string fallback)', async () => {
      mockClient.findAll.mockResolvedValue([
        {
          _id: 'att-doc-1',
          name: 'orphan.txt',
        },
      ])

      const [att] = await getAttachments('issue-123')

      // The mapper uses String(record.space ?? '') — should produce '' not undefined
      expect(typeof att?.space).toBe('string')
      expect(typeof att?.attachedTo).toBe('string')
    })

    it('throws when client unavailable', async () => {
      uninstallMock()
      await expect(getAttachments('issue-123')).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // deleteAttachment — must use _id (not blobId) for TxRemoveDoc identity
  // -------------------------------------------------------------------------

  describe('deleteAttachment', () => {
    it('issues a TxRemoveDoc against attachment:class:Attachment using _id', async () => {
      mockClient.tx.mockResolvedValue({})

      await deleteAttachment({
        _id: 'att-doc-1' as never,
        space: 'space-x' as never,
        attachedTo: 'issue-123' as never,
      })

      expect(mockClient.tx).toHaveBeenCalledTimes(1)
      const tx = mockClient.tx.mock.calls[0][0]
      expect(tx.objectClass).toBe('attachment:class:Attachment')
      expect(tx.objectId).toBe('att-doc-1')
      expect(tx.objectSpace).toBe('space-x')
    })

    it('throws RepositoryError when client unavailable', async () => {
      uninstallMock()
      await expect(
        deleteAttachment({
          _id: 'att-doc-1' as never,
          space: 'space-x' as never,
          attachedTo: 'issue-123' as never,
        })
      ).rejects.toThrow(RepositoryError)
    })

    it('propagates server errors via wrapRepositoryError (no silent success)', async () => {
      mockClient.tx.mockRejectedValue(new Error('not found'))

      await expect(
        deleteAttachment({
          _id: 'att-doc-1' as never,
          space: 'space-x' as never,
          attachedTo: 'issue-123' as never,
        })
      ).rejects.toThrow(RepositoryError)
    })
  })

  // -------------------------------------------------------------------------
  // URL builders — pure functions, no client interaction
  // -------------------------------------------------------------------------

  describe('URL builders', () => {
    it('produces a workspace-scoped file URL', () => {
      const url = getAuthenticatedFileUrl('blob-1')
      expect(url).toContain('blob-1')
    })

    it('produces a workspace-scoped thumbnail URL', () => {
      const url = getAuthenticatedThumbnailUrl('blob-1')
      expect(url).toContain('blob-1')
    })
  })
})
