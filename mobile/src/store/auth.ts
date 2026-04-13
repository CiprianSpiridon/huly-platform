/**
 * Auth Zustand store.
 *
 * Manages authentication token, account UUID, and an optional transient
 * 2FA token. Persists credentials to `expo-secure-store`.
 */

import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { AccountUuid } from '@hcengineering/core'
import type { LoginInfo } from '@hcengineering/account-client'

interface AuthState {
  token: string | null
  account: AccountUuid | null
  /** Transient restricted token used during the 2FA verification step. NOT persisted. */
  tfaToken: string | null
  isAuthenticated: boolean
  isBootstrapping: boolean

  setAuth: (loginInfo: LoginInfo) => Promise<void>
  setTfaToken: (token: string) => void
  clearAuth: () => Promise<void>
  restoreAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  account: null,
  tfaToken: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setAuth: async (loginInfo: LoginInfo) => {
    if (loginInfo.token == null) {
      throw new Error('Login response missing token')
    }

    await SecureStore.setItemAsync('auth_token', loginInfo.token)
    await SecureStore.setItemAsync('account_id', loginInfo.account)

    set({
      token: loginInfo.token,
      account: loginInfo.account,
      tfaToken: null,
      isAuthenticated: true,
    })
  },

  setTfaToken: (token: string) => {
    // Only kept in memory -- never persisted to secure store
    set({ tfaToken: token })
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('auth_token')
    await SecureStore.deleteItemAsync('account_id')

    set({
      token: null,
      account: null,
      tfaToken: null,
      isAuthenticated: false,
    })
  },

  restoreAuth: async () => {
    const token = await SecureStore.getItemAsync('auth_token')
    const account = await SecureStore.getItemAsync('account_id')

    if (token != null && account != null) {
      // Validate the token is still valid before trusting it
      try {
        const { getOrCreateAccountClient } = await import('@/client/account')
        const client = await getOrCreateAccountClient(token)
        const info = await client.getLoginInfoByToken()

        if (info == null) {
          throw new Error('Token invalid')
        }

        // Token is valid — restore session
        set({
          token,
          account: account as AccountUuid,
          isAuthenticated: true,
          isBootstrapping: false,
        })
      } catch {
        // Token expired or revoked — clear auth AND workspace to prevent
        // stale workspace state from redirecting into /(app) on next login
        await SecureStore.deleteItemAsync('auth_token')
        await SecureStore.deleteItemAsync('account_id')
        await SecureStore.deleteItemAsync('workspace_url')
        await SecureStore.deleteItemAsync('workspace_id')
        await SecureStore.deleteItemAsync('workspace_token')
        await SecureStore.deleteItemAsync('workspace_endpoint')
        set({ isBootstrapping: false })
      }
    } else {
      // No auth token at all — also clear any orphaned workspace keys
      await SecureStore.deleteItemAsync('workspace_url')
      await SecureStore.deleteItemAsync('workspace_id')
      await SecureStore.deleteItemAsync('workspace_token')
      await SecureStore.deleteItemAsync('workspace_endpoint')
      set({ isBootstrapping: false })
    }
  },
}))
