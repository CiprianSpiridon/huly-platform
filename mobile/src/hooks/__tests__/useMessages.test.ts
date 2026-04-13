/**
 * useMessages hook unit tests.
 *
 * Tests message list loading, disabled state, and send mutation.
 */

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useMessages, useSendMessage } from '../useMessages'
import { buildMessageList, buildMessage } from '@/test/factories'

// Mock the repository layer
jest.mock('@/repositories/chat', () => ({
  getMessages: jest.fn(),
  sendMessage: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
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

// Mock the connection store
jest.mock('@/store/connection', () => ({
  useConnectionStore: jest.fn((selector: (state: { currentSocialId: string | null }) => unknown) =>
    selector({ currentSocialId: 'user-1' })
  ),
}))

const { getMessages, sendMessage } = jest.requireMock('@/repositories/chat') as {
  getMessages: jest.Mock
  sendMessage: jest.Mock
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

describe('useMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches messages for a channel', async () => {
    const mockMessages = buildMessageList(5)
    getMessages.mockResolvedValue({
      items: mockMessages,
      nextCursor: undefined,
      hasMore: false,
    })

    const { result } = renderHook(
      () => useMessages('channel-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data?.items).toHaveLength(5)
  })

  it('does not fetch when spaceId is undefined', () => {
    const { result } = renderHook(
      () => useMessages(undefined),
      { wrapper: createWrapper() }
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(getMessages).not.toHaveBeenCalled()
  })

  it('handles fetch error', async () => {
    getMessages.mockRejectedValue(new Error('Connection lost'))

    const { result } = renderHook(
      () => useMessages('channel-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useSendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends a message and returns result', async () => {
    const sentMsg = buildMessage({ content: 'Hello world' })
    sendMessage.mockResolvedValue(sentMsg)

    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({ spaceId: 'ch-1', content: 'Hello world' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(sendMessage).toHaveBeenCalledWith('ch-1', 'Hello world')
  })

  it('handles send error', async () => {
    sendMessage.mockRejectedValue(new Error('Send failed'))

    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      result.current.mutate({ spaceId: 'ch-1', content: 'test' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
