/**
 * Members repository unit tests.
 *
 * Tests inviteMember, updateMemberRole, removeMember (admin-critical
 * surfaces) — verifies they all go through the workspace-scoped
 * AccountClient and that the auth gate fires when no token is available.
 *
 * getMembers / getMember are read-only HulyClient queries and are
 * exercised separately via the chat/tracker integration paths.
 */

import {
  inviteMember,
  updateMemberRole,
  removeMember,
} from '../members'
import { RepositoryError } from '../base'

const mockSendInvite = jest.fn().mockResolvedValue(undefined)
const mockUpdateRole = jest.fn().mockResolvedValue(undefined)
const mockLeaveWorkspace = jest.fn().mockResolvedValue(undefined)

const mockAccountClient = {
  sendInvite: mockSendInvite,
  updateWorkspaceRole: mockUpdateRole,
  leaveWorkspace: mockLeaveWorkspace,
}

jest.mock('@/client/account', () => ({
  getOrCreateAccountClient: jest.fn(async () => mockAccountClient),
}))

let mockWorkspaceToken: string | null = 'ws-jwt-token'

jest.mock('@/store/workspace', () => ({
  useWorkspaceStore: {
    getState: () => ({
      workspaceToken: mockWorkspaceToken,
      selectedWorkspace: 'ws-1',
    }),
  },
}))

describe('members repository', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWorkspaceToken = 'ws-jwt-token'
  })

  // -------------------------------------------------------------------------
  // inviteMember
  // -------------------------------------------------------------------------

  describe('inviteMember', () => {
    it('calls AccountClient.sendInvite with the email and role', async () => {
      await inviteMember('alice@example.com', 'USER' as never)

      expect(mockSendInvite).toHaveBeenCalledTimes(1)
      expect(mockSendInvite).toHaveBeenCalledWith('alice@example.com', 'USER')
    })

    it('throws RepositoryError when no workspace token is available (auth gate)', async () => {
      mockWorkspaceToken = null
      await expect(inviteMember('alice@example.com', 'USER' as never)).rejects.toThrow(
        RepositoryError
      )
      expect(mockSendInvite).not.toHaveBeenCalled()
    })

    it('wraps server errors via wrapRepositoryError (e.g. invalid email, duplicate)', async () => {
      mockSendInvite.mockRejectedValueOnce(new Error('email already invited'))
      await expect(inviteMember('alice@example.com', 'USER' as never)).rejects.toThrow(
        RepositoryError
      )
    })
  })

  // -------------------------------------------------------------------------
  // updateMemberRole
  // -------------------------------------------------------------------------

  describe('updateMemberRole', () => {
    it('calls AccountClient.updateWorkspaceRole with target + role', async () => {
      await updateMemberRole('account-uuid-1', 'MAINTAINER' as never)

      expect(mockUpdateRole).toHaveBeenCalledTimes(1)
      expect(mockUpdateRole).toHaveBeenCalledWith('account-uuid-1', 'MAINTAINER')
    })

    it('throws RepositoryError when not authenticated', async () => {
      mockWorkspaceToken = null
      await expect(
        updateMemberRole('account-uuid-1', 'MAINTAINER' as never)
      ).rejects.toThrow(RepositoryError)
      expect(mockUpdateRole).not.toHaveBeenCalled()
    })

    it('propagates last-owner-demotion server rejection (must surface to UI)', async () => {
      mockUpdateRole.mockRejectedValueOnce(new Error('Cannot demote last owner'))
      await expect(updateMemberRole('account-uuid-1', 'USER' as never)).rejects.toThrow(
        RepositoryError
      )
    })
  })

  // -------------------------------------------------------------------------
  // removeMember
  // -------------------------------------------------------------------------

  describe('removeMember', () => {
    it('calls AccountClient.leaveWorkspace with the target account uuid', async () => {
      await removeMember('account-uuid-1' as never)

      expect(mockLeaveWorkspace).toHaveBeenCalledTimes(1)
      expect(mockLeaveWorkspace).toHaveBeenCalledWith('account-uuid-1')
    })

    it('throws RepositoryError when not authenticated', async () => {
      mockWorkspaceToken = null
      await expect(removeMember('account-uuid-1' as never)).rejects.toThrow(
        RepositoryError
      )
      expect(mockLeaveWorkspace).not.toHaveBeenCalled()
    })

    it('propagates server rejection (e.g. cannot remove last owner / cannot remove self)', async () => {
      mockLeaveWorkspace.mockRejectedValueOnce(new Error('Cannot remove last owner'))
      await expect(removeMember('account-uuid-1' as never)).rejects.toThrow(
        RepositoryError
      )
    })
  })
})
