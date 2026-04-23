/**
 * Sign-up screen.
 *
 * Collects first/last name and email, calls `AccountClient.signUpOtp()`
 * (not the deprecated `signUp()`), and routes to `/otp?email=<email>&step=code`
 * so the user lands directly on the code-entry step of the OTP screen.
 *
 * Duplicate email / validation errors surface as inline errors without
 * losing the entered form data.
 */
import { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { getOrCreateAccountClient } from '@/client/account'

function isDuplicateEmailError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const status = (err as { status?: unknown }).status
  const code =
    typeof status === 'object' && status !== null
      ? (status as { code?: unknown }).code
      : undefined
  if (typeof code === 'string') {
    return /AccountAlreadyExists|AccountAlreadyConfirmed|Conflict|DuplicateEmail|SocialIdAlreadyConfirmed/i.test(code)
  }
  const message = (err as { message?: unknown }).message
  if (typeof message === 'string') {
    return /already exists|already registered|duplicate/i.test(message)
  }
  return false
}

export default function SignUpScreen(): React.ReactNode {
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSubmitting = useRef(false)

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (isSubmitting.current) return
    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    const trimmedEmail = email.trim()

    if (trimmedFirst.length === 0 || trimmedLast.length === 0) {
      setError(t('auth.signUp.missingName'))
      return
    }
    if (!trimmedEmail.includes('@') || trimmedEmail.length < 3) {
      setError(t('auth.signUp.invalidEmail'))
      return
    }

    isSubmitting.current = true
    setIsLoading(true)
    setError(null)
    try {
      const client = await getOrCreateAccountClient()
      await client.signUpOtp(trimmedEmail, trimmedFirst, trimmedLast)
      router.replace({
        pathname: '/(auth)/otp',
        params: { email: trimmedEmail, step: 'code', origin: 'signup' },
      })
    } catch (err) {
      if (isDuplicateEmailError(err)) {
        setError(t('auth.signUp.duplicateEmail'))
      } else {
        const message = err instanceof Error ? err.message : null
        setError(message ?? t('auth.signUp.failureMessage'))
      }
    } finally {
      setIsLoading(false)
      isSubmitting.current = false
    }
  }, [firstName, lastName, email, t])

  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.includes('@') &&
    email.length >= 3

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-8">
            <Text className="font-sans-bold text-2xl text-caption">
              {t('auth.signUp.title')}
            </Text>
            <Text className="font-sans text-sm text-content mt-2 text-center">
              {t('auth.signUp.subtitle')}
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                {t('auth.signUp.firstNameLabel')}
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('auth.signUp.firstNamePlaceholder')}
                placeholderTextColor="#77818B"
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                autoCorrect={false}
                editable={!isLoading}
                accessibilityLabel={t('auth.signUp.firstNameAccessibility')}
              />
            </View>

            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                {t('auth.signUp.lastNameLabel')}
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('auth.signUp.lastNamePlaceholder')}
                placeholderTextColor="#77818B"
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
                autoCorrect={false}
                editable={!isLoading}
                accessibilityLabel={t('auth.signUp.lastNameAccessibility')}
              />
            </View>

            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                {t('auth.signUp.emailLabel')}
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.signUp.emailPlaceholder')}
                placeholderTextColor="#77818B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
                editable={!isLoading}
                accessibilityLabel={t('auth.signUp.emailAccessibility')}
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
              accessibilityLabel={t('auth.signUp.submitAccessibility')}
              accessibilityState={{ disabled: !isFormValid || isLoading }}
            >
              <Text className="font-sans-medium text-base text-white">
                {isLoading
                  ? t('auth.signUp.submitting')
                  : t('auth.signUp.submit')}
              </Text>
            </Pressable>

            <Pressable
              className="items-center p-3"
              onPress={() => { router.replace('/(auth)/login') }}
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel={t('auth.signUp.alreadyHaveAccountAccessibility')}
            >
              <Text className="font-sans text-sm text-link">
                {t('auth.signUp.alreadyHaveAccount')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
