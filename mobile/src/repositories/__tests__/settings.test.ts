/**
 * Settings repository unit tests.
 *
 * Tests getProfile, getWorkspaceInfo, getWorkspaces, switchWorkspace.
 * Uses mock AccountClient via @hcengineering/account-client mock.
 */

import { mockAccountClient } from '@/../../src/__mocks__/@hcengineering/account-client'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { RepositoryError } from '../base'

import { getProfile, getWorkspaceInfo, getWorkspaces, switchWorkspace } from '../settings'

// Mock the account module to return our mock client
jest.mock('@/client/account', () => ({
  getOrCreateAccountClient: jest.fn().mockImplementation(() => {
    return Promise.resolve(mockAccountClient)
  }),
}))

// Mock the client module
jest.mock('@/client', () => ({
  getClient: jest.fn().mockReturnValue(null),
  setClient: jest.fn(),
  clearClient: jest.fn(),
}))

describe('settings repository', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up authenticated state for tests that need it
    useAuthStore.setState({
      token: 'test-token',
      account: 'test-account' as never,
      isAuthenticated: true,
      isBootstrapping: false,
      tfaToken: null,
    })
    useWorkspaceStore.setState({
      selectedWorkspace: 'ws-1' as never,
      workspaceUrl: 'test-ws',
      workspaceEndpoint: 'wss://test',
      workspaceToken: 'ws-token',
    })
  })

  // ---- getProfile ----

  describe('getProfile', () => {
    it('returns user profile with name and email', async () => {
      mockAccountClient.getPerson.mockResolvedValue({
        firstName: 'Alice',
        lastName: 'Smith',
      })
      mockAccountClient.getSocialIds.mockResolvedValue([
        { type: 'email', value: 'alice@huly.io' },
      ])

      const profile = await getProfile()

      expect(profile.firstName).toBe('Alice')
      expect(profile.lastName).toBe('Smith')
      expect(profile.email).toBe('alice@huly.io')
    })

    it('returns null email when no email social ID exists', async () => {
      mockAccountClient.getPerson.mockResolvedValue({
        firstName: 'Bob',
        lastName: 'Jones',
      })
      mockAccountClient.getSocialIds.mockResolvedValue([
        { type: 'github', value: 'bobjones' },
      ])

      const profile = await getProfile()

      expect(profile.email).toBeNull()
    })

    it('throws RepositoryError when not authenticated', async () => {
      useAuthStore.setState({ token: null })
      await expect(getProfile()).rejects.toThrow(RepositoryError)
    })

    it('wraps API errors as RepositoryError', async () => {
      mockAccountClient.getPerson.mockRejectedValue(new Error('Network error'))
      await expect(getProfile()).rejects.toThrow(RepositoryError)
    })
  })

  // ---- getWorkspaceInfo ----

  describe('getWorkspaceInfo', () => {
    it('returns workspace details', async () => {
      mockAccountClient.getWorkspaceInfo.mockResolvedValue({
        name: 'My Workspace',
        url: 'my-ws',
      })
      mockAccountClient.getWorkspaceMembers.mockResolvedValue([
        { person: 'u1' },
        { person: 'u2' },
      ])

      const info = await getWorkspaceInfo()

      expect(info.name).toBe('My Workspace')
      expect(info.url).toBe('my-ws')
      expect(info.memberCount).toBe(2)
    })

    it('throws RepositoryError when no workspace token', async () => {
      useWorkspaceStore.setState({ workspaceToken: null })
      useAuthStore.setState({ token: null })
      await expect(getWorkspaceInfo()).rejects.toThrow(RepositoryError)
    })
  })

  // ---- getWorkspaces ----

  describe('getWorkspaces', () => {
    it('returns workspaces sorted by lastVisit descending', async () => {
      mockAccountClient.getUserWorkspaces.mockResolvedValue([
        { name: 'Old', lastVisit: 100 },
        { name: 'Recent', lastVisit: 300 },
        { name: 'Middle', lastVisit: 200 },
      ])

      const workspaces = await getWorkspaces()

      expect(workspaces[0]?.name).toBe('Recent')
      expect(workspaces[1]?.name).toBe('Middle')
      expect(workspaces[2]?.name).toBe('Old')
    })

    it('throws RepositoryError when not authenticated', async () => {
      useAuthStore.setState({ token: null })
      await expect(getWorkspaces()).rejects.toThrow(RepositoryError)
    })
  })

  // ---- switchWorkspace ----

  describe('switchWorkspace', () => {
    it('returns WorkspaceLoginInfo from AccountClient', async () => {
      mockAccountClient.selectWorkspace.mockResolvedValue({
        workspace: 'ws-new',
        workspaceUrl: 'new-ws',
        endpoint: 'wss://new',
        token: 'new-token',
      })

      const result = await switchWorkspace('new-ws')

      expect(result.workspace).toBe('ws-new')
      expect(result.token).toBe('new-token')
      expect(mockAccountClient.selectWorkspace).toHaveBeenCalledWith('new-ws')
    })

    it('throws RepositoryError when not authenticated', async () => {
      useAuthStore.setState({ token: null })
      await expect(switchWorkspace('ws')).rejects.toThrow(RepositoryError)
    })
  })
})
