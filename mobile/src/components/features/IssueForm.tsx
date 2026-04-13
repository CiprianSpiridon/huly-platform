/**
 * Issue creation/edit form component.
 *
 * Reads from and writes to the tracker Zustand draft store.
 * Validation: title is required. Reports dirty state for cancel confirmation.
 */

import { useCallback } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native'

import { useTrackerStore } from '@/store/tracker'
import { PriorityIcon, ISSUE_PRIORITY } from '@/components/ui/PriorityIcon'
import { RichTextEditor } from '@/components/features/RichTextEditor'

interface IssueFormProps {
  onSubmit: () => void
  onCancel: () => void
  isSubmitting?: boolean
  testID?: string
}

const PRIORITY_OPTIONS = [
  { value: ISSUE_PRIORITY.NoPriority, label: 'None' },
  { value: ISSUE_PRIORITY.Urgent, label: 'Urgent' },
  { value: ISSUE_PRIORITY.High, label: 'High' },
  { value: ISSUE_PRIORITY.Medium, label: 'Medium' },
  { value: ISSUE_PRIORITY.Low, label: 'Low' },
] as const

function IssueForm({ onSubmit, onCancel, isSubmitting = false, testID }: IssueFormProps): React.ReactNode {
  const draft = useTrackerStore((s) => s.issueDraft)
  const updateDraft = useTrackerStore((s) => s.updateDraft)

  const isTitleEmpty = draft.title.trim().length === 0
  const isDirty = draft.title.length > 0 || draft.description.length > 0 || draft.priority !== 0

  const handleSubmit = useCallback(() => {
    if (!isTitleEmpty) {
      onSubmit()
    }
  }, [isTitleEmpty, onSubmit])

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
          accessibilityLabel="Create issue"
          accessibilityState={{ disabled: isTitleEmpty || isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="font-sans-medium text-sm text-on-accent">Create</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  )
}

export { IssueForm }
export type { IssueFormProps }
