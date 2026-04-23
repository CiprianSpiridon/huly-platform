import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, View, Text, TextInput, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import type { Doc, Ref, Space } from '@hcengineering/core'
import type { Issue, IssueStatus } from '@hcengineering/tracker'

import { useIssue, useIssueRelations } from '@/hooks/useIssue'
import { useUpdateIssue, useUpdateIssueField, useDeleteIssue, useSubIssues } from '@/hooks/useIssues'
import { useComponents, useMilestones, useLabels } from '@/hooks/useProjects'
import { useDocAttachments } from '@/hooks/useAttachments'
import { useDeleteAttachment } from '@/hooks'
import { useConnectionStore } from '@/store/connection'
import { showInfoToast } from '@/store/toast'
import { IssueDetailView, type AttachmentInfo } from '@/components/features/IssueDetail'
import { IssueComments } from '@/components/features/IssueComments'
import { StatusPicker } from '@/components/features/StatusPicker'
import { PriorityPicker } from '@/components/features/PriorityPicker'
import { AssigneePicker } from '@/components/features/AssigneePicker'
import { ComponentPicker } from '@/components/features/ComponentPicker'
import { MilestonePicker } from '@/components/features/MilestonePicker'
import { AttachmentButton } from '@/components/features/AttachmentButton'
import { AttachmentViewer } from '@/components/features/AttachmentViewer'
import { UploadProgress } from '@/components/features/UploadProgress'
import type { IssuePriorityValue } from '@/components/ui/PriorityIcon'

/**
 * Issue detail screen.
 *
 * Displays all issue fields with editable status/priority/assignee/component/
 * milestone via bottom sheet pickers. Includes inline title editing, due date
 * picker, estimation input, comments section, delete flow, and pull-to-refresh.
 */
export default function IssueDetailScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const currentSocialId = useConnectionStore((s) => s.currentSocialId)
  const { data: issue, isLoading, error, refetch } = useIssue(id)
  const { data: attachments, refetch: refetchAttachments } = useDocAttachments(
    issue != null ? (issue._id as string) : undefined
  )
  const { data: subIssues } = useSubIssues(issue != null ? (issue._id as string) : undefined)
  const { data: relations } = useIssueRelations(issue != null ? (issue._id as string) : undefined)
  const { data: labels } = useLabels(issue != null ? (issue._id as string) : undefined)
  const { data: components } = useComponents(issue != null ? (issue.space as string) : undefined)
  const { data: milestones } = useMilestones(issue != null ? (issue.space as string) : undefined)

  const updateIssue = useUpdateIssue()
  const updateIssueField = useUpdateIssueField()
  const deleteIssueMutation = useDeleteIssue()
  const deleteAttachment = useDeleteAttachment()
  // Gate against double-tap on the X overlay before the confirmation Alert
  // is dismissed: without this, two taps stack two Alerts and the second
  // confirm fires a duplicate TxRemoveDoc that returns "not found", showing
  // the user a spurious error toast for a delete that succeeded.
  const deleteAlertOpenRef = useRef(false)
  const [refreshing, setRefreshing] = useState(false)

  // Date input state
  const [showDateInput, setShowDateInput] = useState(false)
  const [dateInputValue, setDateInputValue] = useState('')

  // Estimation input state
  const [showEstimationInput, setShowEstimationInput] = useState(false)
  const [estimationValue, setEstimationValue] = useState('')

  // Bottom sheet refs
  const statusPickerRef = useRef<BottomSheetModal>(null)
  const priorityPickerRef = useRef<BottomSheetModal>(null)
  const assigneePickerRef = useRef<BottomSheetModal>(null)
  const componentPickerRef = useRef<BottomSheetModal>(null)
  const milestonePickerRef = useRef<BottomSheetModal>(null)

  // Attachment viewer state
  const [viewedAttachment, setViewedAttachment] = useState<{
    blobId: string
    filename: string
    mimeType: string
  } | null>(null)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetch(), refetchAttachments()])
    } finally {
      setRefreshing(false)
    }
  }, [refetch, refetchAttachments])

  const handleStatusPress = useCallback(() => {
    statusPickerRef.current?.present()
  }, [])

  const handlePriorityPress = useCallback(() => {
    priorityPickerRef.current?.present()
  }, [])

  const handleAssigneePress = useCallback(() => {
    assigneePickerRef.current?.present()
  }, [])

  const handleComponentPress = useCallback(() => {
    componentPickerRef.current?.present()
  }, [])

  const handleMilestonePress = useCallback(() => {
    milestonePickerRef.current?.present()
  }, [])

  const handleDueDatePress = useCallback(() => {
    if (issue != null) {
      const existing = issue.dueDate ? new Date(issue.dueDate) : null
      setDateInputValue(
        existing != null
          ? `${existing.getFullYear()}-${String(existing.getMonth() + 1).padStart(2, '0')}-${String(existing.getDate()).padStart(2, '0')}`
          : ''
      )
      setShowDateInput(true)
    }
  }, [issue])

  const handleEstimationPress = useCallback(() => {
    if (issue != null) {
      setEstimationValue(issue.estimation > 0 ? String(issue.estimation) : '')
      setShowEstimationInput(true)
    }
  }, [issue])

  const handleEstimationSave = useCallback(() => {
    if (issue == null) return
    setShowEstimationInput(false)
    const num = parseFloat(estimationValue)
    const newValue = isNaN(num) ? 0 : num
    if (newValue !== issue.estimation) {
      updateIssueField.mutate(
        {
          issueId: issue._id as Ref<Issue>,
          projectId: issue.space as Ref<Space>,
          field: 'estimation',
          value: newValue,
        },
        {
          onError: () => {
            Alert.alert('Update failed', 'Could not update estimation.')
          },
        }
      )
    }
  }, [issue, estimationValue, updateIssueField])

  const handleDateSave = useCallback(() => {
    if (issue == null) return
    setShowDateInput(false)
    const parsed = Date.parse(dateInputValue)
    if (!isNaN(parsed)) {
      updateIssueField.mutate(
        {
          issueId: issue._id as Ref<Issue>,
          projectId: issue.space as Ref<Space>,
          field: 'dueDate',
          value: parsed,
        },
        {
          onError: () => {
            Alert.alert('Update failed', 'Could not update due date.')
          },
        }
      )
    }
  }, [issue, dateInputValue, updateIssueField])

  const handleDateClear = useCallback(() => {
    if (issue == null) return
    setShowDateInput(false)
    updateIssueField.mutate(
      {
        issueId: issue._id as Ref<Issue>,
        projectId: issue.space as Ref<Space>,
        field: 'dueDate',
        value: null,
      },
      {
        onError: () => {
          Alert.alert('Update failed', 'Could not clear due date.')
        },
      }
    )
  }, [issue, updateIssueField])

  const handleAssigneeSelect = useCallback(
    (memberId: Ref<Doc> | null) => {
      if (issue == null) return
      updateIssue.mutate(
        {
          issueId: issue._id as Ref<Issue>,
          projectId: issue.space as Ref<Space>,
          update: { assignee: memberId },
        },
        {
          onError: () => {
            Alert.alert('Update failed', 'Could not update the issue.')
          },
        }
      )
    },
    [issue, updateIssue]
  )

  const handleComponentSelect = useCallback(
    (componentId: Ref<Doc> | null) => {
      if (issue == null) return
      updateIssueField.mutate(
        {
          issueId: issue._id as Ref<Issue>,
          projectId: issue.space as Ref<Space>,
          field: 'component',
          value: componentId,
        },
        {
          onError: () => {
            Alert.alert('Update failed', 'Could not update component.')
          },
        }
      )
    },
    [issue, updateIssueField]
  )

  const handleMilestoneSelect = useCallback(
    (milestoneId: Ref<Doc> | null) => {
      if (issue == null) return
      updateIssueField.mutate(
        {
          issueId: issue._id as Ref<Issue>,
          projectId: issue.space as Ref<Space>,
          field: 'milestone',
          value: milestoneId,
        },
        {
          onError: () => {
            Alert.alert('Update failed', 'Could not update milestone.')
          },
        }
      )
    },
    [issue, updateIssueField]
  )

  const handleAttachmentPress = useCallback(
    (blobId: string, filename: string, mimeType: string) => {
      setViewedAttachment({ blobId, filename, mimeType })
    },
    []
  )

  const handleAttachmentDelete = useCallback(
    (att: AttachmentInfo) => {
      // Skip if a confirmation Alert is already showing (prevents stacking
      // multiple Alerts on rapid double-tap) or if a delete is already in
      // flight (prevents firing a second TxRemoveDoc on a different
      // attachment while the first hasn't resolved).
      if (deleteAlertOpenRef.current || deleteAttachment.isPending) {
        return
      }
      // Defensive guard: a stale-cached AttachmentMeta from before TASK-009
      // may not carry the doc identity needed for TxRemoveDoc. The mapper
      // writes empty-string fallbacks for missing fields, so we check for
      // both null/undefined AND empty strings before issuing the tx.
      if (
        att._id == null || att._id === '' ||
        att.space == null || att.space === '' ||
        att.attachedTo == null || att.attachedTo === ''
      ) {
        showInfoToast('Cannot delete this attachment')
        return
      }
      const targetId = att._id
      const targetSpace = att.space
      const targetAttachedTo = att.attachedTo
      deleteAlertOpenRef.current = true
      Alert.alert(
        'Delete attachment?',
        'This cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              deleteAlertOpenRef.current = false
            },
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteAlertOpenRef.current = false
              // onError on the hook surfaces the toast; success-side cache
              // invalidation removes the row from the displayed list.
              deleteAttachment.mutate({
                _id: targetId,
                space: targetSpace,
                attachedTo: targetAttachedTo,
              })
            },
          },
        ],
        {
          onDismiss: () => {
            deleteAlertOpenRef.current = false
          },
        }
      )
    },
    [deleteAttachment]
  )

  const handleCloseAttachmentViewer = useCallback(() => {
    setViewedAttachment(null)
  }, [])

  const handleStatusSelect = useCallback(
    (statusId: Ref<IssueStatus>) => {
      if (issue == null) return
      updateIssue.mutate(
        {
          issueId: issue._id as Ref<Issue>,
          projectId: issue.space as Ref<Space>,
          update: { status: statusId },
        },
        {
          onError: () => {
            Alert.alert('Update failed', 'Could not update the issue.')
          },
        }
      )
    },
    [issue, updateIssue]
  )

  const handlePrioritySelect = useCallback(
    (priority: IssuePriorityValue) => {
      if (issue == null) return
      updateIssue.mutate(
        {
          issueId: issue._id as Ref<Issue>,
          projectId: issue.space as Ref<Space>,
          update: { priority },
        },
        {
          onError: () => {
            Alert.alert('Update failed', 'Could not update the issue.')
          },
        }
      )
    },
    [issue, updateIssue]
  )

  const handleTitleSave = useCallback(
    (title: string) => {
      if (issue == null) return
      updateIssueField.mutate(
        {
          issueId: issue._id as Ref<Issue>,
          projectId: issue.space as Ref<Space>,
          field: 'title',
          value: title,
        },
        {
          onError: () => {
            Alert.alert('Update failed', 'Could not update the title.')
          },
        }
      )
    },
    [issue, updateIssueField]
  )

  const handleDeletePress = useCallback(() => {
    if (issue == null) return
    Alert.alert(
      'Delete Issue',
      `Are you sure you want to delete "${issue.identifier}: ${issue.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteIssueMutation.mutate(
              {
                issueId: issue._id as Ref<Issue>,
                projectId: issue.space as Ref<Space>,
              },
              {
                onSuccess: () => {
                  router.back()
                },
                onError: (err) => {
                  Alert.alert('Delete failed', err.message)
                },
              }
            )
          },
        },
      ]
    )
  }, [issue, deleteIssueMutation])

  const handleEditPress = useCallback(() => {
    if (issue == null) return
    router.push(`/(app)/tracker/edit/${issue._id}` as Href)
  }, [issue])

  const handleSubIssuePress = useCallback((issueId: string) => {
    router.push(`/(app)/tracker/issue/${issueId}` as Href)
  }, [])

  const handleRelationPress = useCallback((issueId: string) => {
    router.push(`/(app)/tracker/issue/${issueId}` as Href)
  }, [])

  const handleParentIssuePress = useCallback(() => {
    if (issue == null) return
    const parentId = (issue as unknown as Record<string, unknown>).attachedTo as string | null
    if (parentId != null) {
      router.push(`/(app)/tracker/issue/${parentId}` as Href)
    }
  }, [issue])

  useEffect(() => {
    if (!id) router.replace('/(app)/tracker' as Href)
  }, [id])

  if (!id) return null

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Issue' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
        </View>
      </SafeAreaView>
    )
  }

  // Error / not found state
  if (error || !issue) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Issue' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            {error ? 'Failed to load issue' : 'Issue not found'}
          </Text>
          {error ? (
            <Text className="font-sans text-sm text-content mt-1 text-center">
              {error.message}
            </Text>
          ) : (
            <Text className="font-sans text-sm text-content mt-1 text-center">
              This issue may have been deleted.
            </Text>
          )}
          <Pressable
            className="bg-primary rounded-md px-6 py-3 mt-4 min-h-[44px] items-center justify-center"
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text className="font-sans-medium text-sm text-on-accent">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: issue.identifier,
          headerBackTitle: 'Issues',
        }}
      />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#205DC2"
            progressBackgroundColor="#1E1F23"
          />
        }
      >
        <IssueDetailView
          issue={issue}
          attachments={attachments?.map((a) => ({
            blobId: a.blobId,
            name: a.name,
            size: a.size,
            contentType: a.contentType,
            // Forward the doc-identity fields from TASK-009's extended
            // AttachmentMeta so the delete handler can build TxRemoveDoc.
            _id: a._id,
            space: a.space,
            attachedTo: a.attachedTo,
          }))}
          subIssues={subIssues}
          relations={relations}
          labels={labels}
          components={components}
          milestones={milestones}
          onStatusPress={handleStatusPress}
          onPriorityPress={handlePriorityPress}
          onAssigneePress={handleAssigneePress}
          onComponentPress={handleComponentPress}
          onMilestonePress={handleMilestonePress}
          onDueDatePress={handleDueDatePress}
          onEstimationPress={handleEstimationPress}
          onParentIssuePress={handleParentIssuePress}
          onSubIssuePress={handleSubIssuePress}
          onRelationPress={handleRelationPress}
          onAttachmentPress={handleAttachmentPress}
          onAttachmentDelete={handleAttachmentDelete}
          onTitleSave={handleTitleSave}
          onDeletePress={handleDeletePress}
          onEditPress={handleEditPress}
        />

        {/* Attach button */}
        <View className="flex-row items-center px-4 pb-2">
          <AttachmentButton />
        </View>

        <View className="h-px bg-divider mx-4" />

        <IssueComments
          issueId={issue._id as string}
          projectId={issue.space as string}
          currentUserId={currentSocialId ?? undefined}
        />
      </ScrollView>

      {/* Estimation input overlay */}
      {showEstimationInput ? (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-8">
          <View className="bg-surface-secondary rounded-lg p-4 w-full max-w-sm">
            <Text className="font-sans-semibold text-base text-content-primary mb-3">
              Set Estimation (hours)
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 bg-surface-tertiary rounded-md border border-border-primary px-3 py-2">
                <Pressable>
                  <Text className="font-sans text-sm text-content-primary">
                    {estimationValue || '0'}
                  </Text>
                </Pressable>
              </View>
            </View>
            {/* Number pad row */}
            <View className="flex-row flex-wrap gap-2 mt-3">
              {['1', '2', '3', '4', '5', '8', '13', '21'].map((num) => (
                <Pressable
                  key={num}
                  className="bg-surface-tertiary rounded-md px-3 py-2 min-h-[40px] min-w-[48px] items-center justify-center"
                  onPress={() => setEstimationValue(num)}
                  accessibilityRole="button"
                  accessibilityLabel={`${num} hours`}
                >
                  <Text className="font-sans-medium text-sm text-caption">{num}h</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row gap-3 mt-4">
              <Pressable
                className="flex-1 bg-surface-tertiary rounded-md py-3 min-h-[44px] items-center justify-center"
                onPress={() => {
                  setShowEstimationInput(false)
                  // Clear estimation
                  if (issue != null && issue.estimation > 0) {
                    updateIssueField.mutate({
                      issueId: issue._id as Ref<Issue>,
                      projectId: issue.space as Ref<Space>,
                      field: 'estimation',
                      value: 0,
                    })
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear estimation"
              >
                <Text className="font-sans-medium text-sm text-caption">Clear</Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-primary rounded-md py-3 min-h-[44px] items-center justify-center"
                onPress={handleEstimationSave}
                accessibilityRole="button"
                accessibilityLabel="Save estimation"
              >
                <Text className="font-sans-medium text-sm text-on-accent">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Date input overlay */}
      {showDateInput ? (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-8">
          <View className="bg-surface-secondary rounded-lg p-4 w-full max-w-sm">
            <Text className="font-sans-semibold text-base text-content-primary mb-3">
              Set Due Date
            </Text>
            <TextInput
              className="bg-surface-tertiary text-caption font-sans text-base rounded-md px-3 py-2.5 border border-border-primary mb-3"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#77818B"
              value={dateInputValue}
              onChangeText={setDateInputValue}
              autoFocus
              accessibilityLabel="Due date in YYYY-MM-DD format"
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 bg-surface-tertiary rounded-md py-3 min-h-[44px] items-center justify-center"
                onPress={handleDateClear}
                accessibilityRole="button"
                accessibilityLabel="Clear due date"
              >
                <Text className="font-sans-medium text-sm text-caption">Clear</Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-primary rounded-md py-3 min-h-[44px] items-center justify-center"
                onPress={handleDateSave}
                accessibilityRole="button"
                accessibilityLabel="Save due date"
              >
                <Text className="font-sans-medium text-sm text-on-accent">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Upload progress overlay */}
      <UploadProgress />

      {/* Attachment viewer modal */}
      <AttachmentViewer
        attachment={viewedAttachment}
        onClose={handleCloseAttachmentViewer}
      />

      {/* Bottom sheet pickers */}
      <StatusPicker
        ref={statusPickerRef}
        projectId={issue.space as string}
        currentStatusId={issue.status as unknown as string}
        onSelect={handleStatusSelect}
      />
      <PriorityPicker
        ref={priorityPickerRef}
        currentPriority={issue.priority}
        onSelect={handlePrioritySelect}
      />
      <AssigneePicker
        ref={assigneePickerRef}
        currentAssigneeId={issue.assignee as string | null}
        onSelect={handleAssigneeSelect}
      />
      <ComponentPicker
        ref={componentPickerRef}
        projectId={issue.space as string}
        currentComponentId={(issue as unknown as Record<string, unknown>).component as string | null}
        onSelect={handleComponentSelect}
      />
      <MilestonePicker
        ref={milestonePickerRef}
        projectId={issue.space as string}
        currentMilestoneId={(issue as unknown as Record<string, unknown>).milestone as string | null}
        onSelect={handleMilestoneSelect}
      />
    </SafeAreaView>
  )
}
