/**
 * Issue detail view component.
 *
 * Renders all issue fields: title, description, status, priority,
 * assignee, component, milestone, due date, estimation, time tracking,
 * sub-issues, relations, and labels. Title and description are editable
 * inline.
 */

import { useCallback, useState } from 'react'
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Doc, Ref, Space } from '@hcengineering/core'
import type { Issue } from '@hcengineering/tracker'
import { getStatusName, getAssigneeName } from '@/lib/lookup'

import { PriorityIcon, ISSUE_PRIORITY } from '@/components/ui/PriorityIcon'
import { AvatarCircle } from '@/components/ui/AvatarCircle'
import { AttachmentThumbnail } from '@/components/features/AttachmentThumbnail'
import { MarkupRenderer } from '@/components/features/MarkupRenderer'
import type { ComponentItem, MilestoneItem, LabelItem, IssueRelationItem } from '@/repositories/tracker'

interface AttachmentInfo {
  blobId: string
  name: string
  size: number
  contentType: string
  // Doc identity for TxRemoveDoc — optional to keep older callers compiling
  // and to match the defensive runtime guard in tracker/issue/[id].tsx that
  // skips delete when these fields are missing on a stale-cached attachment.
  _id?: Ref<Doc>
  space?: Ref<Space>
  attachedTo?: Ref<Doc>
  // Optional Attachment-doc readonly flag. When true the parent screen hides
  // the delete affordance to avoid promising an action the server will reject.
  readonly?: boolean
}

interface IssueDetailViewProps {
  issue: Issue
  attachments?: AttachmentInfo[]
  subIssues?: Issue[]
  relations?: IssueRelationItem[]
  labels?: LabelItem[]
  components?: ComponentItem[]
  milestones?: MilestoneItem[]
  onStatusPress?: () => void
  onPriorityPress?: () => void
  onAssigneePress?: () => void
  onComponentPress?: () => void
  onMilestonePress?: () => void
  onDueDatePress?: () => void
  onEstimationPress?: () => void
  onParentIssuePress?: () => void
  onSubIssuePress?: (issueId: string) => void
  onRelationPress?: (issueId: string) => void
  onAttachmentPress?: (blobId: string, filename: string, mimeType: string) => void
  onAttachmentDelete?: (att: AttachmentInfo) => void
  onTitleSave?: (title: string) => void
  onDescriptionSave?: (description: string) => void
  onDeletePress?: () => void
  onEditPress?: () => void
  testID?: string
}

const PRIORITY_LABELS: Record<number, string> = {
  [ISSUE_PRIORITY.NoPriority]: 'No priority',
  [ISSUE_PRIORITY.Urgent]: 'Urgent',
  [ISSUE_PRIORITY.High]: 'High',
  [ISSUE_PRIORITY.Medium]: 'Medium',
  [ISSUE_PRIORITY.Low]: 'Low',
}

const LABEL_COLORS: Record<number, string> = {
  0: '#77818B',
  1: '#EF4444',
  2: '#F59E0B',
  3: '#10B981',
  4: '#3B82F6',
  5: '#8B5CF6',
  6: '#EC4899',
  7: '#14B8A6',
  8: '#F97316',
  9: '#6366F1',
}

function IssueDetailView({
  issue,
  attachments,
  subIssues,
  relations,
  labels,
  components,
  milestones,
  onStatusPress,
  onPriorityPress,
  onAssigneePress,
  onComponentPress,
  onMilestonePress,
  onDueDatePress,
  onEstimationPress,
  onParentIssuePress,
  onSubIssuePress,
  onRelationPress,
  onAttachmentPress,
  onAttachmentDelete,
  onTitleSave,
  onDescriptionSave,
  onDeletePress,
  onEditPress,
  testID,
}: IssueDetailViewProps): React.ReactNode {
  const lookupStatusName = getStatusName(issue)
  const lookupAssigneeName = getAssigneeName(issue)

  // Inline title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(issue.title)

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false)
    const trimmed = editTitle.trim()
    if (trimmed.length > 0 && trimmed !== issue.title) {
      onTitleSave?.(trimmed)
    } else {
      setEditTitle(issue.title)
    }
  }, [editTitle, issue.title, onTitleSave])

  const handleTitlePress = useCallback(() => {
    if (onTitleSave != null) {
      setEditTitle(issue.title)
      setIsEditingTitle(true)
    }
  }, [issue.title, onTitleSave])

  // Resolve component/milestone names from refs
  const issueRecord = issue as unknown as Record<string, unknown>
  const componentId = issueRecord.component as string | null | undefined
  const milestoneId = issueRecord.milestone as string | null | undefined
  const componentName = componentId != null
    ? components?.find((c) => c._id === componentId)?.name
    : undefined
  const milestoneName = milestoneId != null
    ? milestones?.find((m) => m._id === milestoneId)?.name
    : undefined

  return (
    <View className="px-4 py-3" testID={testID}>
      {/* Header row with actions */}
      <View className="flex-row items-start justify-between mb-1">
        {/* Title */}
        <View className="flex-1 mr-2">
          {isEditingTitle ? (
            <TextInput
              className="font-sans-bold text-xl text-caption bg-surface-tertiary rounded-md px-2 py-1 border border-border-primary"
              value={editTitle}
              onChangeText={setEditTitle}
              onBlur={handleTitleBlur}
              onSubmitEditing={handleTitleBlur}
              autoFocus
              accessibilityLabel="Edit issue title"
            />
          ) : (
            <Pressable
              onPress={handleTitlePress}
              accessibilityRole="button"
              accessibilityLabel={`Title: ${issue.title}. Tap to edit.`}
            >
              <Text className="font-sans-bold text-xl text-caption">
                {issue.title}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-1">
          {onEditPress != null ? (
            <Pressable
              className="p-2 min-h-[36px] min-w-[36px] items-center justify-center"
              onPress={onEditPress}
              accessibilityRole="button"
              accessibilityLabel="Edit issue"
            >
              <Ionicons name="create-outline" size={20} color="#77818B" />
            </Pressable>
          ) : null}
          {onDeletePress != null ? (
            <Pressable
              className="p-2 min-h-[36px] min-w-[36px] items-center justify-center"
              onPress={onDeletePress}
              accessibilityRole="button"
              accessibilityLabel="Delete issue"
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Identifier */}
      <Text className="font-sans-medium text-sm text-content-secondary mb-4">
        {issue.identifier}
      </Text>

      {/* Property rows */}
      <View className="gap-3">
        {/* Status */}
        <PropertyRow label="Status">
          <Pressable
            className="bg-surface-tertiary rounded-sm px-2 py-1 min-h-[32px] items-center justify-center"
            onPress={onStatusPress}
            accessibilityRole="button"
            accessibilityLabel={`Status: ${lookupStatusName}`}
          >
            <Text className="font-sans-medium text-xs text-caption">
              {lookupStatusName}
            </Text>
          </Pressable>
        </PropertyRow>

        {/* Priority */}
        <PropertyRow label="Priority">
          <Pressable
            className="flex-row items-center gap-2 min-h-[32px]"
            onPress={onPriorityPress}
            accessibilityRole="button"
            accessibilityLabel={`Priority: ${PRIORITY_LABELS[issue.priority] ?? 'Unknown'}`}
          >
            <PriorityIcon priority={issue.priority} size={16} />
            <Text className="font-sans text-sm text-caption">
              {PRIORITY_LABELS[issue.priority] ?? 'Unknown'}
            </Text>
          </Pressable>
        </PropertyRow>

        {/* Assignee */}
        <PropertyRow label="Assignee">
          <Pressable
            className="flex-row items-center gap-2 min-h-[32px]"
            onPress={onAssigneePress}
            accessibilityRole="button"
            accessibilityLabel={lookupAssigneeName != null ? `Assignee: ${lookupAssigneeName}` : 'Set assignee'}
          >
            {lookupAssigneeName != null ? (
              <>
                <AvatarCircle name={lookupAssigneeName} size={24} />
                <Text className="font-sans text-sm text-caption">
                  {lookupAssigneeName}
                </Text>
              </>
            ) : (
              <Text className="font-sans text-sm text-content-tertiary">Unassigned</Text>
            )}
          </Pressable>
        </PropertyRow>

        {/* Component */}
        <PropertyRow label="Component">
          <Pressable
            className="flex-row items-center gap-2 min-h-[32px]"
            onPress={onComponentPress}
            accessibilityRole="button"
            accessibilityLabel={componentName != null ? `Component: ${componentName}` : 'Set component'}
          >
            <Ionicons name="cube-outline" size={16} color={componentName != null ? '#FFFFFF' : '#77818B'} />
            <Text className={`font-sans text-sm ${componentName != null ? 'text-caption' : 'text-content-tertiary'}`}>
              {componentName ?? 'None'}
            </Text>
          </Pressable>
        </PropertyRow>

        {/* Milestone */}
        <PropertyRow label="Milestone">
          <Pressable
            className="flex-row items-center gap-2 min-h-[32px]"
            onPress={onMilestonePress}
            accessibilityRole="button"
            accessibilityLabel={milestoneName != null ? `Milestone: ${milestoneName}` : 'Set milestone'}
          >
            <Ionicons name="flag-outline" size={16} color={milestoneName != null ? '#FFFFFF' : '#77818B'} />
            <Text className={`font-sans text-sm ${milestoneName != null ? 'text-caption' : 'text-content-tertiary'}`}>
              {milestoneName ?? 'None'}
            </Text>
          </Pressable>
        </PropertyRow>

        {/* Due date */}
        <PropertyRow label="Due date">
          <Pressable
            className="flex-row items-center gap-2 min-h-[32px]"
            onPress={onDueDatePress}
            accessibilityRole="button"
            accessibilityLabel={issue.dueDate ? `Due date: ${new Date(issue.dueDate).toLocaleDateString()}` : 'Set due date'}
          >
            <Ionicons name="calendar-outline" size={16} color={issue.dueDate ? '#FFFFFF' : '#77818B'} />
            <Text className={`font-sans text-sm ${issue.dueDate ? 'text-caption' : 'text-content-tertiary'}`}>
              {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : 'Not set'}
            </Text>
          </Pressable>
        </PropertyRow>

        {/* Estimation */}
        <PropertyRow label="Estimation">
          <Pressable
            className="flex-row items-center gap-2 min-h-[32px]"
            onPress={onEstimationPress}
            accessibilityRole="button"
            accessibilityLabel={issue.estimation > 0 ? `Estimation: ${issue.estimation}h` : 'Set estimation'}
          >
            <Ionicons name="time-outline" size={16} color={issue.estimation > 0 ? '#FFFFFF' : '#77818B'} />
            <Text className={`font-sans text-sm ${issue.estimation > 0 ? 'text-caption' : 'text-content-tertiary'}`}>
              {issue.estimation > 0 ? `${issue.estimation}h` : 'Not set'}
            </Text>
          </Pressable>
        </PropertyRow>

        {/* Reported time */}
        {issue.reportedTime > 0 ? (
          <PropertyRow label="Time spent">
            <Text className="font-sans text-sm text-caption">
              {issue.reportedTime}h
            </Text>
          </PropertyRow>
        ) : null}

        {/* Parent issue */}
        {(issueRecord.attachedTo as string | null) != null ? (
          <PropertyRow label="Parent">
            <Pressable
              className="flex-row items-center gap-2 min-h-[32px]"
              onPress={onParentIssuePress}
              accessibilityRole="button"
              accessibilityLabel="Go to parent issue"
            >
              <Ionicons name="arrow-up-outline" size={16} color="#FFFFFF" />
              <Text className="font-sans text-sm text-accent-primary">
                Parent issue
              </Text>
            </Pressable>
          </PropertyRow>
        ) : null}

        {/* Labels */}
        {labels != null && labels.length > 0 ? (
          <PropertyRow label="Labels">
            <View className="flex-row flex-wrap gap-1">
              {labels.map((label) => (
                <View
                  key={label._id}
                  className="rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: (LABEL_COLORS[label.color ?? 0] ?? '#77818B') + '30' }}
                >
                  <Text
                    className="font-sans-medium text-xs"
                    style={{ color: LABEL_COLORS[label.color ?? 0] ?? '#77818B' }}
                  >
                    {label.title}
                  </Text>
                </View>
              ))}
            </View>
          </PropertyRow>
        ) : null}

        {/* Sub-issues */}
        {(subIssues != null && subIssues.length > 0) || issue.subIssues > 0 ? (
          <View className="mt-2">
            <Text className="font-sans-semibold text-sm text-content-secondary mb-2">
              Sub-issues ({subIssues?.length ?? issue.subIssues})
            </Text>
            {subIssues != null ? (
              <View className="gap-1">
                {subIssues.map((sub) => (
                  <Pressable
                    key={sub._id}
                    className="flex-row items-center gap-2 bg-surface-secondary rounded-md px-3 py-2 min-h-[40px]"
                    onPress={() => onSubIssuePress?.(sub._id as string)}
                    accessibilityRole="button"
                    accessibilityLabel={`Sub-issue: ${sub.identifier} ${sub.title}`}
                  >
                    <Text className="font-sans-medium text-xs text-content-secondary">
                      {sub.identifier}
                    </Text>
                    <Text className="font-sans text-sm text-caption flex-1" numberOfLines={1}>
                      {sub.title}
                    </Text>
                    <PriorityIcon priority={sub.priority} size={14} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="font-sans text-sm text-content-tertiary">
                {issue.subIssues} sub-issue{issue.subIssues !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        ) : null}

        {/* Relations */}
        {relations != null && relations.length > 0 ? (
          <View className="mt-2">
            <Text className="font-sans-semibold text-sm text-content-secondary mb-2">
              Relations ({relations.length})
            </Text>
            <View className="gap-1">
              {relations.map((rel) => (
                <Pressable
                  key={rel._id}
                  className="flex-row items-center gap-2 bg-surface-secondary rounded-md px-3 py-2 min-h-[40px]"
                  onPress={() => onRelationPress?.(rel.targetIssueId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Related issue: ${rel.targetIssue?.identifier ?? rel.targetIssueId}`}
                >
                  <Ionicons name="link-outline" size={14} color="#77818B" />
                  <Text className="font-sans-medium text-xs text-content-secondary">
                    {rel.relationType}
                  </Text>
                  {rel.targetIssue != null ? (
                    <Text className="font-sans text-sm text-caption flex-1" numberOfLines={1}>
                      {rel.targetIssue.identifier}: {rel.targetIssue.title}
                    </Text>
                  ) : (
                    <Text className="font-sans text-sm text-content-tertiary flex-1" numberOfLines={1}>
                      {rel.targetIssueId}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {/* Description */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-sans-semibold text-sm text-content-secondary">
            Description
          </Text>
          {onDescriptionSave != null && issue.description ? (
            <Pressable
              onPress={() => onEditPress?.()}
              accessibilityRole="button"
              accessibilityLabel="Edit description"
            >
              <Ionicons name="create-outline" size={16} color="#77818B" />
            </Pressable>
          ) : null}
        </View>
        {issue.description ? (
          <View className="bg-surface-secondary rounded-md p-3">
            <MarkupRenderer
              content={issue.description}
              accessibilityLabel="Issue description"
            />
          </View>
        ) : (
          <Text className="font-sans text-sm text-content-tertiary">
            No description
          </Text>
        )}
      </View>

      {/* Attachments */}
      {attachments != null && attachments.length > 0 ? (
        <View className="mt-6">
          <Text className="font-sans-semibold text-sm text-content-secondary mb-2">
            Attachments ({attachments.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {attachments.map((att) => {
              // Hide the delete affordance when the parent has not wired a
              // delete handler OR when the attachment record itself is marked
              // readonly — promising an action the server will reject is
              // worse than not showing it at all.
              const canDelete = onAttachmentDelete != null && att.readonly !== true
              return (
                <AttachmentThumbnail
                  key={att.blobId}
                  blobId={att.blobId}
                  filename={att.name}
                  mimeType={att.contentType}
                  size={att.size}
                  onPress={onAttachmentPress ?? (() => {})}
                  onDelete={canDelete ? () => onAttachmentDelete(att) : undefined}
                />
              )
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Property row helper
// ---------------------------------------------------------------------------

interface PropertyRowProps {
  label: string
  children: React.ReactNode
}

function PropertyRow({ label, children }: PropertyRowProps): React.ReactNode {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-sans text-sm text-content-secondary w-28">
        {label}
      </Text>
      <View className="flex-1 items-end">{children}</View>
    </View>
  )
}

export { IssueDetailView }
export type { IssueDetailViewProps, AttachmentInfo }
