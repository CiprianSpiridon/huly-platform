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

import { useOtpLogin } from '@/hooks/use-auth'

export default function OtpScreen(): React.ReactNode {
  // Optional params let callers (e.g. signup) prefill the email and jump
  // straight to the code-entry step: `/otp?email=foo@bar.com&step=code`.
  const params = useLocalSearchParams<{
    email?: string | string[]
    step?: string | string[]
  }>()
  const initialEmail =
    (Array.isArray(params.email) ? params.email[0] : params.email) ?? ''
  const initialStepParam = Array.isArray(params.step) ? params.step[0] : params.step
  const initialStep: 'email' | 'code' =
    initialStepParam === 'code' && initialEmail.length > 0 ? 'code' : 'email'

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
      const otpInfo = await requestOtp(email)
      setRetryAt(otpInfo.retryOn)
      setStep('code')
    } catch {
      Alert.alert('Error', 'Failed to send verification code. Please try again.')
    } finally {
      isSubmitting.current = false
    }
  }, [email, requestOtp])

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
        Alert.alert('Email not confirmed', 'Please confirm your email before signing in.')
        return
      }

      router.replace('/(auth)/workspace-select')
    } catch {
      Alert.alert('Error', 'Invalid verification code. Please try again.')
    } finally {
      isSubmitting.current = false
    }
  }, [email, code, validateOtp])

  const handleResend = useCallback(async () => {
    setCode('')
    try {
      const otpInfo = await requestOtp(email)
      setRetryAt(otpInfo.retryOn)
    } catch {
      Alert.alert('Error', 'Failed to resend code.')
    }
  }, [email, requestOtp])

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <Text className="font-sans-bold text-2xl text-caption">
              Sign in with OTP
            </Text>
            <Text className="font-sans text-sm text-content mt-2">
              {step === 'email'
                ? 'Enter your email to receive a verification code'
                : `Enter the code sent to ${email}`}
            </Text>
          </View>

          {step === 'email' ? (
            <View className="gap-4">
              <View className="gap-1">
                <Text className="font-sans-medium text-sm text-content">
                  Email
                </Text>
                <TextInput
                  className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  placeholderTextColor="#77818B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  autoCorrect={false}
                  editable={!isLoading}
                  accessibilityLabel="Email address"
                />
              </View>

              <Pressable
                className={`rounded-md p-3 items-center ${email.includes('@') && !isLoading ? 'bg-primary' : 'bg-primary/50'}`}
                onPress={handleRequestOtp}
                disabled={!email.includes('@') || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Continue"
                accessibilityState={{ disabled: !email.includes('@') || isLoading }}
              >
                <Text className="font-sans-medium text-base text-white">
                  {isLoading ? 'Sending...' : 'Continue'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-4">
              <View className="gap-1">
                <Text className="font-sans-medium text-sm text-content">
                  Verification code
                </Text>
                <TextInput
                  className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption text-center tracking-widest"
                  value={code}
                  onChangeText={setCode}
                  placeholder="000000"
                  placeholderTextColor="#77818B"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  editable={!isLoading}
                  accessibilityLabel="Verification code"
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
                accessibilityLabel="Sign in"
                accessibilityState={{ disabled: code.length < 6 || isLoading }}
              >
                <Text className="font-sans-medium text-base text-white">
                  {isLoading ? 'Verifying...' : 'Sign in'}
                </Text>
              </Pressable>

              <View className="flex-row justify-center gap-4">
                {countdown > 0 ? (
                  <Text className="font-sans text-sm text-content">
                    Resend in {countdown}s
                  </Text>
                ) : (
                  <Pressable
                    onPress={handleResend}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Resend code"
                  >
                    <Text className="font-sans text-sm text-link">
                      Resend code
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
                  accessibilityLabel="Back to email"
                >
                  <Text className="font-sans text-sm text-link">
                    Back
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
