/**
 * Account client wrapper.
 *
 * Manages a singleton `AccountClient` instance backed by `@hcengineering/account-client`.
 * Loads server config on first call to obtain ACCOUNTS_URL.
 */

import { getClient } from '@hcengineering/account-client'
import type { AccountClient } from '@hcengineering/account-client'

import { getServerUrl, loadServerConfig } from './config'

let cachedClient: AccountClient | null = null
let cachedToken: string | undefined

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

  const serverUrl = getServerUrl()
  const config = await loadServerConfig(serverUrl)

  cachedClient = getClient(config.ACCOUNTS_URL, token)
  cachedToken = token
  return cachedClient
}

/**
 * Resets the cached client so the next call to `getOrCreateAccountClient`
 * creates a fresh instance (e.g. on logout).
 */
export function clearAccountClient(): void {
  cachedClient = null
  cachedToken = undefined
}
