/**
 * Project creation/edit form component.
 *
 * Provides fields for: name, identifier, description, default assignee.
 * Validation: name and identifier are required.
 */

import { useCallback, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native'

interface ProjectFormData {
  name: string
  identifier: string
  description: string
}

interface ProjectFormProps {
  initialData?: ProjectFormData
  onSubmit: (data: ProjectFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel?: string
  /** If true, identifier field is read-only (cannot change after creation). */
  identifierReadOnly?: boolean
  testID?: string
}

const EMPTY_DATA: ProjectFormData = {
  name: '',
  identifier: '',
  description: '',
}

function ProjectForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Create',
  identifierReadOnly = false,
  testID,
}: ProjectFormProps): React.ReactNode {
  const [data, setData] = useState<ProjectFormData>(initialData ?? EMPTY_DATA)

  const isNameEmpty = data.name.trim().length === 0
  const isIdentifierEmpty = data.identifier.trim().length === 0
  const isDirty = data.name.length > 0 || data.identifier.length > 0 || data.description.length > 0

  const handleNameChange = useCallback((text: string) => {
    setData((prev) => {
      const next = { ...prev, name: text }
      // Auto-generate identifier from name if not manually set
      if (!identifierReadOnly && (prev.identifier === '' || prev.identifier === prev.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))) {
        next.identifier = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
      }
      return next
    })
  }, [identifierReadOnly])

  const handleSubmit = useCallback(() => {
    if (!isNameEmpty && !isIdentifierEmpty) {
      onSubmit(data)
    }
  }, [data, isNameEmpty, isIdentifierEmpty, onSubmit])

  return (
    <ScrollView
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16 }}
      testID={testID}
    >
      {/* Name */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Name *
        </Text>
        <TextInput
          className="bg-surface-tertiary text-caption font-sans text-base rounded-md px-3 py-2.5 border border-border-primary"
          placeholder="Project name"
          placeholderTextColor="#77818B"
          value={data.name}
          onChangeText={handleNameChange}
          accessibilityLabel="Project name"
          autoFocus
        />
        {isNameEmpty && isDirty ? (
          <Text className="font-sans text-xs text-negative mt-1">
            Name is required
          </Text>
        ) : null}
      </View>

      {/* Identifier */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Identifier *
        </Text>
        <TextInput
          className={`bg-surface-tertiary text-caption font-sans text-base rounded-md px-3 py-2.5 border border-border-primary ${identifierReadOnly ? 'opacity-60' : ''}`}
          placeholder="PROJ"
          placeholderTextColor="#77818B"
          value={data.identifier}
          onChangeText={(text) => setData((prev) => ({ ...prev, identifier: text.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
          accessibilityLabel="Project identifier"
          editable={!identifierReadOnly}
          autoCapitalize="characters"
          maxLength={10}
        />
        {isIdentifierEmpty && isDirty ? (
          <Text className="font-sans text-xs text-negative mt-1">
            Identifier is required
          </Text>
        ) : null}
        {!identifierReadOnly ? (
          <Text className="font-sans text-xs text-content-tertiary mt-1">
            Used as prefix for issue numbers (e.g., PROJ-1)
          </Text>
        ) : null}
      </View>

      {/* Description */}
      <View className="mb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-1">
          Description
        </Text>
        <TextInput
          className="bg-surface-tertiary text-caption font-sans text-base rounded-md px-3 py-2.5 border border-border-primary min-h-[80px]"
          placeholder="Project description (optional)"
          placeholderTextColor="#77818B"
          value={data.description}
          onChangeText={(text) => setData((prev) => ({ ...prev, description: text }))}
          accessibilityLabel="Project description"
          multiline
          textAlignVertical="top"
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
            isNameEmpty || isIdentifierEmpty || isSubmitting ? 'bg-primary/50' : 'bg-primary'
          }`}
          onPress={handleSubmit}
          disabled={isNameEmpty || isIdentifierEmpty || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          accessibilityState={{ disabled: isNameEmpty || isIdentifierEmpty || isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="font-sans-medium text-sm text-on-accent">{submitLabel}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  )
}

export { ProjectForm }
export type { ProjectFormProps, ProjectFormData }
