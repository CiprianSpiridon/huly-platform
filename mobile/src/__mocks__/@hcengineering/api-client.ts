/**
 * Mock for @hcengineering/api-client.
 *
 * Provides a mock createRestClient factory that returns a configurable
 * mock rest client. Tests can override return values via jest.fn() mocking.
 */

export const mockRestClient = {
  findAll: jest.fn().mockResolvedValue(Object.assign([], { total: 0 })),
  findOne: jest.fn().mockResolvedValue(undefined),
  tx: jest.fn().mockResolvedValue({}),
  searchFulltext: jest.fn().mockResolvedValue({ docs: [] }),
  getAccount: jest.fn().mockResolvedValue({
    _id: 'mock-account-id',
    primarySocialId: 'mock-social-id',
  }),
  getModel: jest.fn().mockResolvedValue({
    hierarchy: {},
    model: {},
  }),
}

export function createRestClient(
  _endpoint: string,
  _workspaceId: string,
  _token: string
): typeof mockRestClient {
  return mockRestClient
}
