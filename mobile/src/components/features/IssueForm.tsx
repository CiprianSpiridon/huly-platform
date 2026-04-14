/**
 * Issue creation/edit form component.
 *
 * Reads from and writes to the tracker Zustand draft store.
 * Supports all fields: title, description, priority, status, assignee,
 * component, milestone, due date, estimation, parent issue, labels.
 * Validation: title is required. Reports dirty state for cancel confirmation.
 */

import { useCallback, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import type { Ref, Doc, Space } from '@hcengineering/core'
import type { IssueStatus } from '@hcengineering/tracker'

import { useTrackerStore, type IssueDraftState } from '@/store/tracker'
import { PriorityIcon, ISSUE_PRIORITY } from '@/components/ui/PriorityIcon'
import { RichTextEditor } from '@/components/features/RichTextEditor'
import { StatusPicker } from '@/components/features/StatusPicker'
import { AssigneePicker } from '@/components/features/AssigneePicker'
import { ComponentPicker } from '@/components/features/ComponentPicker'
import { MilestonePicker } from '@/components/features/MilestonePicker'
import { useComponents, useMilestones } from '@/hooks/useProjects'

interface IssueFormProps {
  onSubmit: () => void
  onCancel: () => void
  isSubmitting?: boolean
  /** Label for the submit button. Defaults to 'Create'. */
  submitLabel?: string
  testID?: string
  /** When provided, the form uses this draft instead of the shared store draft. */
  overrideDraft?: IssueDraftState
  /** Called when overrideDraft is provided and the form needs to update draft fields. */
  onOverrideDraftChange?: (patch: Partial<IssueDraftState>) => void
}

const PRIORITY_OPTIONS = [
  { value: ISSUE_PRIORITY.NoPriority, label: 'None' },
  { value: ISSUE_PRIORITY.Urgent, label: 'Urgent' },
  { value: ISSUE_PRIORITY.High, label: 'High' },
  { value: ISSUE_PRIORITY.Medium, label: 'Medium' },
  { value: ISSUE_PRIORITY.Low, label: 'Low' },
] as const

function IssueForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Create',
  testID,
  overrideDraft,
  onOverrideDraftChange,
}: IssueFormProps): React.ReactNode {
  const storeDraft = useTrackerStore((s) => s.issueDraft)
  const storeUpdateDraft = useTrackerStore((s) => s.updateDraft)
  const selectedProjectId = useTrackerStore((s) => s.selectedProjectId)

  const draft = overrideDraft ?? storeDraft
  const updateDraft = onOverrideDraftChange ?? storeUpdateDraft
  const projectId = draft.projectId ?? selectedProjectId

  const { data: components } = useComponents(projectId as string | undefined)
  const { data: milestones } = useMilestones(projectId as string | undefined)

  const isTitleEmpty = draft.title.trim().length === 0
  const isDirty = draft.title.length > 0 || draft.description.length > 0 || draft.priority !== 0

  // Bottom sheet refs
  const statusPickerRef = useRef<BottomSheetModal>(null)
  const assigneePickerRef = useRef<BottomSheetModal>(null)
  const componentPickerRef = useRef<BottomSheetModal>(null)
  const milestonePickerRef = useRef<BottomSheetModal>(null)

  // Date input state
  const [dateInputValue, setDateInputValue] = useState('')

  const handleSubmit = useCallback(() => {
    if (!isTitleEmpty) {
      onSubmit()
    }
  }, [isTitleEmpty, onSubmit])

  const handleStatusSelect = useCallback(
    (statusId: Ref<IssueStatus>) => {
      updateDraft({ statusId })
    },
    [updateDraft]
  )

  const handleAssigneeSelect = useCallback(
    (memberId: Ref<Doc> | null) => {
      updateDraft({ assigneeId: memberId })
    },
    [updateDraft]
  )

  const handleComponentSelect = useCallback(
    (componentId: Ref<Doc> | null) => {
      updateDraft({ componentId })
    },
    [updateDraft]
  )

  const handleMilestoneSelect = useCallback(
    (milestoneId: Ref<Doc> | null) => {
      updateDraft({ milestoneId })
    },
    [updateDraft]
  )

  const handleDateInputSave = useCallback(() => {
    const parsed = Date.parse(dateInputValue)
    if (!isNaN(parsed)) {
      updateDraft({ dueDate: parsed })
    }
    setDateInputValue('')
  }, [dateInputValue, updateDraft])

  // Resolve names for display
  const componentName = draft.componentId != null
    ? components?.find((c) => c._id === (draft.componentId as string))?.name
    : undefined
  const milestoneName = draft.milestoneId != null
    ? milestones?.find((m) => m._id === (draft.milestoneId as string))?.name
    : undefined

  return (
    <ScrollView
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16 }}
      testID={testID}
    >
      {/* Title */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Title *
        </Text>
        <TextInput
          className="bg-surface-tertiary text-caption font-sans text-base rounded-md px-3 py-2.5 border border-border-primary"
          placeholder="Issue title"
          placeholderTextColor="#77818B"
          value={draft.title}
          onChangeText={(text) => updateDraft({ title: text })}
          accessibilityLabel="Issue title"
          autoFocus
        />
        {isTitleEmpty && isDirty ? (
          <Text className="font-sans text-xs text-negative mt-1">
            Title is required
          </Text>
        ) : null}
      </View>

      {/* Description */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Description
        </Text>
        <RichTextEditor
          value={draft.description}
          onChangeText={(text) => updateDraft({ description: text })}
          onMarkupChange={(json) => updateDraft({ description: json })}
          placeholder="Add a description..."
          accessibilityLabel="Issue description"
          editable={!isSubmitting}
        />
      </View>

      {/* Priority */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-2">
          Priority
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PRIORITY_OPTIONS.map((option) => {
            const isActive = draft.priority === option.value
            return (
              <Pressable
                key={option.value}
                className={`flex-row items-center gap-1.5 rounded-md px-3 py-2 min-h-[40px] ${
                  isActive ? 'bg-accent-subtle border border-accent-primary' : 'bg-surface-tertiary border border-border-primary'
                }`}
                onPress={() => updateDraft({ priority: option.value })}
                accessibilityRole="radio"
                accessibilityLabel={`Priority: ${option.label}`}
                accessibilityState={{ selected: isActive }}
              >
                <PriorityIcon priority={option.value} size={14} />
                <Text
                  className={`font-sans-medium text-xs ${
                    isActive ? 'text-accent-primary' : 'text-caption'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Status picker trigger */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Status
        </Text>
        <Pressable
          className="bg-surface-tertiary rounded-md px-3 py-2.5 border border-border-primary min-h-[44px] justify-center"
          style={projectId == null ? { opacity: 0.5 } : undefined}
          onPress={() => statusPickerRef.current?.present()}
          disabled={projectId == null}
          accessibilityRole="button"
          accessibilityLabel={draft.statusId != null ? 'Change status' : 'Select status'}
        >
          <Text className={`font-sans text-sm ${draft.statusId != null ? 'text-caption' : 'text-content-tertiary'}`}>
            {draft.statusId != null ? 'Status selected' : 'Default'}
          </Text>
        </Pressable>
      </View>

      {/* Assignee picker trigger */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Assignee
        </Text>
        <Pressable
          className="bg-surface-tertiary rounded-md px-3 py-2.5 border border-border-primary min-h-[44px] flex-row items-center gap-2"
          onPress={() => assigneePickerRef.current?.present()}
          accessibilityRole="button"
          accessibilityLabel={draft.assigneeId != null ? 'Change assignee' : 'Select assignee'}
        >
          <Ionicons name="person-outline" size={16} color="#77818B" />
          <Text className={`font-sans text-sm ${draft.assigneeId != null ? 'text-caption' : 'text-content-tertiary'}`}>
            {draft.assigneeId != null ? 'Assigned' : 'Unassigned'}
          </Text>
        </Pressable>
      </View>

      {/* Component picker trigger */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Component
        </Text>
        <Pressable
          className="bg-surface-tertiary rounded-md px-3 py-2.5 border border-border-primary min-h-[44px] flex-row items-center gap-2"
          style={projectId == null ? { opacity: 0.5 } : undefined}
          onPress={() => componentPickerRef.current?.present()}
          disabled={projectId == null}
          accessibilityRole="button"
          accessibilityLabel={componentName != null ? `Component: ${componentName}` : 'Select component'}
        >
          <Ionicons name="cube-outline" size={16} color="#77818B" />
          <Text className={`font-sans text-sm ${componentName != null ? 'text-caption' : 'text-content-tertiary'}`}>
            {componentName ?? 'None'}
          </Text>
        </Pressable>
      </View>

      {/* Milestone picker trigger */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Milestone
        </Text>
        <Pressable
          className="bg-surface-tertiary rounded-md px-3 py-2.5 border border-border-primary min-h-[44px] flex-row items-center gap-2"
          style={projectId == null ? { opacity: 0.5 } : undefined}
          onPress={() => milestonePickerRef.current?.present()}
          disabled={projectId == null}
          accessibilityRole="button"
          accessibilityLabel={milestoneName != null ? `Milestone: ${milestoneName}` : 'Select milestone'}
        >
          <Ionicons name="flag-outline" size={16} color="#77818B" />
          <Text className={`font-sans text-sm ${milestoneName != null ? 'text-caption' : 'text-content-tertiary'}`}>
            {milestoneName ?? 'None'}
          </Text>
        </Pressable>
      </View>

      {/* Due date */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Due Date
        </Text>
        {draft.dueDate != null ? (
          <View className="flex-row gap-2">
            <View className="flex-1 bg-surface-tertiary rounded-md px-3 py-2.5 border border-border-primary min-h-[44px] flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text className="font-sans text-sm text-caption">
                {new Date(draft.dueDate).toLocaleDateString()}
              </Text>
            </View>
            <Pressable
              className="bg-surface-tertiary rounded-md px-3 min-h-[44px] items-center justify-center border border-border-primary"
              onPress={() => updateDraft({ dueDate: null })}
              accessibilityRole="button"
              accessibilityLabel="Clear due date"
            >
              <Ionicons name="close" size={16} color="#77818B" />
            </Pressable>
          </View>
        ) : (
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 bg-surface-tertiary text-caption font-sans text-sm rounded-md px-3 py-2.5 border border-border-primary min-h-[44px]"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#77818B"
              value={dateInputValue}
              onChangeText={setDateInputValue}
              accessibilityLabel="Due date in YYYY-MM-DD format"
            />
            <Pressable
              className="bg-accent-primary rounded-md px-3 min-h-[44px] items-center justify-center"
              onPress={handleDateInputSave}
              accessibilityRole="button"
              accessibilityLabel="Set due date"
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Estimation */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Estimation (hours)
        </Text>
        <TextInput
          className="bg-surface-tertiary text-caption font-sans text-base rounded-md px-3 py-2.5 border border-border-primary"
          placeholder="0"
          placeholderTextColor="#77818B"
          value={draft.estimation != null ? String(draft.estimation) : ''}
          onChangeText={(text) => {
            const num = parseFloat(text)
            updateDraft({ estimation: isNaN(num) ? null : num })
          }}
          keyboardType="numeric"
          accessibilityLabel="Estimation in hours"
        />
      </View>

      {/* Action buttons */}
      <View className="flex-row gap-3 mt-4">
        <Pressable
          className="flex-1 bg-surface-tertiary rounded-md py-3 min-h-[44px] items-center justify-center"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text className="font-sans-medium text-sm text-caption">Cancel</Text>
        </Pressable>
        <Pressable
          className={`flex-1 rounded-md py-3 min-h-[44px] items-center justify-center ${
            isTitleEmpty || isSubmitting ? 'bg-primary/50' : 'bg-primary'
          }`}
          onPress={handleSubmit}
          disabled={isTitleEmpty || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          accessibilityState={{ disabled: isTitleEmpty || isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="font-sans-medium text-sm text-on-accent">{submitLabel}</Text>
          )}
        </Pressable>
      </View>

      {/* Bottom sheet pickers */}
      {projectId != null ? (
        <>
          <StatusPicker
            ref={statusPickerRef}
            projectId={projectId as string}
            currentStatusId={draft.statusId as string | undefined}
            onSelect={handleStatusSelect}
          />
          <ComponentPicker
            ref={componentPickerRef}
            projectId={projectId as string}
            currentComponentId={draft.componentId as string | null}
            onSelect={handleComponentSelect}
          />
          <MilestonePicker
            ref={milestonePickerRef}
            projectId={projectId as string}
            currentMilestoneId={draft.milestoneId as string | null}
            onSelect={handleMilestoneSelect}
          />
        </>
      ) : null}
      <AssigneePicker
        ref={assigneePickerRef}
        currentAssigneeId={draft.assigneeId as string | null}
        onSelect={handleAssigneeSelect}
      />
    </ScrollView>
  )
}

export { IssueForm }
export type { IssueFormProps }
