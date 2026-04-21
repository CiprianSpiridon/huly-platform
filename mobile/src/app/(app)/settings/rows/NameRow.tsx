/**
 * NameRow -- inline editor for firstName / lastName.
 *
 * Tapping the row opens a two-field editor. Saving calls
 * `AccountClient.changeUsername(first, last)` through the settings
 * repository. On success, the profile query is invalidated so the
 * ProfileHeader refreshes in place without reloading the screen.
 *
 * Error handling:
 * - Empty first or last name: inline validation, no API call.
 * - Server error: stays open with an inline error message; existing
 *   profile data in the cache is preserved.
 */

import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'

import { changeUsername, type UserProfile } from '@/repositories/settings'
import { SettingsRow } from '@/components/features/SettingsRow'

interface NameRowProps {
  profile: UserProfile
}

export function NameRow({ profile }: NameRowProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false)
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (input: { first: string; last: string }) => {
      await changeUsername(input.first, input.last)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsOpen(false)
      setSubmitError(null)
    },
    onError: (err: unknown) => {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update name')
    },
  })

  const handleOpen = useCallback(() => {
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setSubmitError(null)
    setIsOpen(true)
  }, [profile.firstName, profile.lastName])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    setSubmitError(null)
  }, [])

  const handleSave = useCallback(() => {
    const first = firstName.trim()
    const last = lastName.trim()
    if (first.length === 0 || last.length === 0) {
      setSubmitError('First and last name are required')
      return
    }
    setSubmitError(null)
    mutation.mutate({ first, last })
  }, [firstName, lastName, mutation])

  const displayValue = [profile.firstName, profile.lastName]
    .filter((s) => s.length > 0)
    .join(' ')

  return (
    <>
      <SettingsRow
        label="Name"
        value={displayValue.length > 0 ? displayValue : 'Not set'}
        onPress={handleOpen}
        showChevron
        accessibilityLabel={`Edit name, current value: ${displayValue}`}
      />
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-surface-overlay"
        >
          <View className="bg-surface-secondary rounded-t-xl p-4 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={handleCancel}
                className="min-h-[44px] min-w-[44px] items-start justify-center"
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="font-sans text-base text-content-secondary">Cancel</Text>
              </Pressable>
              <Text className="font-sans-semibold text-base text-content-primary">
                Edit Name
              </Text>
              <Pressable
                onPress={handleSave}
                disabled={mutation.isPending}
                className="min-h-[44px] min-w-[44px] items-end justify-center"
                accessibilityRole="button"
                accessibilityLabel="Save name"
              >
                {mutation.isPending ? (
                  <ActivityIndicator size="small" color="#205DC2" />
                ) : (
                  <Text className="font-sans-semibold text-base text-accent-primary">
                    Save
                  </Text>
                )}
              </Pressable>
            </View>

            <Text className="font-sans text-xs text-content-tertiary mb-1 uppercase">
              First name
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              className="font-sans text-base text-content-primary bg-surface-tertiary rounded-md px-3 py-2.5 mb-3"
              placeholder="First name"
              placeholderTextColor="#77818B"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!mutation.isPending}
              accessibilityLabel="First name"
            />

            <Text className="font-sans text-xs text-content-tertiary mb-1 uppercase">
              Last name
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              className="font-sans text-base text-content-primary bg-surface-tertiary rounded-md px-3 py-2.5"
              placeholder="Last name"
              placeholderTextColor="#77818B"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!mutation.isPending}
              accessibilityLabel="Last name"
            />

            {submitError != null && (
              <View className="flex-row items-center gap-2 mt-3">
                <Ionicons name="alert-circle" size={16} color="#EE7A7A" />
                <Text className="font-sans text-sm text-status-error flex-1">
                  {submitError}
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}
