import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { useOtpLogin } from '@/hooks/use-auth'
import type { OtpOrigin } from '@/hooks/use-auth'

export default function OtpScreen(): React.ReactNode {
  const { t } = useTranslation()
  // Optional params let callers (e.g. signup) prefill the email and jump
  // straight to the code-entry step: `/otp?email=foo@bar.com&step=code&origin=signup`.
  const params = useLocalSearchParams<{
    email?: string | string[]
    step?: string | string[]
    origin?: string | string[]
  }>()
  const initialEmail =
    (Array.isArray(params.email) ? params.email[0] : params.email) ?? ''
  const initialStepParam = Array.isArray(params.step) ? params.step[0] : params.step
  const initialStep: 'email' | 'code' =
    initialStepParam === 'code' && initialEmail.length > 0 ? 'code' : 'email'
  const rawOrigin = Array.isArray(params.origin) ? params.origin[0] : params.origin
  const origin: OtpOrigin = rawOrigin === 'signup' ? 'signup' : 'login'

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>(initialStep)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { requestOtp, validateOtp, isLoading, error } = useOtpLogin()
  const isSubmitting = useRef(false)

  // Countdown timer for OTP retry
  useEffect(() => {
    if (retryAt === null) return

    function tick(): void {
      const remaining = Math.max(0, Math.ceil((retryAt! - Date.now()) / 1000))
      setCountdown(remaining)
      if (remaining <= 0 && timerRef.current !== null) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    tick()
    timerRef.current = setInterval(tick, 1000)

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
      }
    }
  }, [retryAt])

  const handleRequestOtp = useCallback(async () => {
    if (isSubmitting.current) return
    isSubmitting.current = true
    try {
      const otpInfo = await requestOtp(email, undefined, origin)
      setRetryAt(otpInfo.retryOn)
      setStep('code')
    } catch {
      Alert.alert(t('auth.otp.failureTitle'), t('auth.otp.requestFailed'))
    } finally {
      isSubmitting.current = false
    }
  }, [email, requestOtp, origin, t])

  const handleValidateOtp = useCallback(async () => {
    if (isSubmitting.current) return
    isSubmitting.current = true
    try {
      const loginInfo = await validateOtp(email, code)

      if (loginInfo.tfaRequired === true) {
        router.replace('/(auth)/two-factor')
        return
      }

      if (loginInfo.token == null) {
        Alert.alert(
          t('auth.otp.emailUnconfirmedTitle'),
          t('auth.otp.emailUnconfirmedMessage'),
        )
        return
      }

      router.replace('/(auth)/workspace-select')
    } catch {
      Alert.alert(t('auth.otp.failureTitle'), t('auth.otp.validateFailed'))
    } finally {
      isSubmitting.current = false
    }
  }, [email, code, validateOtp, t])

  const handleResend = useCallback(async () => {
    setCode('')
    try {
      // Route the resend back through the same origin the user entered on;
      // signup-origin resends MUST hit signUpOtp so the server knows to
      // rotate the pending-confirmation code for the not-yet-confirmed
      // identity.
      const otpInfo = await requestOtp(email, undefined, origin)
      setRetryAt(otpInfo.retryOn)
    } catch {
      Alert.alert(t('auth.otp.failureTitle'), t('auth.otp.resendFailed'))
    }
  }, [email, requestOtp, origin, t])

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <Text className="font-sans-bold text-2xl text-caption">
              {t('auth.otp.title')}
            </Text>
            <Text className="font-sans text-sm text-content mt-2">
              {step === 'email'
                ? t('auth.otp.subtitleEmail')
                : t('auth.otp.subtitleCode', { email })}
            </Text>
          </View>

          {step === 'email' ? (
            <View className="gap-4">
              <View className="gap-1">
                <Text className="font-sans-medium text-sm text-content">
                  {t('auth.otp.emailLabel')}
                </Text>
                <TextInput
                  className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.otp.emailPlaceholder')}
                  placeholderTextColor="#77818B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  autoCorrect={false}
                  editable={!isLoading}
                  accessibilityLabel={t('auth.otp.emailAccessibility')}
                />
              </View>

              <Pressable
                className={`rounded-md p-3 items-center ${isEmailValid && !isLoading ? 'bg-primary' : 'bg-primary/50'}`}
                onPress={handleRequestOtp}
                disabled={!isEmailValid || isLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.otp.continueAccessibility')}
                accessibilityState={{ disabled: !isEmailValid || isLoading }}
              >
                <Text className="font-sans-medium text-base text-white">
                  {isLoading ? t('auth.otp.continueSubmitting') : t('auth.otp.continue')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-4">
              <View className="gap-1">
                <Text className="font-sans-medium text-sm text-content">
                  {t('auth.otp.codeLabel')}
                </Text>
                <TextInput
                  className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption text-center tracking-widest"
                  value={code}
                  onChangeText={setCode}
                  placeholder={t('auth.otp.codePlaceholder')}
                  placeholderTextColor="#77818B"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  editable={!isLoading}
                  accessibilityLabel={t('auth.otp.codeAccessibility')}
                />
              </View>

              {error != null && (
                <Text className="font-sans text-sm text-error text-center">
                  {error}
                </Text>
              )}

              <Pressable
                className={`rounded-md p-3 items-center ${code.length === 6 && !isLoading ? 'bg-primary' : 'bg-primary/50'}`}
                onPress={handleValidateOtp}
                disabled={code.length < 6 || isLoading}
                accessibilityRole="button"
                accessibilityLabel={t('auth.otp.submitAccessibility')}
                accessibilityState={{ disabled: code.length < 6 || isLoading }}
              >
                <Text className="font-sans-medium text-base text-white">
                  {isLoading ? t('auth.otp.submitSubmitting') : t('auth.otp.submit')}
                </Text>
              </Pressable>

              <View className="flex-row justify-center gap-4">
                {countdown > 0 ? (
                  <Text className="font-sans text-sm text-content">
                    {t('auth.otp.resendCountdown', { seconds: countdown })}
                  </Text>
                ) : (
                  <Pressable
                    onPress={handleResend}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.otp.resendAccessibility')}
                  >
                    <Text className="font-sans text-sm text-link">
                      {t('auth.otp.resend')}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    setStep('email')
                    setCode('')
                  }}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.otp.backAccessibility')}
                >
                  <Text className="font-sans text-sm text-link">
                    {t('auth.otp.back')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
