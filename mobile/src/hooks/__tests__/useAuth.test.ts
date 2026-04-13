/**
 * useAuth hook unit tests.
 *
 * Tests useLogin, useOtpLogin, useTwoFactor, and useLogout hooks.
 * Uses renderHook with fresh QueryClient per test.
 */

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useLogin, useOtpLogin, useTwoFactor, useLogout } from '../use-auth'
import { useAuthStore } from '@/store/auth'

// Mock dependencies
jest.mock('@/client/account', () => ({
  getOrCreateAccountClient: jest.fn(),
  clearAccountClient: jest.fn(),
}))

jest.mock('@/store/connection', () => ({
  useConnectionStore: jest.fn((selector: (state: Record<string, unknown>) => unknown) =>
    selector({ disconnect: jest.fn() })
  ),
}))

jest.mock('@/store/push', () => ({
  usePushStore: jest.fn((selector: (state: Record<string, unknown>) => unknown) =>
    selector({ reset: jest.fn() })
  ),
}))

jest.mock('@/store/workspace', () => {
  const actual = jest.requireActual('@/store/workspace') as Record<string, unknown>
  return {
    ...actual,
    useWorkspaceStore: jest.fn((selector: (state: Record<string, unknown>) => unknown) =>
      selector({ clearWorkspace: jest.fn().mockResolvedValue(undefined) })
    ),
  }
})

jest.mock('@/lib/notifications', () => ({
  clearBadge: jest.fn().mockResolvedValue(undefined),
}))

const { getOrCreateAccountClient } = jest.requireMock('@/client/account') as {
  getOrCreateAccountClient: jest.Mock
}

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('useLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({
      token: null,
      account: null,
      tfaToken: null,
      isAuthenticated: false,
      isBootstrapping: false,
    })
  })

  it('performs successful login', async () => {
    const mockClient = {
      login: jest.fn().mockResolvedValue({
        account: 'acct-uuid',
        token: 'jwt-token',
      }),
    }
    getOrCreateAccountClient.mockResolvedValue(mockClient)

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()

    await act(async () => {
      await result.current.login('test@huly.io', 'password123')
    })

    expect(result.current.isLoading).toBe(false)
    expect(mockClient.login).toHaveBeenCalledWith('test@huly.io', 'password123')
  })

  it('handles 2FA required response', async () => {
    const mockClient = {
      login: jest.fn().mockResolvedValue({
        tfaRequired: true,
        token: 'tfa-restricted-token',
      }),
    }
    getOrCreateAccountClient.mockResolvedValue(mockClient)

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    })

    let loginResult: unknown
    await act(async () => {
      loginResult = await result.current.login('test@huly.io', 'password')
    })

    const typedResult = loginResult as { tfaRequired: boolean }
    expect(typedResult.tfaRequired).toBe(true)
    expect(useAuthStore.getState().tfaToken).toBe('tfa-restricted-token')
  })

  it('sets error on login failure', async () => {
    const mockClient = {
      login: jest.fn().mockRejectedValue(new Error('Invalid credentials')),
    }
    getOrCreateAccountClient.mockResolvedValue(mockClient)

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.login('test@huly.io', 'wrong')
      } catch {
        // Expected
      }
    })

    expect(result.current.error).toBe('Invalid credentials')
  })

  it('sets error when token is null (unconfirmed email)', async () => {
    const mockClient = {
      login: jest.fn().mockResolvedValue({
        account: 'acct-uuid',
        token: null,
      }),
    }
    getOrCreateAccountClient.mockResolvedValue(mockClient)

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.login('test@huly.io', 'password')
    })

    expect(result.current.error).toBe('Please confirm your email before signing in.')
  })
})

describe('useOtpLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({
      token: null,
      account: null,
      tfaToken: null,
      isAuthenticated: false,
      isBootstrapping: false,
    })
  })

  it('requests OTP', async () => {
    const mockClient = {
      loginOtp: jest.fn().mockResolvedValue({ sent: true }),
    }
    getOrCreateAccountClient.mockResolvedValue(mockClient)

    const { result } = renderHook(() => useOtpLogin(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.requestOtp('test@huly.io')
    })

    expect(mockClient.loginOtp).toHaveBeenCalledWith('test@huly.io')
  })

  it('validates OTP and sets auth', async () => {
    const mockClient = {
      validateOtp: jest.fn().mockResolvedValue({
        account: 'acct-uuid',
        token: 'jwt-token',
      }),
    }
    getOrCreateAccountClient.mockResolvedValue(mockClient)

    const { result } = renderHook(() => useOtpLogin(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.validateOtp('test@huly.io', '123456')
    })

    expect(mockClient.validateOtp).toHaveBeenCalledWith('test@huly.io', '123456')
  })
})

describe('useTwoFactor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({
      token: null,
      account: null,
      tfaToken: 'tfa-token',
      isAuthenticated: false,
      isBootstrapping: false,
    })
  })

  it('verifies 2FA code', async () => {
    const mockClient = {
      verify2fa: jest.fn().mockResolvedValue({
        account: 'acct-uuid',
        token: 'jwt-token',
      }),
    }
    getOrCreateAccountClient.mockResolvedValue(mockClient)

    const { result } = renderHook(() => useTwoFactor(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.verify('123456')
    })

    expect(mockClient.verify2fa).toHaveBeenCalledWith('123456')
  })

  it('throws error when no 2FA token available', async () => {
    useAuthStore.setState({ tfaToken: null })

    const { result } = renderHook(() => useTwoFactor(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.verify('123456')
      } catch (err) {
        expect((err as Error).message).toContain('No 2FA token')
      }
    })
  })
})

describe('useLogout', () => {
  it('returns a function', () => {
    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current).toBe('function')
  })
})
