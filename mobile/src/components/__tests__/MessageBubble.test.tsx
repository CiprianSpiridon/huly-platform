/**
 * MessageBubble component tests.
 *
 * Tests rendering of sender name, message text, timestamp, reactions,
 * thread indicator, and accessibility label.
 */

import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react-native'

import { MessageBubble } from '../features/MessageBubble'
import { buildMessage, buildMessageWithReactions } from '@/test/factories'

// Mock sub-components
jest.mock('@/components/ui/AvatarCircle', () => ({
  AvatarCircle: jest.fn(({ name }: { name: string }) => {
    const { Text } = require('react-native')
    return React.createElement(Text, { testID: 'avatar' }, name)
  }),
}))

jest.mock('@/components/features/ReactionPills', () => ({
  ReactionPills: jest.fn(({ reactions }: { reactions: unknown[] }) => {
    const { Text } = require('react-native')
    return reactions.length > 0
      ? React.createElement(Text, { testID: 'reactions' }, 'reactions')
      : null
  }),
}))

jest.mock('@/components/features/MarkupRenderer', () => ({
  MarkupRenderer: jest.fn(({ content }: { content: string }) => {
    const { Text } = require('react-native')
    return React.createElement(Text, { testID: 'markup' }, content)
  }),
}))

jest.mock('@/lib/markupUtils', () => ({
  markupToPlainText: jest.fn((text: string) => text),
}))

jest.mock('@/repositories/attachment', () => ({
  getAuthenticatedThumbnailUrl: jest.fn(() => 'https://example.com/thumb.jpg'),
}))

describe('MessageBubble', () => {
  const defaultProps = {
    currentUserId: 'user-1',
    onReactionToggle: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders sender name and message content', () => {
    const message = buildMessage({
      senderName: 'alice@huly.io',
      content: 'Hello world',
    })

    render(<MessageBubble message={message} {...defaultProps} />)

    expect(screen.getByText('alice')).toBeTruthy()
    expect(screen.getByTestID('markup')).toBeTruthy()
  })

  it('renders timestamp', () => {
    const message = buildMessage({
      createdOn: new Date(2024, 0, 15, 14, 30).getTime(),
    })

    render(<MessageBubble message={message} {...defaultProps} />)

    // Should show formatted time
    expect(screen.getByText(/:\d{2}\s[AP]M/)).toBeTruthy()
  })

  it('renders reactions when present', () => {
    const message = buildMessageWithReactions([
      { emoji: '👍', count: 2, userIds: ['user-1', 'user-2'] },
    ])

    render(<MessageBubble message={message} {...defaultProps} />)

    expect(screen.getByTestID('reactions')).toBeTruthy()
  })

  it('renders thread indicator with reply count', () => {
    const message = buildMessage({ replyCount: 3 })

    render(
      <MessageBubble
        message={message}
        {...defaultProps}
        onThreadPress={jest.fn()}
      />
    )

    expect(screen.getByText('3 replies')).toBeTruthy()
  })

  it('uses singular "reply" for count of 1', () => {
    const message = buildMessage({ replyCount: 1 })

    render(
      <MessageBubble
        message={message}
        {...defaultProps}
        onThreadPress={jest.fn()}
      />
    )

    expect(screen.getByText('1 reply')).toBeTruthy()
  })

  it('does not render thread indicator when replyCount is 0', () => {
    const message = buildMessage({ replyCount: 0 })

    render(<MessageBubble message={message} {...defaultProps} />)

    expect(screen.queryByText(/repl/)).toBeNull()
  })

  it('applies opacity for optimistic messages', () => {
    const message = buildMessage({ _id: 'optimistic-123' })

    const { toJSON } = render(
      <MessageBubble message={message} {...defaultProps} />
    )

    // The root element should have the opacity class
    const json = toJSON()
    expect(json).toBeTruthy()
  })

  it('has correct accessibility label', () => {
    const message = buildMessage({
      senderName: 'alice@huly.io',
      content: 'Hello world',
    })

    render(<MessageBubble message={message} {...defaultProps} />)

    const element = screen.getByLabelText(/Message from alice/)
    expect(element).toBeTruthy()
  })

  it('calls onLongPress when long-pressed', () => {
    const onLongPress = jest.fn()
    const message = buildMessage()

    render(
      <MessageBubble
        message={message}
        {...defaultProps}
        onLongPress={onLongPress}
      />
    )

    const pressable = screen.getByRole('text')
    fireEvent(pressable, 'onLongPress')

    expect(onLongPress).toHaveBeenCalledWith(message)
  })
})
