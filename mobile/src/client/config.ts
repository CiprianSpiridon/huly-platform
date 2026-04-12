/**
 * Server configuration loader.
 *
 * Fetches `{serverUrl}/config.json` and caches the result in memory.
 * Does NOT import from `@hcengineering/api-client`.
 */

export interface ServerConfig {
  ACCOUNTS_URL: string
  COLLABORATOR_URL: string
  FILES_URL: string
  UPLOAD_URL: string
}

let cachedConfig: ServerConfig | null = null

/**
 * Returns the base server URL from the environment or the default.
 */
export function getServerUrl(): string {
  return process.env.EXPO_PUBLIC_HULY_URL ?? 'https://app.huly.io'
}

/**
 * Fetches `{url}/config.json` and caches the result.
 * Subsequent calls return the cached value unless `clearConfig()` is called.
 */
export async function loadServerConfig(url: string): Promise<ServerConfig> {
  if (cachedConfig !== null) {
    return cachedConfig
  }

  const configUrl = url.endsWith('/') ? `${url}config.json` : `${url}/config.json`
  const response = await fetch(configUrl)

  if (!response.ok) {
    throw new Error(`Failed to load server config: ${response.status.toString()}`)
  }

  const data: unknown = await response.json()
  if (!isServerConfig(data)) {
    throw new Error('Invalid server config format')
  }

  cachedConfig = data
  return cachedConfig
}

/**
 * Returns the cached config or throws if it has not been loaded yet.
 */
export function getConfig(): ServerConfig {
  if (cachedConfig === null) {
    throw new Error('Server config has not been loaded. Call loadServerConfig() first.')
  }
  return cachedConfig
}

/**
 * Clears the cached config so the next `loadServerConfig` call re-fetches.
 */
export function clearConfig(): void {
  cachedConfig = null
}

function isServerConfig(data: unknown): data is ServerConfig {
  if (typeof data !== 'object' || data === null) return false
  const record = data as Record<string, unknown>
  return (
    typeof record.ACCOUNTS_URL === 'string' &&
    typeof record.COLLABORATOR_URL === 'string' &&
    typeof record.FILES_URL === 'string' &&
    typeof record.UPLOAD_URL === 'string'
  )
}
