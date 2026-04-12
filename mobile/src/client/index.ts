/**
 * Client layer barrel.
 *
 * Re-exports client modules and manages the HulyClient singleton.
 */

import { HulyClient } from './api'

export { HulyClient } from './api'
export { getOrCreateAccountClient, clearAccountClient } from './account'
export { getServerUrl, loadServerConfig, getConfig, clearConfig } from './config'
export type { ServerConfig } from './config'

// ---------------------------------------------------------------------------
// HulyClient singleton
// ---------------------------------------------------------------------------

let _client: HulyClient | null = null

/**
 * Returns the current HulyClient singleton, or null if not connected.
 */
export function getClient (): HulyClient | null {
  return _client
}

/**
 * Sets the HulyClient singleton. Called by the connection store after
 * successfully connecting.
 */
export function setClient (client: HulyClient): void {
  _client = client
}

/**
 * Clears the HulyClient singleton. Called on disconnect / logout.
 */
export function clearClient (): void {
  if (_client !== null) {
    _client.close()
    _client = null
  }
}
