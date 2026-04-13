/**
 * IssueForm component tests.
 *
 * Tests title input, validation, priority selection, submit/cancel
 * interactions, and disabled states.
 */

import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react-native'

import { IssueForm } from '../features/IssueForm'
import { useTrackerStore } from '@/store/tracker'

// Mock sub-components
jest.mock('@/components/ui/PriorityIcon', () => ({
  PriorityIcon: jest.fn(() => {
    const { View } = require('react-native')
    return React.createElement(View, { testID: 'priority-icon' })
  }),
  ISSUE_PRIORITY: { NoPriority: 0, Urgent: 1, High: 2, Medium: 3, Low: 4 },
}))

jest.mock('@/components/features/RichTextEditor', () => ({
  RichTextEditor: jest.fn(({ value, onChangeText, accessibilityLabel }: {
    value: string
    onChangeText: (text: string) => void
    accessibilityLabel: string
  }) => {
    const { TextInput } = require('react-native')
    return React.createElement(TextInput, {
      value,
      onChangeText,
      accessibilityLabel,
      testID: 'rich-text-editor',
    })
  }),
}))

describe('IssueForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    useTrackerStore.setState({
      issueDraft: {
        title: '',
        description: '',
        priority: 0,
        statusId: null,
        assigneeId: null,
        projectId: null,
      },
    })
  })

  it('renders title input and description', () => {
    render(<IssueForm {...defaultProps} />)

    expect(screen.getByLabelText('Issue title')).toBeTruthy()
    expect(screen.getByLabelText('Issue description')).toBeTruthy()
  })

  it('renders priority options', () => {
    render(<IssueForm {...defaultProps} />)

    expect(screen.getByLabelText('Priority: None')).toBeTruthy()
    expect(screen.getByLabelText('Priority: Urgent')).toBeTruthy()
    expect(screen.getByLabelText('Priority: High')).toBeTruthy()
    expect(screen.getByLabelText('Priority: Medium')).toBeTruthy()
    expect(screen.getByLabelText('Priority: Low')).toBeTruthy()
  })

  it('renders Create and Cancel buttons', () => {
    render(<IssueForm {...defaultProps} />)

    expect(screen.getByLabelText('Create issue')).toBeTruthy()
    expect(screen.getByLabelText('Cancel')).toBeTruthy()
  })

  it('calls onCancel when Cancel is pressed', () => {
    const onCancel = jest.fn()
    render(<IssueForm {...defaultProps} onCancel={onCancel} />)

    fireEvent.press(screen.getByLabelText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables Create when title is empty', () => {
    render(<IssueForm {...defaultProps} />)

    const createButton = screen.getByLabelText('Create issue')
    expect(createButton.props.accessibilityState?.disabled).toBe(true)
  })

  it('enables Create when title has text', () => {
    useTrackerStore.setState({
      issueDraft: {
        title: 'New issue',
        description: '',
        priority: 0,
        statusId: null,
        assigneeId: null,
        projectId: null,
      },
    })

    render(<IssueForm {...defaultProps} />)

    const createButton = screen.getByLabelText('Create issue')
    expect(createButton.props.accessibilityState?.disabled).toBe(false)
  })

  it('calls onSubmit when Create is pressed with valid title', () => {
    useTrackerStore.setState({
      issueDraft: {
        title: 'Valid title',
        description: '',
        priority: 0,
        statusId: null,
        assigneeId: null,
        projectId: null,
      },
    })
    const onSubmit = jest.fn()

    render(<IssueForm {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.press(screen.getByLabelText('Create issue'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not call onSubmit when title is empty', () => {
    const onSubmit = jest.fn()
    render(<IssueForm {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.press(screen.getByLabelText('Create issue'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('updates draft when title changes', () => {
    render(<IssueForm {...defaultProps} />)

    fireEvent.changeText(screen.getByLabelText('Issue title'), 'New title')

    expect(useTrackerStore.getState().issueDraft.title).toBe('New title')
  })

  it('selects priority option', () => {
    render(<IssueForm {...defaultProps} />)

    fireEvent.press(screen.getByLabelText('Priority: High'))

    expect(useTrackerStore.getState().issueDraft.priority).toBe(2)
  })

  it('shows validation error when title is empty and form is dirty', () => {
    // Set dirty state (e.g., description has content)
    useTrackerStore.setState({
      issueDraft: {
        title: '',
        description: 'Some description',
        priority: 0,
        statusId: null,
        assigneeId: null,
        projectId: null,
      },
    })

    render(<IssueForm {...defaultProps} />)

    expect(screen.getByText('Title is required')).toBeTruthy()
  })

  it('does not show validation error when form is pristine', () => {
    render(<IssueForm {...defaultProps} />)

    expect(screen.queryByText('Title is required')).toBeNull()
  })

  it('disables Create when isSubmitting is true', () => {
    useTrackerStore.setState({
      issueDraft: {
        title: 'Valid title',
        description: '',
        priority: 0,
        statusId: null,
        assigneeId: null,
        projectId: null,
      },
    })

    render(<IssueForm {...defaultProps} isSubmitting />)

    const createButton = screen.getByLabelText('Create issue')
    expect(createButton.props.accessibilityState?.disabled).toBe(true)
  })
})
