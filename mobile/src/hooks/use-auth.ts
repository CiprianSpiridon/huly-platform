/**
 * Authentication hooks.
 *
 * - `useLogin` -- email+password login, handles 2FA redirect
 * - `useOtpLogin` -- OTP-based login (request + validate)
 * - `useTwoFactor` -- 2FA verification with TOTP code
 * - `useOAuthLogin` -- Google OAuth via universal-link capture
 * - `useLogout` -- full sign-out (stores + cache + client reset)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { LoginInfo, OtpInfo } from '@hcengineering/account-client'
import * as LocalAuthentication from 'expo-local-authentication'

/**
 * Throws `AbortError` if the provided signal is already aborted. Used to
 * bail out of async auth flows before making an expensive network call.
 */
function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    const err = new Error('Auth request aborted')
    err.name = 'AbortError'
    throw err
  }
}

/**
 * Track in-flight auth AbortControllers at module scope so `useLogout`
 * can cancel them before tearing down the stores. Each controller is
 * removed automatically on resolution/rejection by `registerAuthAbort`.
 */
const liveAuthAborts = new Set<AbortController>()

function registerAuthAbort(): AbortController {
  const ctrl = new AbortController()
  liveAuthAborts.add(ctrl)
  return ctrl
}

function releaseAuthAbort(ctrl: AbortController): void {
  liveAuthAborts.delete(ctrl)
}

/** Aborts every currently in-flight auth call. Called on logout. */
export function cancelAllAuthRequests(reason: string = 'logout'): void {
  for (const ctrl of liveAuthAborts) {
    try { ctrl.abort(reason) } catch { /* noop */ }
  }
  liveAuthAborts.clear()
}

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
  login: (email: string, password: string, signal?: AbortSignal) => Promise<LoginInfo>
  isLoading: boolean
  error: string | null
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setTfaToken = useAuthStore((s) => s.setTfaToken)
  const controllerRef = useRef<AbortController | null>(null)

  // Cancel any in-flight login when the component unmounts.
  useEffect(() => {
    return () => {
      const ctrl = controllerRef.current
      if (ctrl != null) {
        try { ctrl.abort('unmount') } catch { /* noop */ }
        releaseAuthAbort(ctrl)
        controllerRef.current = null
      }
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string, signal?: AbortSignal): Promise<LoginInfo> => {
      const ctrl = registerAuthAbort()
      controllerRef.current = ctrl
      if (signal != null) {
        if (signal.aborted) ctrl.abort(signal.reason)
        else signal.addEventListener('abort', () => { ctrl.abort(signal.reason) }, { once: true })
      }

      setIsLoading(true)
      setError(null)
      try {
        throwIfAborted(ctrl.signal)
        const client = await getOrCreateAccountClient()
        const loginInfo = await client.login(email, password)
        throwIfAborted(ctrl.signal)

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
        releaseAuthAbort(ctrl)
        if (controllerRef.current === ctrl) controllerRef.current = null
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

export type OtpOrigin = 'login' | 'signup'

export function useOtpLogin(): {
  requestOtp: (email: string, signal?: AbortSignal, origin?: OtpOrigin) => Promise<OtpInfo>
  validateOtp: (email: string, code: string, signal?: AbortSignal) => Promise<LoginInfo>
  isLoading: boolean
  error: string | null
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setTfaToken = useAuthStore((s) => s.setTfaToken)
  const activeRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      const ctrl = activeRef.current
      if (ctrl != null) {
        try { ctrl.abort('unmount') } catch { /* noop */ }
        releaseAuthAbort(ctrl)
        activeRef.current = null
      }
    }
  }, [])

  const requestOtp = useCallback(
    async (email: string, signal?: AbortSignal, origin: OtpOrigin = 'login'): Promise<OtpInfo> => {
      const ctrl = registerAuthAbort()
      activeRef.current = ctrl
      if (signal != null) {
        if (signal.aborted) ctrl.abort(signal.reason)
        else signal.addEventListener('abort', () => { ctrl.abort(signal.reason) }, { once: true })
      }
      setIsLoading(true)
      setError(null)
      try {
        throwIfAborted(ctrl.signal)
        const client = await getOrCreateAccountClient()
        // Signup flows must resend via signUpOtp so the server knows to
        // rotate the pending confirmation code for a not-yet-confirmed
        // identity. loginOtp is strictly for existing confirmed accounts.
        return origin === 'signup'
          ? await client.signUpOtp(email, '', '')
          : await client.loginOtp(email)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send OTP'
        setError(message)
        throw err
      } finally {
        releaseAuthAbort(ctrl)
        if (activeRef.current === ctrl) activeRef.current = null
        setIsLoading(false)
      }
    },
    [],
  )

  const validateOtp = useCallback(
    async (email: string, code: string, signal?: AbortSignal): Promise<LoginInfo> => {
      const ctrl = registerAuthAbort()
      activeRef.current = ctrl
      if (signal != null) {
        if (signal.aborted) ctrl.abort(signal.reason)
        else signal.addEventListener('abort', () => { ctrl.abort(signal.reason) }, { once: true })
      }
      setIsLoading(true)
      setError(null)
      try {
        throwIfAborted(ctrl.signal)
        const client = await getOrCreateAccountClient()
        const loginInfo = await client.validateOtp(email, code)
        throwIfAborted(ctrl.signal)

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
        releaseAuthAbort(ctrl)
        if (activeRef.current === ctrl) activeRef.current = null
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
  verify: (code: string, signal?: AbortSignal) => Promise<LoginInfo>
  isLoading: boolean
  error: string | null
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tfaToken = useAuthStore((s) => s.tfaToken)
  const setAuth = useAuthStore((s) => s.setAuth)
  const activeRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      const ctrl = activeRef.current
      if (ctrl != null) {
        try { ctrl.abort('unmount') } catch { /* noop */ }
        releaseAuthAbort(ctrl)
        activeRef.current = null
      }
    }
  }, [])

  const verify = useCallback(
    async (code: string, signal?: AbortSignal): Promise<LoginInfo> => {
      if (tfaToken == null) {
        throw new Error('No 2FA token available. Please log in first.')
      }

      const ctrl = registerAuthAbort()
      activeRef.current = ctrl
      if (signal != null) {
        if (signal.aborted) ctrl.abort(signal.reason)
        else signal.addEventListener('abort', () => { ctrl.abort(signal.reason) }, { once: true })
      }

      setIsLoading(true)
      setError(null)
      try {
        throwIfAborted(ctrl.signal)
        const client = await getOrCreateAccountClient(tfaToken)
        const loginInfo = await client.verify2fa(code)
        throwIfAborted(ctrl.signal)
        await setAuth(loginInfo)
        return loginInfo
      } catch (err) {
        const message = err instanceof Error ? err.message : '2FA verification failed'
        setError(message)
        throw err
      } finally {
        releaseAuthAbort(ctrl)
        if (activeRef.current === ctrl) activeRef.current = null
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
 * Validates a JWT-shaped string: exactly three non-empty base64url segments
 * separated by dots, and a payload that parses as JSON and carries at least
 * one of the standard claims (`exp` or `iss`). This is a syntactic+shape
 * check only — signature verification happens server-side when the token is
 * exchanged for a `LoginInfo`.
 */
export function isJwtShaped(token: string): boolean {
  if (typeof token !== 'string' || token.length === 0) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const base64urlSegment = /^[A-Za-z0-9_-]+$/
  if (!parts.every((part) => part.length > 0 && base64urlSegment.test(part))) {
    return false
  }

  // Decode the payload and confirm it looks like a JWT body. `atob` is
  // available on Hermes (SDK 55) and produces a UTF-8 byte string, which
  // for JSON with ASCII keys we can JSON.parse directly.
  try {
    const payloadPart = parts[1] ?? ''
    // Pad to a multiple of 4 and translate base64url -> base64 before atob.
    const padLen = (4 - (payloadPart.length % 4)) % 4
    const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
    // eslint-disable-next-line no-restricted-globals
    const decoded = (globalThis as { atob?: (s: string) => string }).atob?.(b64)
    if (decoded == null) return false
    const parsed: unknown = JSON.parse(decoded)
    if (typeof parsed !== 'object' || parsed === null) return false
    const hasExp = typeof (parsed as { exp?: unknown }).exp === 'number'
    const hasIss = typeof (parsed as { iss?: unknown }).iss === 'string'
    return hasExp || hasIss
  } catch {
    return false
  }
}

/**
 * Consume a JWT captured via the `/login/auth?token=<jwt>` universal link.
 *
 * Hydrates a full `LoginInfo` via `getLoginInfoByToken()` (the store's
 * `setAuth` requires `LoginInfo`, not a bare JWT) and persists it.
 */
export function useOAuthLogin(): {
  loginWithToken: (token: string, signal?: AbortSignal) => Promise<LoginInfo>
  isLoading: boolean
  error: string | null
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAuthStore((s) => s.setAuth)
  const activeRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      const ctrl = activeRef.current
      if (ctrl != null) {
        try { ctrl.abort('unmount') } catch { /* noop */ }
        releaseAuthAbort(ctrl)
        activeRef.current = null
      }
    }
  }, [])

  const loginWithToken = useCallback(
    async (token: string, signal?: AbortSignal): Promise<LoginInfo> => {
      const ctrl = registerAuthAbort()
      activeRef.current = ctrl
      if (signal != null) {
        if (signal.aborted) ctrl.abort(signal.reason)
        else signal.addEventListener('abort', () => { ctrl.abort(signal.reason) }, { once: true })
      }

      setIsLoading(true)
      setError(null)
      try {
        throwIfAborted(ctrl.signal)
        if (!isJwtShaped(token)) {
          throw new Error('Invalid OAuth token')
        }
        const client = await getOrCreateAccountClient(token)
        const info = await client.getLoginInfoByToken()
        throwIfAborted(ctrl.signal)

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
        releaseAuthAbort(ctrl)
        if (activeRef.current === ctrl) activeRef.current = null
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
  const promptActiveRef = useRef(false)

  // If the screen unmounts while a biometric prompt is on-screen, cancel
  // it so we don't hold up the OS UI or the next mount's prompt.
  useEffect(() => {
    return () => {
      if (promptActiveRef.current) {
        try { LocalAuthentication.cancelAuthenticate() } catch { /* noop */ }
        promptActiveRef.current = false
      }
    }
  }, [])

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

        promptActiveRef.current = true
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: reason,
          disableDeviceFallback: false,
          cancelLabel: 'Cancel',
        })
        promptActiveRef.current = false

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
        promptActiveRef.current = false
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
    // Cancel any in-flight auth mutations before tearing down stores so
    // their .then() cannot re-populate state we're about to clear.
    cancelAllAuthRequests('logout')

    // Also cancel any biometric prompt that's still showing so the next
    // launch's cold-start prompt doesn't deadlock behind a stale one.
    try { LocalAuthentication.cancelAuthenticate() } catch { /* noop */ }

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
