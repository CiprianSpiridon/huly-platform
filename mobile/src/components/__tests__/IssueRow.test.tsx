/**
 * IssueRow component tests.
 *
 * Tests rendering of issue fields, press interaction, and accessibility.
 */

import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react-native'

import { IssueRow } from '../features/IssueRow'

// Mock sub-components
jest.mock('@/components/ui/PriorityIcon', () => ({
  PriorityIcon: jest.fn(({ priority }: { priority: number }) => {
    const { Text } = require('react-native')
    return React.createElement(Text, { testID: 'priority-icon' }, `P${priority}`)
  }),
}))

jest.mock('@/components/ui/AvatarCircle', () => ({
  AvatarCircle: jest.fn(({ name }: { name: string }) => {
    const { Text } = require('react-native')
    return React.createElement(Text, { testID: 'avatar' }, name)
  }),
}))

describe('IssueRow', () => {
  const defaultProps = {
    id: 'issue-1',
    identifier: 'HULY-42',
    title: 'Fix login responsiveness',
    priority: 2,
    statusName: 'In Progress',
    onPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders identifier, title, and status', () => {
    render(<IssueRow {...defaultProps} />)

    expect(screen.getByText('HULY-42')).toBeTruthy()
    expect(screen.getByText('Fix login responsiveness')).toBeTruthy()
    expect(screen.getByText('In Progress')).toBeTruthy()
  })

  it('renders priority icon', () => {
    render(<IssueRow {...defaultProps} />)

    expect(screen.getByTestID('priority-icon')).toBeTruthy()
  })

  it('renders assignee avatar when provided', () => {
    render(<IssueRow {...defaultProps} assigneeName="Alice Smith" />)

    expect(screen.getByTestID('avatar')).toBeTruthy()
    expect(screen.getByText('Alice Smith')).toBeTruthy()
  })

  it('does not render avatar when no assignee', () => {
    render(<IssueRow {...defaultProps} />)

    expect(screen.queryByTestID('avatar')).toBeNull()
  })

  it('calls onPress with issue ID when pressed', () => {
    const onPress = jest.fn()
    render(<IssueRow {...defaultProps} onPress={onPress} />)

    fireEvent.press(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalledWith('issue-1')
  })

  it('has correct accessibility label', () => {
    render(<IssueRow {...defaultProps} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName('Issue HULY-42: Fix login responsiveness')
  })

  it('passes testID prop', () => {
    render(<IssueRow {...defaultProps} testID="issue-card" />)

    expect(screen.getByTestID('issue-card')).toBeTruthy()
  })
})
