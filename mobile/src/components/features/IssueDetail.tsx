/**
 * Issue detail view component.
 *
 * Renders all issue fields: title, description, status, priority,
 * assignee, component, milestone, time tracking, and sub-issues.
 */

import { View, Text, Pressable, ScrollView } from 'react-native'
import type { Issue } from '@hcengineering/tracker'
import { getStatusName, getAssigneeName } from '@/lib/lookup'

import { PriorityIcon, ISSUE_PRIORITY } from '@/components/ui/PriorityIcon'
import { AvatarCircle } from '@/components/ui/AvatarCircle'
import { AttachmentThumbnail } from '@/components/features/AttachmentThumbnail'
import { MarkupRenderer } from '@/components/features/MarkupRenderer'

interface AttachmentInfo {
  blobId: string
  name: string
  size: number
  contentType: string
}

interface IssueDetailViewProps {
  issue: Issue
  attachments?: AttachmentInfo[]
  onStatusPress?: () => void
  onPriorityPress?: () => void
  onAssigneePress?: () => void
  onAttachmentPress?: (blobId: string, filename: string, mimeType: string) => void
  testID?: string
}

const PRIORITY_LABELS: Record<number, string> = {
  [ISSUE_PRIORITY.NoPriority]: 'No priority',
  [ISSUE_PRIORITY.Urgent]: 'Urgent',
  [ISSUE_PRIORITY.High]: 'High',
  [ISSUE_PRIORITY.Medium]: 'Medium',
  [ISSUE_PRIORITY.Low]: 'Low',
}

function IssueDetailView({
  issue,
  attachments,
  onStatusPress,
  onPriorityPress,
  onAssigneePress,
  onAttachmentPress,
  testID,
}: IssueDetailViewProps): React.ReactNode {
  const lookupStatusName = getStatusName(issue)
  const lookupAssigneeName = getAssigneeName(issue)

  return (
    <View className="px-4 py-3" testID={testID}>
      {/* Title */}
      <Text className="font-sans-bold text-xl text-caption mb-1">
        {issue.title}
      </Text>

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

        {/* Component and Milestone omitted: raw Ref IDs lack lookup resolution */}

        {/* Due date */}
        {issue.dueDate ? (
          <PropertyRow label="Due date">
            <Text className="font-sans text-sm text-caption">
              {new Date(issue.dueDate).toLocaleDateString()}
            </Text>
          </PropertyRow>
        ) : null}

        {/* Estimation */}
        {issue.estimation > 0 ? (
          <PropertyRow label="Estimation">
            <Text className="font-sans text-sm text-caption">
              {issue.estimation}h
            </Text>
          </PropertyRow>
        ) : null}

        {/* Reported time */}
        {issue.reportedTime > 0 ? (
          <PropertyRow label="Time spent">
            <Text className="font-sans text-sm text-caption">
              {issue.reportedTime}h
            </Text>
          </PropertyRow>
        ) : null}

        {/* Sub-issues count */}
        {issue.subIssues > 0 ? (
          <PropertyRow label="Sub-issues">
            <Text className="font-sans text-sm text-caption">
              {issue.subIssues}
            </Text>
          </PropertyRow>
        ) : null}
      </View>

      {/* Description */}
      {issue.description ? (
        <View className="mt-6">
          <Text className="font-sans-semibold text-sm text-content-secondary mb-2">
            Description
          </Text>
          <View className="bg-surface-secondary rounded-md p-3">
            <MarkupRenderer
              content={issue.description}
              accessibilityLabel="Issue description"
            />
          </View>
        </View>
      ) : null}

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
            {attachments.map((att) => (
              <AttachmentThumbnail
                key={att.blobId}
                blobId={att.blobId}
                filename={att.name}
                mimeType={att.contentType}
                size={att.size}
                onPress={onAttachmentPress ?? (() => {})}
              />
            ))}
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
export type { IssueDetailViewProps }
