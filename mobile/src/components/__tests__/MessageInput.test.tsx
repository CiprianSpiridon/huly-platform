/**
 * MessageInput component tests.
 *
 * Tests text input, send button, draft callback, disabled states,
 * and accessibility.
 */

import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react-native'

import { MessageInput } from '../features/MessageInput'

// Mock AttachmentButton
jest.mock('@/components/features/AttachmentButton', () => ({
  AttachmentButton: jest.fn(() => {
    const { View } = require('react-native')
    return React.createElement(View, { testID: 'attach-button' })
  }),
}))

describe('MessageInput', () => {
  const defaultProps = {
    onSend: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders text input with placeholder', () => {
    render(<MessageInput {...defaultProps} />)

    expect(screen.getByLabelText('Message input')).toBeTruthy()
  })

  it('renders custom placeholder', () => {
    render(<MessageInput {...defaultProps} placeholder="Reply..." />)

    expect(screen.getByPlaceholderText('Reply...')).toBeTruthy()
  })

  it('renders send button', () => {
    render(<MessageInput {...defaultProps} />)

    expect(screen.getByLabelText('Send message')).toBeTruthy()
  })

  it('disables send button when input is empty', () => {
    render(<MessageInput {...defaultProps} />)

    const sendButton = screen.getByLabelText('Send message')
    expect(sendButton.props.accessibilityState?.disabled).toBe(true)
  })

  it('enables send button when input has text', () => {
    render(<MessageInput {...defaultProps} />)

    fireEvent.changeText(screen.getByLabelText('Message input'), 'Hello')

    const sendButton = screen.getByLabelText('Send message')
    expect(sendButton.props.accessibilityState?.disabled).toBe(false)
  })

  it('calls onSend with trimmed text on press', () => {
    const onSend = jest.fn()
    render(<MessageInput {...defaultProps} onSend={onSend} />)

    fireEvent.changeText(screen.getByLabelText('Message input'), '  Hello world  ')
    fireEvent.press(screen.getByLabelText('Send message'))

    expect(onSend).toHaveBeenCalledWith('Hello world')
  })

  it('clears input after sending', () => {
    render(<MessageInput {...defaultProps} />)

    const input = screen.getByLabelText('Message input')
    fireEvent.changeText(input, 'Hello')
    fireEvent.press(screen.getByLabelText('Send message'))

    expect(input.props.value).toBe('')
  })

  it('does not call onSend when input is whitespace only', () => {
    const onSend = jest.fn()
    render(<MessageInput {...defaultProps} onSend={onSend} />)

    fireEvent.changeText(screen.getByLabelText('Message input'), '   ')
    fireEvent.press(screen.getByLabelText('Send message'))

    expect(onSend).not.toHaveBeenCalled()
  })

  it('calls onDraftChange when text changes', () => {
    const onDraftChange = jest.fn()
    render(<MessageInput {...defaultProps} onDraftChange={onDraftChange} />)

    fireEvent.changeText(screen.getByLabelText('Message input'), 'draft text')

    expect(onDraftChange).toHaveBeenCalledWith('draft text')
  })

  it('initializes with provided draft', () => {
    render(<MessageInput {...defaultProps} initialDraft="saved draft" />)

    const input = screen.getByLabelText('Message input')
    expect(input.props.value).toBe('saved draft')
  })

  it('shows attachment button by default', () => {
    render(<MessageInput {...defaultProps} />)

    expect(screen.getByTestID('attach-button')).toBeTruthy()
  })

  it('hides attachment button when showAttachButton is false', () => {
    render(<MessageInput {...defaultProps} showAttachButton={false} />)

    expect(screen.queryByTestID('attach-button')).toBeNull()
  })

  it('disables send when isSending is true', () => {
    render(<MessageInput {...defaultProps} isSending />)

    const sendButton = screen.getByLabelText('Send message')
    expect(sendButton.props.accessibilityState?.disabled).toBe(true)
  })

  it('has correct accessibility hint', () => {
    render(<MessageInput {...defaultProps} />)

    const input = screen.getByLabelText('Message input')
    expect(input.props.accessibilityHint).toBe('Type your message here')
  })
})
