import { useCallback, useEffect, useState } from 'react'
import { Alert, View, Text, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Ref, Space, Doc } from '@hcengineering/core'
import type { Issue, IssueStatus } from '@hcengineering/tracker'

import { useIssue } from '@/hooks/useIssue'
import { useUpdateIssue } from '@/hooks/useIssues'
import { type IssueDraftState } from '@/store/tracker'
import { IssueForm } from '@/components/features/IssueForm'
import { textToMarkup } from '@/components/features/RichTextEditor'

const EMPTY_EDIT_DRAFT: IssueDraftState = {
  title: '',
  description: '',
  priority: 0,
  statusId: null,
  assigneeId: null,
  projectId: null,
  componentId: null,
  milestoneId: null,
  dueDate: null,
  estimation: null,
  parentIssueId: null,
  labels: [],
}

/**
 * Edit issue screen.
 *
 * Uses local state for edit form fields so the shared create-draft store
 * is never clobbered. Populates local state from the fetched issue, then
 * passes it to IssueForm via the overrideDraft / onOverrideDraftChange props.
 */
export default function EditIssueScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: issue, isLoading, error } = useIssue(id)
  const updateIssue = useUpdateIssue()
  const [editDraft, setEditDraft] = useState<IssueDraftState>(EMPTY_EDIT_DRAFT)

  // Preload local draft from issue data
  useEffect(() => {
    if (issue != null) {
      const issueRecord = issue as unknown as Record<string, unknown>
      setEditDraft({
        title: issue.title,
        description: typeof issue.description === 'string' ? issue.description : '',
        priority: issue.priority,
        statusId: issue.status as Ref<IssueStatus>,
        assigneeId: (issue.assignee ?? null) as Ref<Doc> | null,
        projectId: issue.space as Ref<Space>,
        componentId: (issueRecord.component ?? null) as Ref<Doc> | null,
        milestoneId: (issueRecord.milestone ?? null) as Ref<Doc> | null,
        dueDate: typeof issue.dueDate === 'number' ? issue.dueDate : null,
        estimation: issue.estimation > 0 ? issue.estimation : null,
        parentIssueId: (issueRecord.attachedTo ?? null) as Ref<Doc> | null,
        labels: [],
      })
    }
  }, [issue]) // eslint-disable-line react-hooks/exhaustive-deps -- only run when issue loads

  const handleEditDraftChange = useCallback((patch: Partial<IssueDraftState>) => {
    setEditDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleSubmit = useCallback(() => {
    if (issue == null) return

    let description = editDraft.description
    if (description.length > 0 && !description.startsWith('{')) {
      description = JSON.stringify(textToMarkup(description))
    }

    const update: Record<string, unknown> = {
      title: editDraft.title,
      description,
      priority: editDraft.priority,
    }
    if (editDraft.statusId != null) update.status = editDraft.statusId
    if (editDraft.assigneeId !== undefined) update.assignee = editDraft.assigneeId
    if (editDraft.componentId !== undefined) update.component = editDraft.componentId
    if (editDraft.milestoneId !== undefined) update.milestone = editDraft.milestoneId
    if (editDraft.dueDate !== undefined) update.dueDate = editDraft.dueDate
    if (editDraft.estimation !== undefined) update.estimation = editDraft.estimation ?? 0

    updateIssue.mutate(
      {
        issueId: issue._id as Ref<Issue>,
        projectId: issue.space as Ref<Space>,
        update,
      },
      {
        onSuccess: () => {
          router.back()
        },
        onError: (err) => {
          Alert.alert('Failed to update issue', err.message)
        },
      }
    )
  }, [issue, editDraft, updateIssue])

  const handleCancel = useCallback(() => {
    router.back()
  }, [])

  useEffect(() => {
    if (!id) router.replace('/(app)/tracker' as Href)
  }, [id])

  if (!id) return null

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Edit Issue' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error != null || issue == null) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Edit Issue' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            {error != null ? 'Failed to load issue' : 'Issue not found'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          title: `Edit ${issue.identifier}`,
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
          isSubmitting={updateIssue.isPending}
          submitLabel="Save"
          overrideDraft={editDraft}
          onOverrideDraftChange={handleEditDraftChange}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
