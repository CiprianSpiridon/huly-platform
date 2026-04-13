import { useCallback, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import type { Ref, Space } from '@hcengineering/core'
import type { IssueStatus } from '@hcengineering/tracker'

import { useTrackerStore } from '@/store/tracker'
import { useCreateIssue } from '@/hooks/useIssues'
import { useProjects } from '@/hooks/useProjects'
import { IssueForm } from '@/components/features/IssueForm'
import { textToMarkup } from '@/components/features/RichTextEditor'

/**
 * Create issue modal screen.
 *
 * Uses Zustand draft persistence so navigating away preserves the form.
 * On submit, creates the issue via mutation and invalidates the project
 * issue list query.
 */
export default function CreateIssueScreen(): React.ReactNode {
  const draft = useTrackerStore((s) => s.issueDraft)
  const clearDraft = useTrackerStore((s) => s.clearDraft)
  const selectedProjectId = useTrackerStore((s) => s.selectedProjectId)
  const createIssue = useCreateIssue()

  // Get project's default status for new issues
  const { data: projects } = useProjects()
  const currentProject = projects?.find((p) => (p._id as string) === (selectedProjectId as string | null))
  const defaultStatus = (currentProject as Record<string, unknown> | undefined)?.defaultIssueStatus as Ref<IssueStatus> | undefined

  const isDirty = draft.title.length > 0 || draft.description.length > 0 || draft.priority !== 0

  const handleSubmit = useCallback(() => {
    const projectId = draft.projectId ?? selectedProjectId
    if (projectId === null) {
      Alert.alert('No project selected', 'Please select a project first.')
      return
    }

    const resolvedStatus = draft.statusId ?? defaultStatus
    if (resolvedStatus == null || resolvedStatus === '') {
      Alert.alert('No status available', 'Project data is still loading. Please try again.')
      return
    }

    let description = draft.description
    if (description.length > 0 && !description.startsWith('{')) {
      description = JSON.stringify(textToMarkup(description))
    }

    createIssue.mutate(
      {
        title: draft.title,
        description,
        priority: draft.priority,
        status: resolvedStatus as Ref<IssueStatus>,
        assignee: draft.assigneeId,
        projectId: projectId as Ref<Space>,
      },
      {
        onSuccess: () => {
          clearDraft()
          router.back()
        },
        onError: (error) => {
          Alert.alert('Failed to create issue', error.message)
        },
      }
    )
  }, [draft, selectedProjectId, createIssue, clearDraft, defaultStatus])

  const handleCancel = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              clearDraft()
              router.back()
            },
          },
        ]
      )
    } else {
      router.back()
    }
  }, [isDirty, clearDraft])

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'New Issue',
          presentation: 'modal',
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <IssueForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createIssue.isPending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
