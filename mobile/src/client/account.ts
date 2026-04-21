/**
 * Account client wrapper.
 *
 * Manages a singleton `AccountClient` instance backed by `@hcengineering/account-client`.
 * Loads server config on first call to obtain ACCOUNTS_URL.
 */

import { getClient } from '@hcengineering/account-client'
import type { AccountClient, WorkspaceLoginInfo } from '@hcengineering/account-client'
import type { AccountUuid } from '@hcengineering/core'

import { getServerUrl, loadServerConfig } from './config'

let cachedClient: AccountClient | null = null
let cachedToken: string | undefined
let pendingPromise: Promise<AccountClient> | null = null

/**
 * Returns (or creates) a cached `AccountClient` instance.
 *
 * If the provided `token` differs from the previously cached one, the client
 * is recreated so the new token is used for Authorization headers.
 */
export async function getOrCreateAccountClient(token?: string): Promise<AccountClient> {
  if (cachedClient !== null && cachedToken === token) {
    return cachedClient
  }

  if (pendingPromise !== null && cachedToken === token) {
    return await pendingPromise
  }

  const promise = (async () => {
    const serverUrl = getServerUrl()
    const config = await loadServerConfig(serverUrl)

    cachedClient = getClient(config.ACCOUNTS_URL, token)
    cachedToken = token
    return cachedClient
  })()

  pendingPromise = promise
  try {
    return await promise
  } finally {
    pendingPromise = null
  }
}

/**
 * Resets the cached client so the next call to `getOrCreateAccountClient`
 * creates a fresh instance (e.g. on logout).
 */
export function clearAccountClient(): void {
  cachedClient = null
  cachedToken = undefined
}

/**
 * Creates a new workspace under the current account.
 *
 * Thin wrapper around `AccountClient.createWorkspace(name, region?)`. The
 * caller is responsible for calling `useWorkspaceStore.setWorkspace()` with
 * the returned `WorkspaceLoginInfo` to switch into the new workspace.
 */
export async function createWorkspace(
  name: string,
  region?: string
): Promise<WorkspaceLoginInfo> {
  const { useAuthStore } = await import('@/store/auth')
  const token = useAuthStore.getState().token
  if (token == null) {
    throw new Error('Not authenticated')
  }
  const client = await getOrCreateAccountClient(token)
  return await client.createWorkspace(name, region)
}

// ---------------------------------------------------------------------------
// Two-factor authentication
// ---------------------------------------------------------------------------

export interface TwoFactorSecret {
  secret: string
  url: string
}

async function resolveAuthenticatedClient(): Promise<AccountClient> {
  const { useAuthStore } = await import('@/store/auth')
  const token = useAuthStore.getState().token
  if (token == null) {
    throw new Error('Not authenticated')
  }
  return await getOrCreateAccountClient(token)
}

/**
 * Generates a new TOTP secret + otpauth URL for the enable-2FA flow. The
 * secret is not activated until `enable2fa(secret, code)` succeeds.
 */
export async function generate2faSecret(): Promise<TwoFactorSecret> {
  const client = await resolveAuthenticatedClient()
  return await client.generate2faSecret()
}

/**
 * Activates 2FA with the given shared secret after verifying the TOTP code.
 */
export async function enable2fa(secret: string, code: string): Promise<void> {
  const client = await resolveAuthenticatedClient()
  await client.enable2fa(secret, code)
}

/**
 * Disables 2FA after verifying a TOTP code.
 */
export async function disable2fa(code: string): Promise<void> {
  const client = await resolveAuthenticatedClient()
  await client.disable2fa(code)
}

/**
 * Deletes the current account. Caller is responsible for clearing local
 * auth state and navigating to login after this resolves.
 */
export async function deleteAccount(uuid: AccountUuid): Promise<void> {
  const client = await resolveAuthenticatedClient()
  await client.deleteAccount(uuid)
}
