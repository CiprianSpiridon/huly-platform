/**
 * Edit-component screen.
 *
 * Seeds the form from the project's components list (read via the same
 * `useComponents` cache the list screen uses). Submits an UpdateComponent
 * patch — the 'Name' UI label maps to the schema's `label` tx field.
 * Cache invalidation in the hook refreshes the parent list on success.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import type { Doc, Ref, Space } from '@hcengineering/core'

import { useComponents, useUpdateComponent } from '@/hooks'
import { useMembers } from '@/hooks/useMembers'
import { AssigneePicker } from '@/components/features/AssigneePicker'
import { AvatarCircle } from '@/components/ui/AvatarCircle'

const NAME_MAX_LENGTH = 80

export default function EditComponentScreen(): React.ReactNode {
  const { id, componentId } = useLocalSearchParams<{
    id: string
    componentId: string
  }>()
  const projectId = id as Ref<Space>

  const { data: components, isLoading, error } = useComponents(projectId)
  const updateComponent = useUpdateComponent()
  const { data: members } = useMembers()

  const component = useMemo(
    () => components?.find((c) => c._id === componentId),
    [components, componentId]
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lead, setLead] = useState<Ref<Doc> | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [seeded, setSeeded] = useState(false)

  const leadPickerRef = useRef<BottomSheetModal>(null)

  // Seed form once when the component loads in.
  useEffect(() => {
    if (!seeded && component != null) {
      setName(component.name ?? '')
      setDescription(component.description ?? '')
      setLead(
        component.lead != null ? (component.lead as Ref<Doc>) : null
      )
      setSeeded(true)
    }
  }, [component, seeded])

  const trimmedName = name.trim()
  const isNameEmpty = trimmedName.length === 0
  const isSubmitting = updateComponent.isPending
  const isSubmitDisabled = isNameEmpty || isSubmitting || !seeded

  const leadMember =
    lead != null ? members?.find((m) => m._id === (lead as string)) : undefined

  const handleSubmit = useCallback(() => {
    setSubmitAttempted(true)
    if (isNameEmpty || isSubmitting || componentId == null) return

    updateComponent.mutate(
      {
        componentId: componentId as Ref<Doc>,
        space: projectId,
        patch: {
          label: trimmedName,
          description:
            description.trim().length > 0 ? description : undefined,
          lead,
        },
      },
      {
        onSuccess: () => {
          router.back()
        },
      }
    )
  }, [
    isNameEmpty,
    isSubmitting,
    componentId,
    updateComponent,
    trimmedName,
    description,
    lead,
    projectId,
  ])

  const handleCancel = useCallback(() => {
    router.back()
  }, [])

  const handleLeadSelect = useCallback((memberId: Ref<Doc> | null) => {
    setLead(memberId)
  }, [])

  // Loading state — wait for the cache to surface the component.
  if (isLoading || (components == null && error == null)) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Edit component' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
        </View>
      </SafeAreaView>
    )
  }

  // Error state — load failed.
  if (error != null) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Edit component' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            Failed to load component
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            {error.message}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Not found in this project's component list.
  if (component == null) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Edit component' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="cube-outline" size={48} color="#77818B" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            Component not found
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: 'Edit component' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16 }}
        >
          {/* Name */}
          <View className="mb-4">
            <Text className="font-sans-medium text-sm text-content-secondary mb-1">
              Name *
            </Text>
            <TextInput
              className="bg-surface-tertiary text-caption font-sans text-base rounded-md px-3 py-2.5 border border-border-primary"
              placeholder="Component name"
              placeholderTextColor="#77818B"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Component name"
              autoFocus
              maxLength={NAME_MAX_LENGTH}
            />
            {isNameEmpty && submitAttempted ? (
              <Text className="font-sans text-xs text-negative mt-1">
                Name required
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
              placeholder="Component description (optional)"
              placeholderTextColor="#77818B"
              value={description}
              onChangeText={setDescription}
              accessibilityLabel="Component description"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Lead picker trigger */}
          <View className="mb-4">
            <Text className="font-sans-medium text-sm text-content-secondary mb-1">
              Lead
            </Text>
            <Pressable
              className="bg-surface-tertiary rounded-md px-3 py-2.5 border border-border-primary min-h-[44px] flex-row items-center gap-2"
              onPress={() => leadPickerRef.current?.present()}
              accessibilityRole="button"
              accessibilityLabel={
                leadMember != null
                  ? `Lead: ${leadMember.name}`
                  : 'Select component lead'
              }
            >
              {leadMember != null ? (
                <AvatarCircle
                  name={leadMember.name}
                  imageUrl={leadMember.avatarUrl}
                  size={24}
                />
              ) : (
                <Ionicons name="person-outline" size={16} color="#77818B" />
              )}
              <Text
                className={`font-sans text-sm flex-1 ${
                  leadMember != null ? 'text-caption' : 'text-content-tertiary'
                }`}
              >
                {leadMember?.name ?? 'No lead'}
              </Text>
              {lead != null ? (
                <Pressable
                  onPress={() => setLead(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear lead"
                >
                  <Ionicons name="close" size={16} color="#77818B" />
                </Pressable>
              ) : null}
            </Pressable>
          </View>

          {/* Actions */}
          <View className="flex-row gap-3 mt-4">
            <Pressable
              className="flex-1 bg-surface-tertiary rounded-md py-3 min-h-[44px] items-center justify-center"
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="font-sans-medium text-sm text-caption">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 rounded-md py-3 min-h-[44px] items-center justify-center ${
                isSubmitDisabled ? 'bg-primary/50' : 'bg-primary'
              }`}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              accessibilityRole="button"
              accessibilityLabel="Save component"
              accessibilityState={{ disabled: isSubmitDisabled }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="font-sans-medium text-sm text-on-accent">
                  Save
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>

        <AssigneePicker
          ref={leadPickerRef}
          currentAssigneeId={lead as string | null}
          onSelect={handleLeadSelect}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
