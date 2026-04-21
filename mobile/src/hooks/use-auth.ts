/**
 * Authentication hooks.
 *
 * - `useLogin` -- email+password login, handles 2FA redirect
 * - `useOtpLogin` -- OTP-based login (request + validate)
 * - `useTwoFactor` -- 2FA verification with TOTP code
 * - `useOAuthLogin` -- Google OAuth via universal-link capture
 * - `useLogout` -- full sign-out (stores + cache + client reset)
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { LoginInfo, OtpInfo } from '@hcengineering/account-client'
import * as LocalAuthentication from 'expo-local-authentication'

import { getOrCreateAccountClient, clearAccountClient } from '@/client/account'
import { clearConfig } from '@/client/config'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { useConnectionStore } from '@/store/connection'
import { usePushStore } from '@/store/push'
import { clearBadge } from '@/lib/notifications'

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
// useOAuthLogin -- social login (Google via universal-link capture)
// ---------------------------------------------------------------------------

/**
 * Validates a JWT-shaped string (three base64url segments separated by dots).
 * This is a syntactic check only — signature verification happens server-side
 * when the token is exchanged for a `LoginInfo`.
 */
export function isJwtShaped(token: string): boolean {
  if (token.length === 0) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const base64urlSegment = /^[A-Za-z0-9_-]+$/
  return parts.every((part) => part.length > 0 && base64urlSegment.test(part))
}

/**
 * Consume a JWT captured via the `/login/auth?token=<jwt>` universal link.
 *
 * Hydrates a full `LoginInfo` via `getLoginInfoByToken()` (the store's
 * `setAuth` requires `LoginInfo`, not a bare JWT) and persists it.
 */
export function useOAuthLogin(): {
  loginWithToken: (token: string) => Promise<LoginInfo>
  isLoading: boolean
  error: string | null
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAuthStore((s) => s.setAuth)

  const loginWithToken = useCallback(
    async (token: string): Promise<LoginInfo> => {
      setIsLoading(true)
      setError(null)
      try {
        if (!isJwtShaped(token)) {
          throw new Error('Invalid OAuth token')
        }
        const client = await getOrCreateAccountClient(token)
        const info = await client.getLoginInfoByToken()

        if (info == null || typeof info !== 'object' || !('account' in info)) {
          throw new Error('OAuth token rejected by server')
        }

        const loginInfo = info as LoginInfo
        if (loginInfo.token == null) {
          throw new Error('OAuth login info missing token')
        }

        await setAuth(loginInfo)
        return loginInfo
      } catch (err) {
        const message = err instanceof Error ? err.message : 'OAuth login failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [setAuth],
  )

  return { loginWithToken, isLoading, error }
}

// ---------------------------------------------------------------------------
// useBiometricAuth -- opt-in Face ID / Touch ID unlock
// ---------------------------------------------------------------------------

export type BiometricStatus =
  | 'available' // hardware + enrolled
  | 'no-hardware' // device has no biometric sensor
  | 'not-enrolled' // sensor present, user has not enrolled any biometry
  | 'lockout' // OS temporarily locked biometry after repeated failures

export interface BiometricAttemptResult {
  status: 'success' | BiometricStatus | 'failed' | 'cancel'
  error?: string
}

/**
 * Returns the current biometric availability on the device. See the plan's
 * failure-modes table for each return value's meaning.
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync()
  if (!hasHardware) return 'no-hardware'
  const enrolled = await LocalAuthentication.isEnrolledAsync()
  if (!enrolled) return 'not-enrolled'
  return 'available'
}

/**
 * Biometric auth hook.
 *
 * `promptIfNeeded()` runs the OS biometric prompt and resolves with a tagged
 * status the caller can branch on. It never throws — every failure mode is
 * surfaced via the status union. This matches the plan's requirement to
 * keep password fallback paths working without try/catch sprawl in screens.
 */
export function useBiometricAuth(): {
  promptIfNeeded: (reason: string) => Promise<BiometricAttemptResult>
  isLoading: boolean
} {
  const [isLoading, setIsLoading] = useState(false)
  const setBiometricLocked = useAuthStore((s) => s.setBiometricLocked)
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled)

  const promptIfNeeded = useCallback(
    async (reason: string): Promise<BiometricAttemptResult> => {
      setIsLoading(true)
      try {
        const status = await getBiometricStatus()
        if (status !== 'available') {
          // Hardware missing or biometry revoked in OS Settings. Clear the
          // opt-in flag so we don't loop on the next launch, and surface
          // the status so the caller can fall back to password login.
          if (status === 'not-enrolled') {
            await setBiometricEnabled(false)
          }
          setBiometricLocked(false)
          return { status }
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: reason,
          disableDeviceFallback: false,
          cancelLabel: 'Cancel',
        })

        if (result.success) {
          setBiometricLocked(false)
          return { status: 'success' }
        }

        // `result.error` is a lowercase-kebab string per expo-local-authentication.
        const errCode = 'error' in result ? result.error : undefined
        if (errCode === 'user_cancel' || errCode === 'system_cancel' || errCode === 'app_cancel') {
          return { status: 'cancel' }
        }
        if (errCode === 'lockout') {
          // OS lockout — do not retry the biometric prompt in a loop.
          return { status: 'lockout', error: errCode }
        }
        return { status: 'failed', error: errCode }
      } finally {
        setIsLoading(false)
      }
    },
    [setBiometricLocked, setBiometricEnabled],
  )

  return { promptIfNeeded, isLoading }
}

// ---------------------------------------------------------------------------
// useLogout -- full sign-out
// ---------------------------------------------------------------------------

export function useLogout(): () => Promise<void> {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace)
  const disconnect = useConnectionStore((s) => s.disconnect)
  const resetPush = usePushStore((s) => s.reset)
  const queryClient = useQueryClient()

  return useCallback(async () => {
    // Deregister push token BEFORE disconnecting (needs client to call API)
    try {
      const token = usePushStore.getState().expoPushToken
      if (token != null) {
        const { deregisterPushToken } = await import('@/repositories/push')
        await deregisterPushToken(token)
      }
    } catch {
      // Non-fatal — stale subscription will expire server-side
    }

    queryClient.clear()
    disconnect()
    clearAccountClient()
    clearConfig()
    resetPush()
    await clearBadge()
    await clearWorkspace()
    await clearAuth()
  }, [clearAuth, clearWorkspace, disconnect, resetPush, queryClient])
}
