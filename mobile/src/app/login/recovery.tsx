/**
 * Password recovery landing route.
 *
 * Consumes `https://huly.app/login/recovery?id=<reset-token>` deep links.
 * The query key is `id` (not `token`) — matches the server emitter at
 * `server/account/src/operations.ts:1431` and the web reader at
 * `plugins/login-resources/src/components/PasswordRestore.svelte:51`.
 *
 * This route lives under a literal `login/` folder outside the `(auth)` route
 * group because expo-router strips route-group parens from URLs. Placing it
 * at `(auth)/recovery.tsx` would resolve to `/recovery`, not `/login/recovery`.
 */
import { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { getOrCreateAccountClient } from '@/client/account'
import { useAuthStore } from '@/store/auth'

const MIN_PASSWORD_LENGTH = 8

export default function RecoveryScreen(): React.ReactNode {
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const resetToken = Array.isArray(params.id) ? params.id[0] : params.id
  const setAuth = useAuthStore((s) => s.setAuth)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSubmitting = useRef(false)

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (isSubmitting.current) return
    if (resetToken == null || resetToken.length === 0) {
      setError(t('auth.recovery.missingToken'))
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.recovery.tooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.recovery.mismatch'))
      return
    }

    isSubmitting.current = true
    setIsLoading(true)
    setError(null)
    try {
      // The token-scoped AccountClient is required — `restorePassword`
      // takes a single `password` argument and reads the reset token off
      // the Authorization header the client was constructed with.
      // See `foundations/core/packages/account-client/src/client.ts:415`
      // and the web reference at `plugins/login-resources/src/utils.ts:836`.
      const client = await getOrCreateAccountClient(resetToken)
      const loginInfo = await client.restorePassword(newPassword)

      if (loginInfo.token == null) {
        // Edge: server returned LoginInfo without token. Fall back to login.
        router.replace('/(auth)/login')
        return
      }

      await setAuth(loginInfo)
      router.replace('/(auth)/workspace-select')
    } catch (err) {
      const message = err instanceof Error ? err.message : null
      setError(message ?? t('auth.recovery.failureMessage'))
    } finally {
      setIsLoading(false)
      isSubmitting.current = false
    }
  }, [resetToken, newPassword, confirmPassword, setAuth, t])

  // Missing token: render a static invalid-link state with link back to
  // forgot-password. Do not call the API with an empty token.
  if (resetToken == null || resetToken.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <Text className="font-sans-bold text-2xl text-caption">
              {t('auth.recovery.failureTitle')}
            </Text>
            <Text className="font-sans text-sm text-content mt-2 text-center">
              {t('auth.recovery.invalidLink')}
            </Text>
          </View>
          <Pressable
            className="rounded-md p-3 items-center bg-primary"
            onPress={() => { router.replace('/(auth)/forgot-password') }}
            accessibilityRole="button"
            accessibilityLabel={t('auth.recovery.backToForgotPasswordAccessibility')}
          >
            <Text className="font-sans-medium text-base text-white">
              {t('auth.recovery.backToForgotPassword')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const isFormValid =
    newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <Text className="font-sans-bold text-2xl text-caption">
              {t('auth.recovery.title')}
            </Text>
            <Text className="font-sans text-sm text-content mt-2 text-center">
              {t('auth.recovery.subtitle')}
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                {t('auth.recovery.newPasswordLabel')}
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('auth.recovery.newPasswordPlaceholder')}
                placeholderTextColor="#77818B"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!isLoading}
                accessibilityLabel={t('auth.recovery.newPasswordAccessibility')}
              />
            </View>

            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                {t('auth.recovery.confirmPasswordLabel')}
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('auth.recovery.confirmPasswordPlaceholder')}
                placeholderTextColor="#77818B"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!isLoading}
                accessibilityLabel={t('auth.recovery.confirmPasswordAccessibility')}
              />
            </View>

            {error !== null && (
              <Text className="font-sans text-sm text-error text-center">
                {error}
              </Text>
            )}

            <Pressable
              className={`rounded-md p-3 items-center ${isFormValid && !isLoading ? 'bg-primary' : 'bg-primary/50'}`}
              onPress={() => { void handleSubmit() }}
              disabled={!isFormValid || isLoading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.recovery.submitAccessibility')}
              accessibilityState={{ disabled: !isFormValid || isLoading }}
            >
              <Text className="font-sans-medium text-base text-white">
                {isLoading
                  ? t('auth.recovery.submitting')
                  : t('auth.recovery.submit')}
              </Text>
            </Pressable>

            <Pressable
              className="items-center p-3"
              onPress={() => { router.replace('/(auth)/forgot-password') }}
              accessibilityRole="link"
              accessibilityLabel={t('auth.recovery.backToForgotPasswordAccessibility')}
            >
              <Text className="font-sans text-sm text-link">
                {t('auth.recovery.backToForgotPassword')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
