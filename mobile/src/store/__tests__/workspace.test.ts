/**
 * Workspace store unit tests.
 *
 * Tests workspace state management, secure store persistence,
 * and restoration logic.
 */

import * as SecureStore from 'expo-secure-store'

import { useWorkspaceStore } from '../workspace'

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>

describe('workspace store', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      selectedWorkspace: null,
      workspaceUrl: null,
      workspaceEndpoint: null,
      workspaceToken: null,
    })
    jest.clearAllMocks()
  })

  it('starts with no workspace selected', () => {
    const state = useWorkspaceStore.getState()
    expect(state.selectedWorkspace).toBeNull()
    expect(state.workspaceUrl).toBeNull()
    expect(state.workspaceEndpoint).toBeNull()
    expect(state.workspaceToken).toBeNull()
  })

  it('sets workspace from WorkspaceLoginInfo', async () => {
    const info = {
      workspace: 'ws-uuid-1',
      workspaceUrl: 'my-workspace',
      endpoint: 'wss://api.huly.io',
      token: 'ws-jwt-token',
    }

    await useWorkspaceStore.getState().setWorkspace(info as never)

    const state = useWorkspaceStore.getState()
    expect(state.selectedWorkspace).toBe('ws-uuid-1')
    expect(state.workspaceUrl).toBe('my-workspace')
    expect(state.workspaceEndpoint).toBe('wss://api.huly.io')
    expect(state.workspaceToken).toBe('ws-jwt-token')

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('workspace_url', 'my-workspace')
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('workspace_id', 'ws-uuid-1')
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('workspace_token', 'ws-jwt-token')
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('workspace_endpoint', 'wss://api.huly.io')
  })

  it('clears workspace and secure store', async () => {
    useWorkspaceStore.setState({
      selectedWorkspace: 'ws-uuid-1' as never,
      workspaceUrl: 'my-workspace',
      workspaceEndpoint: 'wss://api.huly.io',
      workspaceToken: 'ws-jwt-token',
    })

    await useWorkspaceStore.getState().clearWorkspace()

    const state = useWorkspaceStore.getState()
    expect(state.selectedWorkspace).toBeNull()
    expect(state.workspaceUrl).toBeNull()
    expect(state.workspaceEndpoint).toBeNull()
    expect(state.workspaceToken).toBeNull()

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('workspace_url')
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('workspace_id')
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('workspace_token')
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('workspace_endpoint')
  })

  it('restores workspace when all four keys are present', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('stored-url')
      .mockResolvedValueOnce('stored-ws-id')
      .mockResolvedValueOnce('stored-ws-token')
      .mockResolvedValueOnce('stored-endpoint')

    await useWorkspaceStore.getState().restoreWorkspace()

    const state = useWorkspaceStore.getState()
    expect(state.selectedWorkspace).toBe('stored-ws-id')
    expect(state.workspaceUrl).toBe('stored-url')
    expect(state.workspaceToken).toBe('stored-ws-token')
    expect(state.workspaceEndpoint).toBe('stored-endpoint')
  })

  it('does not restore workspace when any key is missing', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('stored-url')
      .mockResolvedValueOnce(null) // workspace_id missing
      .mockResolvedValueOnce('stored-ws-token')
      .mockResolvedValueOnce('stored-endpoint')

    await useWorkspaceStore.getState().restoreWorkspace()

    const state = useWorkspaceStore.getState()
    expect(state.selectedWorkspace).toBeNull()
  })

  it('does not restore workspace when no keys exist', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null)

    await useWorkspaceStore.getState().restoreWorkspace()

    const state = useWorkspaceStore.getState()
    expect(state.selectedWorkspace).toBeNull()
    expect(state.workspaceUrl).toBeNull()
  })
})
