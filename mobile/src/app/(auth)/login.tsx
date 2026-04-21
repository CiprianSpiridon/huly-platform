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
import * as WebBrowser from 'expo-web-browser'

import { useLogin } from '@/hooks/use-auth'
import { getServerUrl, loadServerConfig } from '@/client/config'

const OAUTH_RETURN_URL = 'https://huly.app/login/auth'

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

  const [isOAuthLoading, setIsOAuthLoading] = useState(false)
  const isOAuthSubmitting = useRef(false)

  const handleGoogleLogin = useCallback(async (): Promise<void> => {
    if (isOAuthSubmitting.current) return
    isOAuthSubmitting.current = true
    setIsOAuthLoading(true)
    try {
      const serverUrl = getServerUrl()
      const config = await loadServerConfig(serverUrl)
      const accountsUrl = config.ACCOUNTS_URL.endsWith('/')
        ? config.ACCOUNTS_URL.slice(0, -1)
        : config.ACCOUNTS_URL
      const providerStartUrl = `${accountsUrl}/auth/google`

      // `prefersEphemeralWebBrowserSession: true` prevents the OS chooser
      // from leaking the redirect token to other apps' cookie jars.
      const result = await WebBrowser.openAuthSessionAsync(
        providerStartUrl,
        OAUTH_RETURN_URL,
        { preferEphemeralSession: true },
      )

      // User closed the browser / cancelled — no partial auth state persists.
      if (result.type === 'cancel' || result.type === 'dismiss') {
        // Silent: just return to the login screen; no alert needed.
        return
      }

      // Any non-success result with no URL is a generic failure.
      if (result.type !== 'success' || result.url.length === 0) {
        Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
        return
      }

      // The associated-domains / autoVerify entitlement is the primary path:
      // the OS routes `https://huly.app/login/auth?token=...` directly into
      // `mobile/src/app/login/auth.tsx`. `openAuthSessionAsync` will, however,
      // sometimes hand us the redirect URL back directly on iOS — in which
      // case we extract the token and forward it to the capture route.
      try {
        const parsed = new URL(result.url)
        const token = parsed.searchParams.get('token')
        if (token != null && token.length > 0) {
          router.replace({ pathname: '/login/auth', params: { token } })
          return
        }
        Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
      } catch {
        Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
      }
    } catch {
      Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
    } finally {
      setIsOAuthLoading(false)
      isOAuthSubmitting.current = false
    }
  }, [t])

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

            <View className="flex-row items-center my-2">
              <View className="flex-1 h-px bg-surface-panel" />
              <Text className="mx-3 font-sans text-xs text-content">
                {t('auth.login.dividerOr')}
              </Text>
              <View className="flex-1 h-px bg-surface-panel" />
            </View>

            <Pressable
              className={`rounded-md p-3 items-center bg-surface-panel ${isLoading || isOAuthLoading ? 'opacity-50' : ''}`}
              onPress={() => { void handleGoogleLogin() }}
              disabled={isLoading || isOAuthLoading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.login.googleAccessibility')}
              accessibilityState={{ disabled: isLoading || isOAuthLoading }}
            >
              <Text className="font-sans-medium text-base text-caption">
                {isOAuthLoading
                  ? t('auth.login.submitting')
                  : t('auth.login.googleButton')}
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
