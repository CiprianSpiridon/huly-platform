/**
 * DeleteAccountRow -- danger-zone row + two-step confirmation modal.
 *
 * Confirmation contract:
 *  - The user types their `profile.email` (case-insensitive after trim).
 *  - If `profile.email` is null (OTP-only accounts), the user must type
 *    the literal string `DELETE ACCOUNT` (uppercase, exact).
 *  - The confirm button is enabled only on exact match.
 *
 * Success path:
 *  - Call `AccountClient.deleteAccount(useAuthStore.getState().account)`
 *    through the account-client wrapper.
 *  - On success clear secure-store tokens and workspace, and route to login.
 *
 * Failure handling:
 *  - Recoverable errors keep the modal open with an inline message and
 *    re-enable the confirm button.
 *  - If the server signals the deletion is already in progress
 *    (e.g. 202 Accepted or body contains "deletion in progress"), we
 *    show a blocking "deletion in progress, contact support" screen and
 *    do NOT clear local state automatically.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
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
import { Ionicons } from '@expo/vector-icons'
import { router, type Href } from 'expo-router'

import { useProfile } from '@/hooks/useProfile'
import { useAuthStore } from '@/store/auth'
import { useLogout } from '@/hooks/use-auth'
import { deleteAccount } from '@/client/account'
import { SettingsRow } from '@/components/features/SettingsRow'
import type { AccountUuid } from '@hcengineering/core'

const OTP_CONFIRM_LITERAL = 'DELETE ACCOUNT'

export function DeleteAccountRow(): React.ReactNode {
  const { data: profile } = useProfile()
  const logout = useLogout()
  const [isOpen, setIsOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletionInProgress, setDeletionInProgress] = useState(false)
  const submittingRef = useRef(false)

  const expected = useMemo<string>(() => {
    const email = profile?.email ?? null
    if (email != null && email.trim().length > 0) {
      return email.trim().toLowerCase()
    }
    return OTP_CONFIRM_LITERAL
  }, [profile])

  const isEmailMode = profile?.email != null && profile.email.trim().length > 0

  const matches = useMemo(() => {
    if (isEmailMode) {
      return typed.trim().toLowerCase() === expected
    }
    return typed === expected
  }, [typed, expected, isEmailMode])

  const handleOpen = useCallback(() => {
    setTyped('')
    setSubmitError(null)
    setDeletionInProgress(false)
    setIsOpen(true)
  }, [])

  const handleCancel = useCallback(() => {
    if (isSubmitting) return
    setIsOpen(false)
    setTyped('')
    setSubmitError(null)
  }, [isSubmitting])

  const handleConfirm = useCallback(async () => {
    if (!matches) return
    // Synchronous ref guard: React Native `disabled` prop is not applied
    // before the next touch event dispatches, so rely on a ref to block
    // re-entry on rapid double-taps.
    if (submittingRef.current) return
    submittingRef.current = true
    const accountUuid = useAuthStore.getState().account
    if (accountUuid == null) {
      submittingRef.current = false
      setSubmitError('Not authenticated')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await deleteAccount(accountUuid as AccountUuid)

      // Success: full teardown (disconnect, push-deregister, query cache,
      // workspace + auth clear) via useLogout so nothing stale leaks into
      // the next session. Then route to login.
      await logout()
      router.replace('/(auth)/login' as Href)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account'
      if (/deletion in progress|already.*progress|accepted/i.test(message)) {
        // Block retries and allow the user to close the modal.
        setDeletionInProgress(true)
        setIsSubmitting(false)
        submittingRef.current = false
        return
      }
      setSubmitError(message)
      setIsSubmitting(false)
      submittingRef.current = false
      return
    }
    setIsSubmitting(false)
    submittingRef.current = false
  }, [matches, logout])

  return (
    <>
      <SettingsRow
        label="Delete Account"
        onPress={handleOpen}
        destructive
        accessibilityLabel="Delete your account permanently"
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
            {deletionInProgress ? (
              <InProgressPanel onClose={handleCancel} />
            ) : (
              <ConfirmPanel
                isEmailMode={isEmailMode}
                expected={expected}
                typed={typed}
                onChangeTyped={setTyped}
                matches={matches}
                isSubmitting={isSubmitting}
                submitError={submitError}
                onCancel={handleCancel}
                onConfirm={() => {
                  void handleConfirm()
                }}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

// ---------------------------------------------------------------------------

interface ConfirmPanelProps {
  isEmailMode: boolean
  expected: string
  typed: string
  onChangeTyped: (v: string) => void
  matches: boolean
  isSubmitting: boolean
  submitError: string | null
  onCancel: () => void
  onConfirm: () => void
}

function ConfirmPanel({
  isEmailMode,
  expected,
  typed,
  onChangeTyped,
  matches,
  isSubmitting,
  submitError,
  onCancel,
  onConfirm,
}: ConfirmPanelProps): React.ReactNode {
  return (
    <>
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={onCancel}
          disabled={isSubmitting}
          className="min-h-[44px] min-w-[44px] items-start justify-center"
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text className="font-sans text-base text-content-secondary">Cancel</Text>
        </Pressable>
        <Text className="font-sans-semibold text-base text-status-error">
          Delete Account
        </Text>
        <View className="min-h-[44px] min-w-[44px]" />
      </View>

      <View className="flex-row gap-2 bg-status-error/10 rounded-md p-3 mb-4">
        <Ionicons name="warning" size={18} color="#EE7A7A" />
        <Text className="font-sans text-sm text-content-primary flex-1">
          This cannot be undone. Your account, profile, and workspace
          memberships will be permanently removed.
        </Text>
      </View>

      <Text className="font-sans-medium text-xs text-content-tertiary uppercase mb-1">
        {isEmailMode ? 'Type your email to confirm' : 'Type DELETE ACCOUNT to confirm'}
      </Text>
      <Text className="font-sans text-xs text-content-tertiary mb-2">
        Expected:{' '}
        <Text className="font-sans-medium text-content-secondary">
          {isEmailMode ? expected : OTP_CONFIRM_LITERAL}
        </Text>
      </Text>
      <TextInput
        value={typed}
        onChangeText={onChangeTyped}
        className="font-sans text-base text-content-primary bg-surface-tertiary rounded-md px-3 py-2.5"
        placeholder={isEmailMode ? 'you@company.com' : 'DELETE ACCOUNT'}
        placeholderTextColor="#77818B"
        autoCapitalize={isEmailMode ? 'none' : 'characters'}
        autoCorrect={false}
        keyboardType={isEmailMode ? 'email-address' : 'default'}
        editable={!isSubmitting}
        accessibilityLabel={isEmailMode ? 'Type your email to confirm' : 'Type DELETE ACCOUNT to confirm'}
      />

      {submitError != null && (
        <View className="flex-row items-start gap-2 mt-3">
          <Ionicons name="alert-circle" size={16} color="#EE7A7A" />
          <Text className="font-sans text-sm text-status-error flex-1">
            {submitError}
          </Text>
        </View>
      )}

      <Pressable
        onPress={onConfirm}
        disabled={!matches || isSubmitting}
        className={`mt-6 rounded-md min-h-[44px] items-center justify-center ${
          !matches || isSubmitting ? 'bg-surface-tertiary' : 'bg-status-error/80'
        }`}
        accessibilityRole="button"
        accessibilityLabel="Permanently delete my account"
        accessibilityState={{ disabled: !matches || isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="font-sans-semibold text-base text-content-primary">
            Delete My Account
          </Text>
        )}
      </Pressable>
    </>
  )
}

function InProgressPanel({ onClose }: { onClose: () => void }): React.ReactNode {
  return (
    <>
      <View className="items-center py-6">
        <Ionicons name="hourglass-outline" size={48} color="#EE7A7A" />
        <Text className="font-sans-semibold text-base text-content-primary mt-3">
          Deletion in progress
        </Text>
        <Text className="font-sans text-sm text-content-secondary mt-1 text-center px-2">
          Your account deletion has started but has not yet finished. Please
          contact support if this status persists.
        </Text>
      </View>
      <Pressable
        onPress={onClose}
        className="mt-2 rounded-md min-h-[44px] items-center justify-center bg-surface-tertiary"
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text className="font-sans-semibold text-base text-content-primary">Close</Text>
      </Pressable>
    </>
  )
}
