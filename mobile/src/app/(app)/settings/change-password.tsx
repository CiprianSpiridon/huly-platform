/**
 * Change Password screen.
 *
 * Three-field form (current, new, confirm). Calls
 * `AccountClient.changePassword(old, new)`. On success, returns to settings
 * with a confirmation alert.
 *
 * Session-invalidation handling: if the server invalidates the existing
 * session after a successful password change (some backends rotate tokens
 * server-side), the next authenticated call will 401; the auth store's
 * error path routes to login. We surface an explicit "please sign in again"
 * alert when the server responds with a 401-like error so the user knows
 * why they were signed out.
 *
 * Error handling:
 *  - Empty fields → inline validation.
 *  - Mismatched new + confirm → inline validation.
 *  - Weak password (server enforced) → inline error from server.
 *  - Wrong current password → inline error from server.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
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
import { router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { getOrCreateAccountClient } from '@/client/account'
import { useAuthStore } from '@/store/auth'
import { useLogout } from '@/hooks/use-auth'

const MIN_PASSWORD_LENGTH = 8

export default function ChangePasswordScreen(): React.ReactNode {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const logout = useLogout()
  const queryClient = useQueryClient()

  const canSubmit = useMemo(
    () =>
      oldPassword.length > 0 &&
      newPassword.length >= MIN_PASSWORD_LENGTH &&
      confirmPassword.length > 0 &&
      newPassword === confirmPassword,
    [oldPassword, newPassword, confirmPassword]
  )

  const handleSubmit = useCallback(async () => {
    // Synchronous ref guard against double-tap: `disabled` is not applied
    // before the next touch event dispatches in React Native.
    if (submittingRef.current) return
    if (oldPassword.length === 0) {
      setSubmitError('Current password is required')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setSubmitError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    if (newPassword !== confirmPassword) {
      setSubmitError('New passwords do not match')
      return
    }
    if (oldPassword === newPassword) {
      setSubmitError('New password must be different from the current one')
      return
    }

    const token = useAuthStore.getState().token
    if (token == null) {
      setSubmitError('Not authenticated')
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const client = await getOrCreateAccountClient(token)
      await client.changePassword(oldPassword, newPassword)
      // Invalidate the hasPassword query so the settings row label refreshes
      // for SSO-only accounts that just set a password.
      void queryClient.invalidateQueries({ queryKey: ['account', 'hasPassword'] })
      Alert.alert(
        'Password updated',
        'Your password has been changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back()
            },
          },
        ],
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password'
      // Detect session invalidation: some backends require re-login after
      // password rotation. Surface an explicit prompt, run full teardown
      // (disconnect / queryClient.clear / push deregister) and route to
      // login — just calling clearAuth leaves the transactor connected
      // and cached queries live under a rotated token.
      if (/401|unauthorized|session/i.test(message)) {
        Alert.alert(
          'Session expired',
          'Your password was changed, but the session has ended. Please sign in again with your new password.',
          [
            {
              text: 'Sign in',
              onPress: () => {
                void (async () => {
                  await logout()
                  router.replace('/(auth)/login' as Href)
                })()
              },
            },
          ],
        )
        return
      }
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }, [oldPassword, newPassword, confirmPassword, logout, queryClient])

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Change Password' }} />
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
            <PasswordField
              label="Current password"
              value={oldPassword}
              onChangeText={setOldPassword}
              showPassword={showPasswords}
              editable={!isSubmitting}
            />
            <PasswordField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              showPassword={showPasswords}
              editable={!isSubmitting}
              helper={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              showPassword={showPasswords}
              editable={!isSubmitting}
            />

            <Pressable
              onPress={() => setShowPasswords((v) => !v)}
              className="flex-row items-center gap-2 mt-2 min-h-[44px]"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: showPasswords }}
              accessibilityLabel={showPasswords ? 'Hide passwords' : 'Show passwords'}
            >
              <Ionicons
                name={showPasswords ? 'checkbox' : 'square-outline'}
                size={18}
                color={showPasswords ? '#205DC2' : '#77818B'}
              />
              <Text className="font-sans text-sm text-content-secondary">
                Show passwords
              </Text>
            </Pressable>

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
              disabled={!canSubmit || isSubmitting}
              className={`mt-6 rounded-md min-h-[44px] items-center justify-center ${
                !canSubmit || isSubmitting ? 'bg-surface-tertiary' : 'bg-accent-primary'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Save new password"
              accessibilityState={{ disabled: !canSubmit || isSubmitting }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="font-sans-semibold text-base text-content-primary">
                  Update Password
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------

interface PasswordFieldProps {
  label: string
  value: string
  onChangeText: (v: string) => void
  showPassword: boolean
  editable: boolean
  helper?: string
}

function PasswordField({
  label,
  value,
  onChangeText,
  showPassword,
  editable,
  helper,
}: PasswordFieldProps): React.ReactNode {
  return (
    <View className="mb-4">
      <Text className="font-sans-medium text-xs text-content-tertiary uppercase mb-1">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        className="font-sans text-base text-content-primary bg-surface-tertiary rounded-md px-3 py-2.5"
        placeholder="••••••••"
        placeholderTextColor="#77818B"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        accessibilityLabel={label}
      />
      {helper != null && (
        <Text className="font-sans text-xs text-content-tertiary mt-1">{helper}</Text>
      )}
    </View>
  )
}
