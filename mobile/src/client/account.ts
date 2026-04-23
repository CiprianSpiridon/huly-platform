/**
 * Account client wrapper.
 *
 * Returns a fresh `AccountClient` instance per call, keyed by the caller's
 * bearer token (or a sentinel for anonymous callers). Instances are cached
 * per-token so repeat calls with the same token reuse the underlying
 * client, but tokens never bleed across callers — in particular an
 * anonymous caller (login, forgot-password) can never inherit an
 * Authorization header from a previously-signed-in session, and a 2FA
 * step-up token can never be reused for a fully-signed-in request.
 */

import { getClient } from '@hcengineering/account-client'
import type { AccountClient, WorkspaceLoginInfo } from '@hcengineering/account-client'
import type { AccountUuid } from '@hcengineering/core'

import { getServerUrl, loadServerConfig } from './config'

/**
 * Sentinel key for anonymous callers. `undefined` is not a valid Map key
 * for clarity — use this explicit constant so `Map.get(ANON_KEY)` reads
 * obviously anonymous, not "missing value".
 */
const ANON_KEY = '__anonymous__'

/** Live clients, keyed by their bearer token (or the anonymous sentinel). */
const clientsByToken = new Map<string, AccountClient>()

/** In-flight client creations, keyed the same way to deduplicate races. */
const pendingByToken = new Map<string, Promise<AccountClient>>()

/**
 * Returns an `AccountClient` scoped to the provided `token`. Passing no
 * token returns an anonymous client; its Authorization header is unset
 * regardless of any other caller's prior activity.
 *
 * Each distinct token gets its own cached client. Two callers with
 * different tokens (e.g. a 2FA step-up token vs a fully-signed-in user
 * token) are guaranteed to receive two distinct clients.
 */
export async function getOrCreateAccountClient(token?: string): Promise<AccountClient> {
  const key = token ?? ANON_KEY

  const existing = clientsByToken.get(key)
  if (existing !== undefined) return existing

  const pending = pendingByToken.get(key)
  if (pending !== undefined) return await pending

  const promise = (async () => {
    const serverUrl = getServerUrl()
    const config = await loadServerConfig(serverUrl)
    const client = getClient(config.ACCOUNTS_URL, token)
    clientsByToken.set(key, client)
    return client
  })()

  pendingByToken.set(key, promise)
  try {
    return await promise
  } finally {
    pendingByToken.delete(key)
  }
}

/**
 * Resets all cached clients so subsequent calls create fresh instances.
 * Called on logout so a previously-cached signed-in client cannot be
 * reused by the next caller.
 */
export function clearAccountClient(): void {
  clientsByToken.clear()
  pendingByToken.clear()
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
