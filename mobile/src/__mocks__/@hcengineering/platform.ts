/**
 * Mock for @hcengineering/platform.
 *
 * Provides minimal stubs for platform utilities used by the mobile app.
 */

export function getMetadata(_key: string): string | undefined {
  return undefined
}

export function setMetadata(_key: string, _value: string): void {
  // no-op in tests
}

export function getResource<T>(_id: string): Promise<T> {
  return Promise.resolve(undefined as unknown as T)
}

export const PlatformError = class PlatformError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlatformError'
  }
}

export const Status = {
  OK: 'ok',
  ERROR: 'error',
} as const
