/**
 * Authentication hooks.
 *
 * - `useLogin` -- email+password login, handles 2FA redirect
 * - `useOtpLogin` -- OTP-based login (request + validate)
 * - `useTwoFactor` -- 2FA verification with TOTP code
 * - `useLogout` -- full sign-out (stores + cache + client reset)
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { LoginInfo, OtpInfo } from '@hcengineering/account-client'

import { getOrCreateAccountClient, clearAccountClient } from '@/client/account'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'

// ---------------------------------------------------------------------------
// useLogin -- email + password
// ---------------------------------------------------------------------------

export function useLogin(): {
  login: (email: string, password: string) => Promise<LoginInfo>
  isLoading: boolean
  error: string | null
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setTfaToken = useAuthStore((s) => s.setTfaToken)

  const login = useCallback(
    async (email: string, password: string): Promise<LoginInfo> => {
      setIsLoading(true)
      setError(null)
      try {
        const client = await getOrCreateAccountClient()
        const loginInfo = await client.login(email, password)

        if (loginInfo.tfaRequired === true) {
          // Store the restricted token in memory -- NOT in secure store
          if (loginInfo.token != null) {
            setTfaToken(loginInfo.token)
          }
          return loginInfo
        }

        // Server can return token: undefined for unconfirmed email identities.
        // Do NOT call setAuth() -- surface this as a distinct state.
        if (loginInfo.token == null) {
          setError('Please confirm your email before signing in.')
          return loginInfo
        }

        await setAuth(loginInfo)
        return loginInfo
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [setAuth, setTfaToken],
  )

  return { login, isLoading, error }
}

// ---------------------------------------------------------------------------
// useOtpLogin -- OTP flow (request code, then validate)
// ---------------------------------------------------------------------------

export function useOtpLogin(): {
  requestOtp: (email: string) => Promise<OtpInfo>
  validateOtp: (email: string, code: string) => Promise<LoginInfo>
  isLoading: boolean
  error: string | null
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setTfaToken = useAuthStore((s) => s.setTfaToken)

  const requestOtp = useCallback(async (email: string): Promise<OtpInfo> => {
    setIsLoading(true)
    setError(null)
    try {
      const client = await getOrCreateAccountClient()
      return await client.loginOtp(email)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const validateOtp = useCallback(
    async (email: string, code: string): Promise<LoginInfo> => {
      setIsLoading(true)
      setError(null)
      try {
        const client = await getOrCreateAccountClient()
        const loginInfo = await client.validateOtp(email, code)

        // OTP validation can also return tfaRequired — mirror useLogin() logic
        if (loginInfo.tfaRequired === true) {
          if (loginInfo.token != null) {
            setTfaToken(loginInfo.token)
          }
          return loginInfo
        }

        if (loginInfo.token == null) {
          setError('Please confirm your email before signing in.')
          return loginInfo
        }

        await setAuth(loginInfo)
        return loginInfo
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Verification failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [setAuth, setTfaToken],
  )

  return { requestOtp, validateOtp, isLoading, error }
}

// ---------------------------------------------------------------------------
// useTwoFactor -- TOTP 2FA verification
// ---------------------------------------------------------------------------

export function useTwoFactor(): {
  verify: (code: string) => Promise<LoginInfo>
  isLoading: boolean
  error: string | null
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tfaToken = useAuthStore((s) => s.tfaToken)
  const setAuth = useAuthStore((s) => s.setAuth)

  const verify = useCallback(
    async (code: string): Promise<LoginInfo> => {
      if (tfaToken == null) {
        throw new Error('No 2FA token available. Please log in first.')
      }

      setIsLoading(true)
      setError(null)
      try {
        const client = await getOrCreateAccountClient(tfaToken)
        const loginInfo = await client.verify2fa(code)
        await setAuth(loginInfo)
        return loginInfo
      } catch (err) {
        const message = err instanceof Error ? err.message : '2FA verification failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [tfaToken, setAuth],
  )

  return { verify, isLoading, error }
}

// ---------------------------------------------------------------------------
// useLogout -- full sign-out
// ---------------------------------------------------------------------------

export function useLogout(): () => Promise<void> {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace)
  const queryClient = useQueryClient()

  return useCallback(async () => {
    queryClient.clear()
    clearAccountClient()
    await clearWorkspace()
    await clearAuth()
  }, [clearAuth, clearWorkspace, queryClient])
}
