/**
 * Mock HulyClient factory for unit tests.
 *
 * Creates a mock HulyClient instance with configurable method stubs.
 * Use this to control what getClient() returns in repository tests.
 *
 * Usage:
 *   const { mockClient, installMock, uninstallMock } = createMockHulyClient()
 *   installMock()
 *   mockClient.findAll.mockResolvedValue([...])
 *   // ... run test ...
 *   uninstallMock()
 */

import type { HulyClient } from '@/client/api'

export interface MockHulyClient {
  findAll: jest.Mock
  findOne: jest.Mock
  tx: jest.Mock
  searchFulltext: jest.Mock
  getAccount: jest.Mock
  getHierarchy: jest.Mock
  getModel: jest.Mock
  close: jest.Mock
}

export interface MockHulyClientResult {
  mockClient: MockHulyClient
  installMock: () => void
  uninstallMock: () => void
}

/**
 * Creates a mock HulyClient with all methods stubbed.
 *
 * `installMock()` patches the `@/client` module so `getClient()` returns
 * the mock. `uninstallMock()` resets it to null.
 */
export function createMockHulyClient(
  overrides?: Partial<MockHulyClient>
): MockHulyClientResult {
  const mockClient: MockHulyClient = {
    findAll: jest.fn().mockResolvedValue(Object.assign([], { total: 0 })),
    findOne: jest.fn().mockResolvedValue(undefined),
    tx: jest.fn().mockResolvedValue({}),
    searchFulltext: jest.fn().mockResolvedValue({ docs: [] }),
    getAccount: jest.fn().mockResolvedValue({
      _id: 'mock-account-id',
      primarySocialId: 'mock-social-id',
    }),
    getHierarchy: jest.fn().mockReturnValue({}),
    getModel: jest.fn().mockReturnValue({}),
    close: jest.fn(),
    ...overrides,
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const clientModule = require('@/client') as {
    getClient: () => HulyClient | null
    setClient: (client: HulyClient) => void
    clearClient: () => void
  }

  function installMock(): void {
    clientModule.setClient(mockClient as unknown as HulyClient)
  }

  function uninstallMock(): void {
    clientModule.clearClient()
  }

  return { mockClient, installMock, uninstallMock }
}
