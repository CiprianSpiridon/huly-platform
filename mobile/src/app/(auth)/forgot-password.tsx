/**
 * Forgot Password screen.
 *
 * Calls `AccountClient.requestPasswordReset(email)` and always renders a
 * success confirmation in both the success and "account not found" paths
 * (prevents email enumeration — the server throws `SocialIdNotFound` /
 * `AccountNotFound` for unregistered addresses, per
 * `server/account/src/operations.ts:1389-1422`). Network / 500 errors are
 * surfaced as recoverable inline errors.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { getOrCreateAccountClient } from '@/client/account'

const RESEND_SECONDS = 30

/**
 * Duck-typed `PlatformError` detection.
 *
 * We intentionally avoid a runtime import of `PlatformError` from
 * `@hcengineering/platform`: its emitted d.ts does not currently surface
 * `PlatformError` as a named export, and the runtime error shape
 * (`err.status.code` as a string) is stable across the platform.
 */
function isEnumerationError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const maybeStatus = (err as { status?: unknown }).status
  if (typeof maybeStatus !== 'object' || maybeStatus === null) return false
  const code = (maybeStatus as { code?: unknown }).code
  if (typeof code !== 'string') return false
  // Server emits `SocialIdNotFound` for unregistered addresses and
  // `AccountNotFound` for deleted accounts. Both must be swallowed to
  // prevent the client from leaking whether an email is registered.
  return /SocialIdNotFound|AccountNotFound/i.test(code)
}

export default function ForgotPasswordScreen(): React.ReactNode {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSubmitting = useRef(false)

  // Resend countdown
  useEffect(() => {
    if (!isSuccess || countdown <= 0) return undefined

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current !== null) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isSuccess, countdown])

  const sendReset = useCallback(async (): Promise<void> => {
    if (isSubmitting.current) return
    isSubmitting.current = true
    setIsLoading(true)
    setError(null)
    try {
      const client = await getOrCreateAccountClient()
      await client.requestPasswordReset(email)
      setIsSuccess(true)
      setCountdown(RESEND_SECONDS)
    } catch (err) {
      // Enumeration-resistant: treat not-found identities as success
      if (isEnumerationError(err)) {
        setIsSuccess(true)
        setCountdown(RESEND_SECONDS)
      } else {
        const message = err instanceof Error ? err.message : null
        setError(message ?? t('auth.forgotPassword.networkError'))
      }
    } finally {
      setIsLoading(false)
      isSubmitting.current = false
    }
  }, [email, t])

  const handleResend = useCallback((): void => {
    if (countdown > 0) return
    void sendReset()
  }, [countdown, sendReset])

  const isEmailValid = email.includes('@') && email.length >= 3

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <Text className="font-sans-bold text-2xl text-caption">
              {isSuccess
                ? t('auth.forgotPassword.successTitle')
                : t('auth.forgotPassword.title')}
            </Text>
            <Text className="font-sans text-sm text-content mt-2 text-center">
              {isSuccess
                ? t('auth.forgotPassword.successMessage')
                : t('auth.forgotPassword.subtitle')}
            </Text>
          </View>

          {!isSuccess ? (
            <View className="gap-4">
              <View className="gap-1">
                <Text className="font-sans-medium text-sm text-content">
                  {t('auth.forgotPassword.emailLabel')}
                </Text>
                <TextInput
                  className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  placeholderTextColor="#77818B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  autoCorrect={false}
                  editable={!isLoading}
                  accessibilityLabel={t('auth.forgotPassword.emailAccessibility')}
                />
              </View>

              {error !== null && (
                <Text className="font-sans text-sm text-error text-center">
                  {error}
                </Text>
              )}

              <Pressable
                className={`rounded-md p-3 items-center ${isEmailValid && !isLoading ? 'bg-primary' : 'bg-primary/50'}`}
                onPress={() => { void sendReset() }}
                disabled={!isEmailValid || isLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.forgotPassword.submitAccessibility')}
                accessibilityState={{ disabled: !isEmailValid || isLoading }}
              >
                <Text className="font-sans-medium text-base text-white">
                  {isLoading
                    ? t('auth.forgotPassword.submitting')
                    : t('auth.forgotPassword.submit')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-4">
              {countdown > 0 ? (
                <Text className="font-sans text-sm text-content text-center">
                  {t('auth.forgotPassword.resendCountdown', { seconds: countdown })}
                </Text>
              ) : (
                <Pressable
                  className="rounded-md p-3 items-center bg-surface-panel"
                  onPress={handleResend}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.forgotPassword.resendAccessibility')}
                >
                  <Text className="font-sans-medium text-base text-caption">
                    {isLoading
                      ? t('auth.forgotPassword.submitting')
                      : t('auth.forgotPassword.resend')}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          <Pressable
            className="items-center p-3 mt-4"
            onPress={() => { router.back() }}
            accessibilityRole="link"
            accessibilityLabel={t('auth.forgotPassword.backToLoginAccessibility')}
          >
            <Text className="font-sans text-sm text-link">
              {t('auth.forgotPassword.backToLogin')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
