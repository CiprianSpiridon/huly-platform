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
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as WebBrowser from 'expo-web-browser'
import * as SecureStore from 'expo-secure-store'

import { useLogin, useBiometricAuth, getBiometricStatus } from '@/hooks/use-auth'
import { useAuthStore } from '@/store/auth'
import { getServerUrl, loadServerConfig } from '@/client/config'

const OAUTH_RETURN_URL = 'https://huly.app/login/auth'
const OAUTH_STATE_KEY = 'oauth_state'
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Generate a random OAuth `state` parameter. `Math.random()` is not
 * cryptographically secure, but for CSRF protection on a short-TTL
 * state token bound to a single redirect the entropy is adequate.
 * A dedicated `expo-crypto` dependency is avoided because this app
 * already ships without one.
 */
function generateOAuthState(): string {
  const timestamp = Date.now().toString(36)
  const rand = Array.from({ length: 6 })
    .map(() => Math.random().toString(36).slice(2, 10))
    .join('')
  return `${timestamp}.${rand}`
}

interface StoredOAuthState {
  state: string
  issuedAt: number
}

export default function LoginScreen(): React.ReactNode {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useLogin()
  const isSubmitting = useRef(false)

  // -------------------------------------------------------------------------
  // Biometric setup (TASK-004) — declared first because handleLogin &
  // handleGoogleLogin reference `offerBiometricEnrollment`.
  // -------------------------------------------------------------------------
  const biometricEnabledStore = useAuthStore((s) => s.biometricEnabled)
  const setBiometricEnabledStore = useAuthStore((s) => s.setBiometricEnabled)

  const offerBiometricEnrollment = useCallback(async (): Promise<void> => {
    try {
      const status = await getBiometricStatus()
      if (status !== 'available') return
      if (biometricEnabledStore) return
      Alert.alert(
        t('auth.biometric.enablePromptTitle'),
        t('auth.biometric.enablePromptMessage'),
        [
          { text: t('auth.biometric.skipAction'), style: 'cancel' },
          {
            text: t('auth.biometric.enableAction'),
            onPress: () => { void setBiometricEnabledStore(true) },
          },
        ],
      )
    } catch {
      // Non-fatal — never block login on biometric prompt issues.
    }
  }, [biometricEnabledStore, setBiometricEnabledStore, t])

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

      // Offer biometric enrollment after the first successful password login.
      // Non-blocking — the alert resolves independently of the navigation.
      void offerBiometricEnrollment()
      router.replace('/(auth)/workspace-select')
    } catch {
      Alert.alert(t('auth.login.failureTitle'), t('auth.login.failureMessage'))
    } finally {
      isSubmitting.current = false
    }
  }, [email, password, login, t, offerBiometricEnrollment])

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

      // CSRF protection: persist a random `state` with a short TTL and
      // require it to echo back in the redirect URL before we trust the
      // captured token. The Huly account server currently does not
      // implement PKCE for the mobile flow, so we rely on state/nonce
      // only. If PKCE support lands server-side, extend this block with
      // a code_verifier/code_challenge pair and forward the verifier on
      // the token-exchange request.
      const state = generateOAuthState()
      const stored: StoredOAuthState = { state, issuedAt: Date.now() }
      await SecureStore.setItemAsync(OAUTH_STATE_KEY, JSON.stringify(stored))

      const providerStartUrl =
        `${accountsUrl}/auth/google?state=${encodeURIComponent(state)}`

      // `prefersEphemeralWebBrowserSession: true` prevents the OS chooser
      // from leaking the redirect token to other apps' cookie jars.
      // Note: `preferEphemeralSession` is iOS-only (ASWebAuthenticationSession).
      // On Android the flow uses Chrome Custom Tabs which share the system
      // Chrome cookie jar — a follow-up may need a custom-tabs isolation
      // strategy to fully match iOS behaviour.
      const result = await WebBrowser.openAuthSessionAsync(
        providerStartUrl,
        OAUTH_RETURN_URL,
        { preferEphemeralSession: true },
      )

      // User closed the browser / cancelled — no partial auth state persists.
      if (result.type === 'cancel' || result.type === 'dismiss') {
        await SecureStore.deleteItemAsync(OAUTH_STATE_KEY)
        return
      }

      // Any non-success result with no URL is a generic failure.
      if (result.type !== 'success' || result.url.length === 0) {
        await SecureStore.deleteItemAsync(OAUTH_STATE_KEY)
        Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
        return
      }

      // The associated-domains / autoVerify entitlement is the primary path:
      // the OS routes `https://huly.app/login/auth?token=...` directly into
      // `mobile/src/app/login/auth.tsx`. `openAuthSessionAsync` will, however,
      // sometimes hand us the redirect URL back directly on iOS — in which
      // case we extract the token and forward it to the capture route after
      // validating origin, pathname, and state.
      try {
        const parsed = new URL(result.url)

        // Hard origin + path check: the server always redirects to
        // exactly `https://huly.app/login/auth`. Anything else is either
        // a misconfigured provider or an attempted redirect hijack.
        if (parsed.origin !== 'https://huly.app' || parsed.pathname !== '/login/auth') {
          await SecureStore.deleteItemAsync(OAUTH_STATE_KEY)
          Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
          return
        }

        // State echo: must match, must be within TTL. Any mismatch is a
        // CSRF / replay signal — drop it.
        const returnedState = parsed.searchParams.get('state')
        const storedRaw = await SecureStore.getItemAsync(OAUTH_STATE_KEY)
        await SecureStore.deleteItemAsync(OAUTH_STATE_KEY)
        if (storedRaw == null) {
          Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
          return
        }
        let storedState: StoredOAuthState | null = null
        try {
          storedState = JSON.parse(storedRaw) as StoredOAuthState
        } catch {
          storedState = null
        }
        if (
          storedState == null ||
          returnedState == null ||
          returnedState !== storedState.state ||
          Date.now() - storedState.issuedAt > OAUTH_STATE_TTL_MS
        ) {
          Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
          return
        }

        const token = parsed.searchParams.get('token')
        if (token != null && token.length > 0) {
          router.replace({ pathname: '/login/auth', params: { token } })
          return
        }
        Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
      } catch {
        await SecureStore.deleteItemAsync(OAUTH_STATE_KEY)
        Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
      }
    } catch {
      await SecureStore.deleteItemAsync(OAUTH_STATE_KEY)
      Alert.alert(t('auth.login.failureTitle'), t('auth.login.googleFailed'))
    } finally {
      setIsOAuthLoading(false)
      isOAuthSubmitting.current = false
    }
  }, [t])

  // -------------------------------------------------------------------------
  // Biometric unlock (TASK-004)
  // -------------------------------------------------------------------------
  const biometricLocked = useAuthStore((s) => s.biometricLocked)
  const storedToken = useAuthStore((s) => s.token)
  const setBiometricLocked = useAuthStore((s) => s.setBiometricLocked)
  const completeBiometricUnlock = useAuthStore((s) => s.completeBiometricUnlock)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { promptIfNeeded: promptBiometric } = useBiometricAuth()
  const biometricPromptedRef = useRef(false)

  const handleBiometricUnlock = useCallback(async (): Promise<void> => {
    const result = await promptBiometric(t('auth.biometric.promptReason'))
    if (result.status === 'success') {
      // Flip biometricLocked -> false and isAuthenticated -> true in a
      // single set so navigation transitions cleanly. AuthLayout will then
      // route the user into (app) (or workspace-select if none selected).
      // completeBiometricUnlock re-verifies the token server-side before
      // unlocking; await it so the caller knows the final state.
      await completeBiometricUnlock()
      return
    }
    if (result.status === 'cancel') {
      // User cancelled -- stay on login so they can type a password.
      setBiometricLocked(false)
      return
    }
    if (result.status === 'lockout') {
      setBiometricLocked(false)
      Alert.alert(t('auth.login.failureTitle'), t('auth.biometric.lockout'))
      return
    }
    if (result.status === 'no-hardware' || result.status === 'not-enrolled') {
      // Hardware missing or biometry revoked — drop the flag and let the
      // user log in with password.
      await setBiometricEnabledStore(false)
      setBiometricLocked(false)
      return
    }
    // Generic failure — surface to the user, allow password fallback.
    setBiometricLocked(false)
    Alert.alert(t('auth.login.failureTitle'), t('auth.biometric.failed'))
  }, [promptBiometric, t, setBiometricLocked, setBiometricEnabledStore, completeBiometricUnlock])

  // Auto-prompt on cold launch AND on every foreground re-lock: once per
  // `biometricLocked: true` transition. The ref resets when the flag flips
  // to false so a subsequent re-lock re-arms the prompt.
  useEffect(() => {
    if (!biometricLocked) {
      biometricPromptedRef.current = false
      return
    }
    if (!biometricEnabledStore) return
    if (biometricPromptedRef.current) return
    if (storedToken == null) {
      // Secure-store tamper: flag set but token missing. Clear both and
      // route into a fresh login (AuthLayout will land us here regardless).
      void (async () => {
        await setBiometricEnabledStore(false)
        await clearAuth()
      })()
      return
    }
    biometricPromptedRef.current = true
    void handleBiometricUnlock()
  }, [
    biometricLocked,
    biometricEnabledStore,
    storedToken,
    setBiometricEnabledStore,
    clearAuth,
    handleBiometricUnlock,
  ])

  const isFormValid = EMAIL_REGEX.test(email) && password.length > 0

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
            {biometricEnabledStore && storedToken != null && (
              <Pressable
                className="rounded-md p-3 items-center bg-primary"
                onPress={() => { void handleBiometricUnlock() }}
                accessibilityRole="button"
                accessibilityLabel={t('auth.login.biometricAccessibility')}
              >
                <Text className="font-sans-medium text-base text-white">
                  {t('auth.login.biometricPrompt')}
                </Text>
              </Pressable>
            )}

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

            <Pressable
              className="items-center p-3"
              onPress={() => { router.push('/(auth)/signup') }}
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel={t('auth.login.signUpAccessibility')}
            >
              <Text className="font-sans text-sm text-link">
                {t('auth.login.signUpLink')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
