/**
 * Mock for @hcengineering/account-client.
 *
 * Provides a mock AccountClient returned by getClient().
 * All methods return reasonable defaults that tests can override.
 */

export const mockAccountClient = {
  login: jest.fn().mockResolvedValue({
    account: 'mock-account-uuid',
    token: 'mock-jwt-token',
  }),
  loginOtp: jest.fn().mockResolvedValue({
    sent: true,
  }),
  validateOtp: jest.fn().mockResolvedValue({
    account: 'mock-account-uuid',
    token: 'mock-jwt-token',
  }),
  verify2fa: jest.fn().mockResolvedValue({
    account: 'mock-account-uuid',
    token: 'mock-jwt-token',
  }),
  selectWorkspace: jest.fn().mockResolvedValue({
    workspace: 'mock-ws-uuid',
    workspaceUrl: 'test-workspace',
    endpoint: 'wss://mock.huly.io',
    token: 'mock-ws-token',
  }),
  getUserWorkspaces: jest.fn().mockResolvedValue([]),
  getWorkspaceInfo: jest.fn().mockResolvedValue({
    name: 'Test Workspace',
    url: 'test-workspace',
  }),
  getWorkspaceMembers: jest.fn().mockResolvedValue([]),
  getPerson: jest.fn().mockResolvedValue({
    firstName: 'Test',
    lastName: 'User',
  }),
  getSocialIds: jest.fn().mockResolvedValue([
    { type: 'email', value: 'test@huly.io' },
  ]),
  getLoginInfoByToken: jest.fn().mockResolvedValue({
    account: 'mock-account-uuid',
    token: 'mock-jwt-token',
  }),
}

export function getClient(
  _accountsUrl: string,
  _token?: string
): typeof mockAccountClient {
  return mockAccountClient
}
