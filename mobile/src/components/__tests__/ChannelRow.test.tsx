/**
 * ChannelRow component tests.
 *
 * Tests rendering of channel name, last message preview, unread indicator,
 * press interaction, and accessibility.
 */

import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react-native'

import { ChannelRow } from '../features/ChannelRow'
import { buildChannel } from '@/test/factories'

// Mock markupUtils
jest.mock('@/lib/markupUtils', () => ({
  truncateMarkupText: jest.fn((text: string) =>
    typeof text === 'string' ? text.slice(0, 60) : ''
  ),
}))

describe('ChannelRow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders channel name', () => {
    const channel = buildChannel({ name: 'general' })

    render(
      <ChannelRow channel={channel} unreadCount={0} onPress={jest.fn()} />
    )

    expect(screen.getByText('general')).toBeTruthy()
  })

  it('renders first letter as icon', () => {
    const channel = buildChannel({ name: 'development' })

    render(
      <ChannelRow channel={channel} unreadCount={0} onPress={jest.fn()} />
    )

    expect(screen.getByText('D')).toBeTruthy()
  })

  it('renders last message preview', () => {
    const channel = buildChannel({ lastMessage: 'Hello everyone!' })

    render(
      <ChannelRow channel={channel} unreadCount={0} onPress={jest.fn()} />
    )

    expect(screen.getByText('Hello everyone!')).toBeTruthy()
  })

  it('renders unread count badge when unread', () => {
    const channel = buildChannel()

    render(
      <ChannelRow channel={channel} unreadCount={5} onPress={jest.fn()} />
    )

    expect(screen.getByText('5')).toBeTruthy()
  })

  it('renders 99+ for large unread counts', () => {
    const channel = buildChannel()

    render(
      <ChannelRow channel={channel} unreadCount={150} onPress={jest.fn()} />
    )

    expect(screen.getByText('99+')).toBeTruthy()
  })

  it('does not render unread badge when count is 0', () => {
    const channel = buildChannel()

    render(
      <ChannelRow channel={channel} unreadCount={0} onPress={jest.fn()} />
    )

    expect(screen.queryByText('0')).toBeNull()
  })

  it('calls onPress with channel when pressed', () => {
    const onPress = jest.fn()
    const channel = buildChannel({ name: 'test-channel' })

    render(
      <ChannelRow channel={channel} unreadCount={0} onPress={onPress} />
    )

    fireEvent.press(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalledWith(channel)
  })

  it('has correct accessibility label without unread', () => {
    const channel = buildChannel({ name: 'general' })

    render(
      <ChannelRow channel={channel} unreadCount={0} onPress={jest.fn()} />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName('general')
  })

  it('includes unread count in accessibility label', () => {
    const channel = buildChannel({ name: 'general' })

    render(
      <ChannelRow channel={channel} unreadCount={3} onPress={jest.fn()} />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName('general, 3 unread messages')
  })

  it('does not render last message when empty', () => {
    const channel = buildChannel({ lastMessage: '' })

    render(
      <ChannelRow channel={channel} unreadCount={0} onPress={jest.fn()} />
    )

    // Should only have channel name text nodes, no message preview
    const texts = screen.queryAllByText(/./)
    const previewTexts = texts.filter(
      (t) => t.props.children !== channel.name && t.props.children !== channel.name.charAt(0).toUpperCase()
    )
    // Timestamp might be rendered; that's fine -- just no message content
    expect(previewTexts.length).toBeLessThanOrEqual(1)
  })
})
