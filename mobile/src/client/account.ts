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
import type { AccountClient } from '@hcengineering/account-client'

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
