/**
 * Auth Zustand store.
 *
 * Manages authentication token, account UUID, and an optional transient
 * 2FA token. Persists credentials to `expo-secure-store`.
 */

import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import NetInfo from '@react-native-community/netinfo'
import type { AccountUuid } from '@hcengineering/core'
import type { LoginInfo } from '@hcengineering/account-client'

interface AuthState {
  token: string | null
  account: AccountUuid | null
  /** Transient restricted token used during the 2FA verification step. NOT persisted. */
  tfaToken: string | null
  isAuthenticated: boolean
  /**
   * Whether the user has opted in to biometric unlock. Persisted to
   * secure-store so it survives app restarts. See TASK-004 in
   * `.ulpi/plans/mobile-auth-parity.md` for the full state machine.
   */
  biometricEnabled: boolean
  /**
   * True while the app is waiting on the user to complete the biometric
   * prompt on cold start. While this is true the app should keep the
   * protected surface hidden and prompt the user to authenticate.
   */
  biometricLocked: boolean
  /**
   * Epoch ms of the last successful biometric unlock. Used to debounce
   * the foreground re-lock path — a brief app-switch (e.g. the OS
   * credential-picker sheet) should NOT re-prompt Face ID immediately.
   * Only in-memory; never persisted.
   */
  lastBiometricUnlockAt: number | null

  setAuth: (loginInfo: LoginInfo) => Promise<void>
  setTfaToken: (token: string) => void
  clearAuth: () => Promise<void>
  restoreAuth: () => Promise<void>
  setBiometricEnabled: (enabled: boolean) => Promise<void>
  setBiometricLocked: (locked: boolean) => void
  /**
   * Called after a successful biometric unlock on cold launch. Flips
   * `biometricLocked -> false` and `isAuthenticated -> true` in a single
   * set so the navigator transitions in one frame. Also stamps
   * `lastBiometricUnlockAt` for foreground-cooldown debouncing.
   */
  completeBiometricUnlock: () => Promise<void>
}

const BIOMETRIC_FLAG_KEY = 'biometric_enabled'

/**
 * SecureStore options for the biometric-enabled flag. The flag itself is
 * not secret, but the presence of a biometric-gated persisted token
 * should not survive a re-enroll of Face ID / Touch ID. Using
 * `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` bounds the
 * flag to the current device; `requireAuthentication: true` additionally
 * invalidates the flag when biometry is re-enrolled on iOS.
 */
const BIOMETRIC_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  requireAuthentication: true,
}

/**
 * Thrown by `setAuth()` when the caller passes a `LoginInfo` without a
 * concrete token (e.g. `tfaRequired: true` response). Callers should
 * route the user to the 2FA screen via `setTfaToken()` instead.
 */
export class MissingLoginTokenError extends Error {
  constructor() {
    super('LoginInfo did not include a bearer token; refusing to persist auth.')
    this.name = 'MissingLoginTokenError'
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  account: null,
  tfaToken: null,
  isAuthenticated: false,
  biometricEnabled: false,
  biometricLocked: false,
  lastBiometricUnlockAt: null,

  setAuth: async (loginInfo: LoginInfo) => {
    if (loginInfo.token == null) {
      throw new MissingLoginTokenError()
    }

    const previousAccount = get().account
    const switchingAccounts =
      previousAccount != null && previousAccount !== loginInfo.account

    await SecureStore.setItemAsync('auth_token', loginInfo.token)
    await SecureStore.setItemAsync('account_id', loginInfo.account)

    // Cross-tenant safety: when the account ID changes out from under us
    // (e.g. user logs out of tenant A and into tenant B without clearing
    // the workspace store), purge any persisted workspace keys from the
    // previous tenant. The next workspace-select call will repopulate
    // them; until then the router will land on workspace-select.
    if (switchingAccounts) {
      await SecureStore.deleteItemAsync('workspace_url')
      await SecureStore.deleteItemAsync('workspace_id')
      await SecureStore.deleteItemAsync('workspace_token')
      await SecureStore.deleteItemAsync('workspace_endpoint')
      try {
        const { useWorkspaceStore } = await import('@/store/workspace')
        await useWorkspaceStore.getState().clearWorkspace()
      } catch {
        // Clearing the in-memory store is best-effort — the secure-store
        // wipe above is what actually guarantees cross-tenant isolation.
      }
    }

    set({
      token: loginInfo.token,
      account: loginInfo.account,
      tfaToken: null,
      isAuthenticated: true,
      // A fresh login always clears any pending biometric lock. The user
      // has just proven possession of password/OAuth; don't immediately
      // re-prompt them for biometrics.
      biometricLocked: false,
      lastBiometricUnlockAt: Date.now(),
    })
  },

  setTfaToken: (token: string) => {
    // Only kept in memory -- never persisted to secure store
    set({ tfaToken: token })
  },

  setBiometricEnabled: async (enabled: boolean) => {
    if (enabled) {
      try {
        await SecureStore.setItemAsync(BIOMETRIC_FLAG_KEY, '1', BIOMETRIC_STORE_OPTIONS)
      } catch {
        // If the secure-enclave / keystore is unavailable (hardware
        // missing, user revoked biometry mid-flow) fall back to a
        // plain write so the app at least remembers the user's choice.
        await SecureStore.setItemAsync(BIOMETRIC_FLAG_KEY, '1')
      }
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_FLAG_KEY)
    }
    set({ biometricEnabled: enabled })
  },

  setBiometricLocked: (locked: boolean) => {
    set({ biometricLocked: locked })
  },

  completeBiometricUnlock: async () => {
    const { token, account } = get()
    if (token == null || account == null) {
      // Defensive: should not happen — restoreAuth requires a valid token
      // before setting biometricLocked. If it does, refuse to authenticate.
      set({ biometricLocked: false })
      return
    }

    // Re-verify the stored token against the server before flipping
    // `isAuthenticated`. This prevents a stale revoked token from
    // unlocking the UI just because Face ID succeeded locally.
    try {
      const { getOrCreateAccountClient } = await import('@/client/account')
      const client = await getOrCreateAccountClient(token)
      const info = await client.getLoginInfoByToken()
      if (info == null) {
        throw new Error('Token verification returned no login info')
      }
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error &&
          /network|fetch|abort|timeout|internet/i.test(err.message))
      if (!isNetworkError) {
        // Token rejected / revoked — clear everything and force re-login.
        await SecureStore.deleteItemAsync('auth_token')
        await SecureStore.deleteItemAsync('account_id')
        await SecureStore.deleteItemAsync(BIOMETRIC_FLAG_KEY)
        set({
          token: null,
          account: null,
          tfaToken: null,
          isAuthenticated: false,
          biometricEnabled: false,
          biometricLocked: false,
          lastBiometricUnlockAt: null,
        })
        return
      }
      // Network error: fall through and trust the token. The offline-aware
      // restoreAuth path has already vetted this same token; the user
      // deserves to see cached data rather than be bounced to login when
      // they're simply on a flaky connection.
    }

    set({
      biometricLocked: false,
      isAuthenticated: true,
      lastBiometricUnlockAt: Date.now(),
    })
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('auth_token')
    await SecureStore.deleteItemAsync('account_id')
    await SecureStore.deleteItemAsync(BIOMETRIC_FLAG_KEY)

    set({
      token: null,
      account: null,
      tfaToken: null,
      isAuthenticated: false,
      biometricEnabled: false,
      biometricLocked: false,
      lastBiometricUnlockAt: null,
    })
    // Satisfy noUnusedLocals without altering behavior -- `get` is exposed
    // here for future selectors that need to read the pre-clear state.
    void get
  },

  restoreAuth: async () => {
    const token = await SecureStore.getItemAsync('auth_token')
    const account = await SecureStore.getItemAsync('account_id')
    const biometricFlag = await SecureStore.getItemAsync(BIOMETRIC_FLAG_KEY)
    const biometricEnabled = biometricFlag === '1'

    // Secure-store tampering / wipe: biometric flag set but token missing.
    // Treat this as "no stored credential"; clear the flag and fall through
    // to the no-credential branch so the user is prompted for a fresh login.
    if (biometricEnabled && (token == null || account == null)) {
      await SecureStore.deleteItemAsync(BIOMETRIC_FLAG_KEY)
    }

    if (token != null && account != null) {
      // Validate the token is still valid before trusting it
      try {
        const { getOrCreateAccountClient } = await import('@/client/account')
        const client = await getOrCreateAccountClient(token)
        const info = await client.getLoginInfoByToken()

        if (info == null) {
          throw new Error('Token invalid')
        }

        // When biometrics are enabled we keep `isAuthenticated: false`
        // during the locked state so the existing AuthLayout auth guard
        // keeps the user on the login screen until the biometric prompt
        // succeeds. `token`/`account` are still hydrated so the login
        // screen can render the "Unlock with biometrics" button and the
        // biometric success path can flip `biometricLocked: false` and
        // `isAuthenticated: true` in one step via `setAuth`-equivalent.
        set({
          token,
          account: account as AccountUuid,
          isAuthenticated: !biometricEnabled,
          biometricEnabled,
          biometricLocked: biometricEnabled,
        })
      } catch (err) {
        // Distinguishing "we are offline" from "the server rejected us"
        // cannot be done by error shape alone — RN's fetch throws a
        // TypeError for CORS, DNS, TLS, and 5xx edge cases too. Consult
        // NetInfo authoritatively. Only trust the cached token when we
        // know we are offline; otherwise treat the failure as auth.
        let isOffline = false
        try {
          const netState = await NetInfo.fetch()
          // `isInternetReachable` is the strongest signal; fall back to
          // `isConnected` when the reachability probe hasn't completed.
          if (netState.isInternetReachable === false) {
            isOffline = true
          } else if (netState.isInternetReachable == null && netState.isConnected === false) {
            isOffline = true
          }
        } catch {
          // NetInfo itself failed — conservatively treat as online so we
          // don't extend a session against a genuinely revoked token.
          isOffline = false
        }

        if (isOffline) {
          // Offline — trust the persisted token optimistically so the
          // user isn't bounced to the login screen on flaky connectivity.
          // The connection store handles real-time connectivity state, and
          // any subsequent 401 from the transactor will clear auth explicitly.
          set({
            token,
            account: account as AccountUuid,
            isAuthenticated: !biometricEnabled,
            biometricEnabled,
            biometricLocked: biometricEnabled,
          })
          void err
          return
        }

        // Online but verification failed (invalid signature, revoked, 401,
        // 5xx, CORS). Clear everything — including workspace keys — so the
        // next launch doesn't try to restore a workspace the user can no
        // longer access. Also clear the biometric flag; the token it was
        // protecting is gone.
        await SecureStore.deleteItemAsync('auth_token')
        await SecureStore.deleteItemAsync('account_id')
        await SecureStore.deleteItemAsync(BIOMETRIC_FLAG_KEY)
        await SecureStore.deleteItemAsync('workspace_url')
        await SecureStore.deleteItemAsync('workspace_id')
        await SecureStore.deleteItemAsync('workspace_token')
        await SecureStore.deleteItemAsync('workspace_endpoint')
      }
    } else {
      await SecureStore.deleteItemAsync('workspace_url')
      await SecureStore.deleteItemAsync('workspace_id')
      await SecureStore.deleteItemAsync('workspace_token')
      await SecureStore.deleteItemAsync('workspace_endpoint')
    }
  },
}))
