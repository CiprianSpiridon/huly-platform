import { useCallback, useRef, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import type { Doc, Ref, Space } from '@hcengineering/core'
import type { Issue, IssueStatus } from '@hcengineering/tracker'

import { useIssue } from '@/hooks/useIssue'
import { useUpdateIssue } from '@/hooks/useIssues'
import { IssueDetailView } from '@/components/features/IssueDetail'
import { IssueComments } from '@/components/features/IssueComments'
import { StatusPicker } from '@/components/features/StatusPicker'
import { PriorityPicker } from '@/components/features/PriorityPicker'
import { AssigneePicker } from '@/components/features/AssigneePicker'
import { AttachmentButton } from '@/components/features/AttachmentButton'
import { AttachmentViewer } from '@/components/features/AttachmentViewer'
import { UploadProgress } from '@/components/features/UploadProgress'
import type { IssuePriorityValue } from '@/components/ui/PriorityIcon'

/**
 * Issue detail screen.
 *
 * Displays all issue fields with editable status/priority/assignee via
 * bottom sheet pickers. Includes comments section and pull-to-refresh.
 */
export default function IssueDetailScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: issue, isLoading, error, refetch } = useIssue(id)
  const updateIssue = useUpdateIssue()
  const [refreshing, setRefreshing] = useState(false)

  // Bottom sheet refs
  const statusPickerRef = useRef<BottomSheetModal>(null)
  const priorityPickerRef = useRef<BottomSheetModal>(null)
  const assigneePickerRef = useRef<BottomSheetModal>(null)

  // Attachment viewer state
  const [viewedAttachment, setViewedAttachment] = useState<{
    blobId: string
    filename: string
    mimeType: string
  } | null>(null)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleStatusPress = useCallback(() => {
    statusPickerRef.current?.present()
  }, [])

  const handlePriorityPress = useCallback(() => {
    priorityPickerRef.current?.present()
  }, [])

  const handleAssigneePress = useCallback(() => {
    assigneePickerRef.current?.present()
  }, [])

  const handleAssigneeSelect = useCallback(
    (memberId: Ref<Doc> | null) => {
      if (issue == null) return
      updateIssue.mutate({
        issueId: issue._id as Ref<Issue>,
        projectId: issue.space as Ref<Space>,
        update: { assignee: memberId },
      })
    },
    [issue, updateIssue]
  )

  const handleAttachmentPress = useCallback(
    (blobId: string, filename: string, mimeType: string) => {
      setViewedAttachment({ blobId, filename, mimeType })
    },
    []
  )

  const handleCloseAttachmentViewer = useCallback(() => {
    setViewedAttachment(null)
  }, [])

  const handleStatusSelect = useCallback(
    (statusId: Ref<IssueStatus>) => {
      if (issue == null) return
      updateIssue.mutate({
        issueId: issue._id as Ref<Issue>,
        projectId: issue.space as Ref<Space>,
        update: { status: statusId },
      })
    },
    [issue, updateIssue]
  )

  const handlePrioritySelect = useCallback(
    (priority: IssuePriorityValue) => {
      if (issue == null) return
      updateIssue.mutate({
        issueId: issue._id as Ref<Issue>,
        projectId: issue.space as Ref<Space>,
        update: { priority },
      })
    },
    [issue, updateIssue]
  )

  if (!id) {
    router.back()
    return null
  }

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
          onStatusPress={handleStatusPress}
          onPriorityPress={handlePriorityPress}
          onAssigneePress={handleAssigneePress}
          onAttachmentPress={handleAttachmentPress}
        />

        {/* Attach button */}
        <View className="flex-row items-center px-4 pb-2">
          <AttachmentButton />
        </View>

        <View className="h-px bg-divider mx-4" />

        <IssueComments
          issueId={issue._id as string}
          projectId={issue.space as string}
        />
      </ScrollView>

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
    </SafeAreaView>
  )
}
