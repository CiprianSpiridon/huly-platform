/**
 * useIssues hook unit tests.
 *
 * Tests issue list loading, search, and disabled state.
 * Uses renderHook with fresh QueryClient per test.
 */

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useIssues, useSearchIssues } from '../useIssues'
import { buildIssueList } from '@/test/factories'

// Mock the repository layer
jest.mock('@/repositories/tracker', () => ({
  getIssues: jest.fn(),
  searchIssues: jest.fn(),
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

// Mock the Huly mutation hooks
jest.mock('../useHulyMutation', () => ({
  useHulyCreate: jest.fn(),
  useHulyUpdate: jest.fn(),
}))

const { getIssues, searchIssues } = jest.requireMock('@/repositories/tracker') as {
  getIssues: jest.Mock
  searchIssues: jest.Mock
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

describe('useIssues', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches issues for a project', async () => {
    const mockIssues = buildIssueList(3)
    getIssues.mockResolvedValue({
      items: mockIssues,
      total: 3,
      hasMore: false,
    })

    const { result } = renderHook(
      () => useIssues('project-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data?.items).toHaveLength(3)
    expect(getIssues).toHaveBeenCalledWith(
      'project-1',
      undefined,
      undefined,
      0
    )
  })

  it('does not fetch when projectId is undefined', () => {
    const { result } = renderHook(
      () => useIssues(undefined),
      { wrapper: createWrapper() }
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(getIssues).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    getIssues.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(
      () => useIssues('project-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })
})

describe('useSearchIssues', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('searches when query is 2+ characters', async () => {
    searchIssues.mockResolvedValue([
      { id: 'i1', title: 'Fix bug' },
    ])

    const { result } = renderHook(
      () => useSearchIssues('bu'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toHaveLength(1)
  })

  it('does not search when query is too short', () => {
    const { result } = renderHook(
      () => useSearchIssues('b'),
      { wrapper: createWrapper() }
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(searchIssues).not.toHaveBeenCalled()
  })
})
