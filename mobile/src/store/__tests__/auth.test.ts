/**
 * Auth store unit tests.
 *
 * Tests authentication state transitions, secure store persistence,
 * 2FA token handling, and session restoration.
 */

import * as SecureStore from 'expo-secure-store'

import { useAuthStore } from '../auth'

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>

// Mock the dynamic import of account client used in restoreAuth
jest.mock('@/client/account', () => ({
  getOrCreateAccountClient: jest.fn().mockResolvedValue({
    getLoginInfoByToken: jest.fn().mockResolvedValue({
      account: 'mock-account-uuid',
      token: 'mock-jwt-token',
    }),
  }),
}))

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      account: null,
      tfaToken: null,
      isAuthenticated: false,
      isBootstrapping: true,
    })
    jest.clearAllMocks()
  })

  it('starts unauthenticated with bootstrapping true', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.account).toBeNull()
    expect(state.isBootstrapping).toBe(true)
  })

  it('sets auth from login info', async () => {
    const loginInfo = {
      account: 'test-account-uuid' as string,
      token: 'test-jwt-token',
    }

    await useAuthStore.getState().setAuth(loginInfo as never)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('test-jwt-token')
    expect(state.account).toBe('test-account-uuid')
    expect(state.tfaToken).toBeNull()

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'test-jwt-token')
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('account_id', 'test-account-uuid')
  })

  it('throws when login info has no token', async () => {
    const loginInfo = {
      account: 'test-account-uuid',
      token: null,
    }

    await expect(useAuthStore.getState().setAuth(loginInfo as never)).rejects.toThrow(
      'Login response missing token'
    )
  })

  it('clears tfaToken when setting full auth', async () => {
    useAuthStore.setState({ tfaToken: 'some-tfa-token' })

    await useAuthStore.getState().setAuth({
      account: 'test-account-uuid',
      token: 'test-jwt-token',
    } as never)

    expect(useAuthStore.getState().tfaToken).toBeNull()
  })

  it('sets transient 2FA token', () => {
    useAuthStore.getState().setTfaToken('tfa-restricted-token')

    const state = useAuthStore.getState()
    expect(state.tfaToken).toBe('tfa-restricted-token')
    // Should NOT write to secure store
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled()
  })

  it('clears auth on logout', async () => {
    useAuthStore.setState({
      token: 'token',
      account: 'acct' as never,
      isAuthenticated: true,
    })

    await useAuthStore.getState().clearAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.account).toBeNull()
    expect(state.tfaToken).toBeNull()

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token')
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('account_id')
  })

  it('restores auth from secure store when token is valid', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('stored-token')
      .mockResolvedValueOnce('stored-account')

    await useAuthStore.getState().restoreAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('stored-token')
    expect(state.account).toBe('stored-account')
    expect(state.isBootstrapping).toBe(false)
  })

  it('clears state when no stored token exists', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null)

    await useAuthStore.getState().restoreAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isBootstrapping).toBe(false)
  })

  it('clears state when stored token validation fails', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('stored-account')

    // Override the mock to simulate token validation failure
    const accountMod = jest.requireMock('@/client/account') as {
      getOrCreateAccountClient: jest.Mock
    }
    accountMod.getOrCreateAccountClient.mockResolvedValueOnce({
      getLoginInfoByToken: jest.fn().mockRejectedValue(new Error('Token expired')),
    })

    await useAuthStore.getState().restoreAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isBootstrapping).toBe(false)

    // Should have cleaned up all secure store keys
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token')
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('workspace_url')
  })
})
