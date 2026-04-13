/**
 * useNotifications hook unit tests.
 *
 * Tests notification list loading, filter-based class selection,
 * and disabled state.
 */

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useNotifications } from '../useNotifications'
import { buildNotificationList } from '@/test/factories'

// Mock the repository layer
jest.mock('@/repositories/notification', () => ({
  getNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  archiveNotifications: jest.fn(),
  archiveAll: jest.fn(),
}))

// Mock the client singleton
jest.mock('@/client', () => ({
  getClient: jest.fn().mockReturnValue({ findAll: jest.fn() }),
}))

// Mock the websocket store
jest.mock('@/store/websocket', () => ({
  useWebSocketStore: jest.fn((selector: (state: { status: string }) => unknown) =>
    selector({ status: 'connected' })
  ),
}))

// Mock the inbox store
jest.mock('@/store/inbox', () => ({
  useInboxStore: Object.assign(
    jest.fn((selector: (state: Record<string, unknown>) => unknown) =>
      selector({ unreadTotal: 0, setUnreadTotal: jest.fn() })
    ),
    {
      getState: jest.fn().mockReturnValue({
        unreadTotal: 0,
        setUnreadTotal: jest.fn(),
      }),
    }
  ),
}))

const { getNotifications } = jest.requireMock('@/repositories/notification') as {
  getNotifications: jest.Mock
}

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches all notifications by default', async () => {
    const mockNotifications = buildNotificationList(3)
    getNotifications.mockResolvedValue({
      items: mockNotifications,
      total: 3,
      hasMore: false,
      nextCursor: undefined,
    })

    const { result } = renderHook(
      () => useNotifications(),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data?.items).toHaveLength(3)
  })

  it('passes filter type to repository', async () => {
    getNotifications.mockResolvedValue({
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: undefined,
    })

    renderHook(
      () => useNotifications('mentions'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'mentions' }),
        undefined
      )
    })
  })

  it('treats "all" filter as no filter', async () => {
    getNotifications.mockResolvedValue({
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: undefined,
    })

    renderHook(
      () => useNotifications('all'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(getNotifications).toHaveBeenCalledWith(
        undefined,
        undefined
      )
    })
  })

  it('handles fetch error', async () => {
    getNotifications.mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(
      () => useNotifications(),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
