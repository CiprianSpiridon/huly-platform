import { useState, useCallback, useRef } from 'react'
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
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { useLogin } from '@/hooks/use-auth'

export default function LoginScreen(): React.ReactNode {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useLogin()
  const isSubmitting = useRef(false)

  const handleLogin = useCallback(async () => {
    if (isSubmitting.current) return
    isSubmitting.current = true
    try {
      const result = await login(email, password)

      if (result.tfaRequired === true) {
        router.push('/(auth)/two-factor')
        return
      }

      if (result.token == null) {
        return
      }

      router.replace('/(auth)/workspace-select')
    } catch {
      Alert.alert(t('auth.login.failureTitle'), t('auth.login.failureMessage'))
    } finally {
      isSubmitting.current = false
    }
  }, [email, password, login, t])

  const isFormValid = email.includes('@') && password.length > 0

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <Text className="font-sans-bold text-2xl text-caption">
              {t('auth.login.title')}
            </Text>
            <Text className="font-sans text-sm text-content mt-2">
              {t('auth.login.subtitle')}
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                {t('auth.login.emailLabel')}
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.login.emailPlaceholder')}
                placeholderTextColor="#77818B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
                editable={!isLoading}
                accessibilityLabel={t('auth.login.emailAccessibility')}
              />
            </View>

            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                {t('auth.login.passwordLabel')}
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.login.passwordPlaceholder')}
                placeholderTextColor="#77818B"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                editable={!isLoading}
                accessibilityLabel={t('auth.login.passwordAccessibility')}
              />
            </View>

            {error != null && (
              <Text className="font-sans text-sm text-error text-center">
                {error}
              </Text>
            )}

            <Pressable
              className={`rounded-md p-3 items-center ${isFormValid && !isLoading ? 'bg-primary' : 'bg-primary/50'}`}
              onPress={handleLogin}
              disabled={!isFormValid || isLoading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.login.submitAccessibility')}
              accessibilityState={{ disabled: !isFormValid || isLoading }}
            >
              <Text className="font-sans-medium text-base text-white">
                {isLoading ? t('auth.login.submitting') : t('auth.login.submit')}
              </Text>
            </Pressable>

            <Pressable
              className="items-center p-3"
              onPress={() => { router.push('/(auth)/otp') }}
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel={t('auth.login.otpAccessibility')}
            >
              <Text className="font-sans text-sm text-link">
                {t('auth.login.otpLink')}
              </Text>
            </Pressable>

            <Pressable
              className="items-center p-3"
              onPress={() => { router.push('/(auth)/forgot-password') }}
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel={t('auth.login.forgotPasswordAccessibility')}
            >
              <Text className="font-sans text-sm text-link">
                {t('auth.login.forgotPasswordLink')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
