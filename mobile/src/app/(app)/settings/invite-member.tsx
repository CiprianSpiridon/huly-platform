/**
 * Invite Member screen.
 *
 * Simple form for owners/maintainers to invite a teammate by email and
 * assign a role. Uses `AccountClient.sendInvite` via the members repository.
 * The form stays open on failure with the typed values preserved.
 *
 * Role options are intentionally limited to User / Maintainer / Guest; owner
 * assignment is reserved for owner-to-owner transfer handled via role change.
 */

import { useCallback, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { AccountRole } from '@hcengineering/core'
import { inviteMember } from '@/repositories/members'
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole'

interface RoleOption {
  label: string
  description: string
  value: AccountRole
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    label: 'User',
    description: 'Can read and contribute to workspace content',
    value: AccountRole.User,
  },
  {
    label: 'Maintainer',
    description: 'Can manage projects and configure the workspace',
    value: AccountRole.Maintainer,
  },
  {
    label: 'Guest',
    description: 'Read-only access to shared content',
    value: AccountRole.Guest,
  },
]

// Loose client-side email sanity check. Intentionally allows intranet
// hosts like `user@localhost` and internationalized TLDs — the server is
// the authoritative validator. We only guard against obviously malformed
// input (empty, missing '@', whitespace).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/

export default function InviteMemberScreen(): React.ReactNode {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AccountRole>(AccountRole.User)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const queryClient = useQueryClient()
  const currentRole = useWorkspaceRole()
  const canInvite = currentRole === 'owner' || currentRole === 'maintainer'

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return
    const trimmed = email.trim()
    if (trimmed.length === 0) {
      setSubmitError('Email is required')
      return
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setSubmitError('Enter a valid email address')
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await inviteMember(trimmed, role)
      // Refresh the members list so pending invites surface without waiting
      // for staleTime to elapse.
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      void queryClient.invalidateQueries({ queryKey: ['workspaceInfo'] })
      Alert.alert('Invitation sent', `An invitation has been sent to ${trimmed}.`, [
        {
          text: 'OK',
          onPress: () => {
            router.back()
          },
        },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invite'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }, [email, role, queryClient])

  if (!canInvite) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Invite Member' }} />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="lock-closed-outline" size={48} color="#77818B" />
          <Text className="font-sans-medium text-base text-content-primary mt-3 text-center">
            You do not have permission to invite members.
          </Text>
          <Text className="font-sans text-sm text-content-tertiary mt-1 text-center">
            Only owners and maintainers can invite new members.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Invite Member' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-4 pt-4">
            <Text className="font-sans-medium text-base text-content-primary mb-2">
              Email address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              className="font-sans text-base text-content-primary bg-surface-tertiary rounded-md px-3 py-2.5"
              placeholder="teammate@company.com"
              placeholderTextColor="#77818B"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isSubmitting}
              accessibilityLabel="Teammate email address"
              returnKeyType="done"
            />

            <Text className="font-sans-medium text-base text-content-primary mt-6 mb-2">
              Role
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Select role for invited member"
            >
              {ROLE_OPTIONS.map((option) => {
                const isActive = role === option.value
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setRole(option.value)}
                    disabled={isSubmitting}
                    className={`flex-row items-start gap-3 px-3 py-3 min-h-[44px] rounded-md mb-2 ${
                      isActive ? 'bg-surface-secondary' : 'bg-surface-tertiary'
                    }`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${option.label}: ${option.description}`}
                  >
                    <View className="mt-1">
                      <Ionicons
                        name={isActive ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={isActive ? '#205DC2' : '#77818B'}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-medium text-base text-content-primary">
                        {option.label}
                      </Text>
                      <Text className="font-sans text-xs text-content-tertiary mt-0.5">
                        {option.description}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>

            {submitError != null && (
              <View className="flex-row items-start gap-2 mt-3">
                <Ionicons name="alert-circle" size={16} color="#EE7A7A" />
                <Text className="font-sans text-sm text-status-error flex-1">
                  {submitError}
                </Text>
              </View>
            )}

            <Pressable
              onPress={() => {
                void handleSubmit()
              }}
              disabled={isSubmitting || email.trim().length === 0}
              className={`mt-6 rounded-md min-h-[44px] items-center justify-center ${
                isSubmitting || email.trim().length === 0
                  ? 'bg-surface-tertiary'
                  : 'bg-accent-primary'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Send invitation"
              accessibilityState={{
                disabled: isSubmitting || email.trim().length === 0,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="font-sans-semibold text-base text-content-primary">
                  Send Invite
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
