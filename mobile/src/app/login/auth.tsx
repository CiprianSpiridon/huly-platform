/**
 * OAuth redirect capture route.
 *
 * Consumes `https://huly.app/login/auth?token=<jwt>` universal links. The
 * server's Passport.js redirect flow (see `pods/authProviders/src/utils.ts:113-128`)
 * always redirects to the web `frontUrl`; iOS/Android route that same URL
 * to this mobile screen via the associated-domains / autoVerify intent filter.
 *
 * This route lives under a literal `login/` folder outside the `(auth)` route
 * group because expo-router strips route-group parens from URLs — placing the
 * file at `(auth)/auth.tsx` would resolve to `/auth`, not `/login/auth`.
 *
 * Post-capture sequence:
 *   1. Read `?token=<jwt>` from useLocalSearchParams.
 *   2. Validate the token is JWT-shaped (three base64url segments).
 *   3. Hydrate a full `LoginInfo` via `getLoginInfoByToken()`.
 *   4. Persist via `setAuth(loginInfo)`.
 *   5. `router.replace` so the token is not left in the navigation stack.
 *   6. Route into `(auth)/workspace-select` (workspace selection matches the
 *      normal post-login flow used by `login.tsx`).
 */
import { useEffect, useRef, useState } from 'react'
import { View, Text, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { useOAuthLogin } from '@/hooks/use-auth'

export default function OAuthCaptureScreen(): React.ReactNode {
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ token?: string | string[] }>()
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token
  const { loginWithToken } = useOAuthLogin()
  const [error, setError] = useState<string | null>(null)
  const hasConsumedRef = useRef(false)

  useEffect(() => {
    if (hasConsumedRef.current) return
    hasConsumedRef.current = true

    // No token (or not a string) -> surface a login error and kick back to login.
    if (rawToken == null || rawToken.length === 0) {
      setError(t('auth.login.oauthInvalidToken'))
      // Delay the replace slightly so the error is visible before route change.
      const timeout = setTimeout(() => { router.replace('/(auth)/login') }, 1200)
      return () => { clearTimeout(timeout) }
    }

    void (async () => {
      try {
        await loginWithToken(rawToken)
        // Strip the token from URL and advance to workspace selection.
        router.replace('/(auth)/workspace-select')
      } catch {
        setError(t('auth.login.oauthInvalidToken'))
        const timeout = setTimeout(() => { router.replace('/(auth)/login') }, 1500)
        return () => { clearTimeout(timeout) }
      }
    })()
    return undefined
  }, [rawToken, loginWithToken, t])

  if (error !== null) {
    return (
      <SafeAreaView className="flex-1 bg-surface justify-center items-center px-6">
        <Text className="font-sans text-sm text-error text-center">{error}</Text>
        <Pressable
          className="mt-4 rounded-md bg-primary px-6 p-3"
          onPress={() => { router.replace('/(auth)/login') }}
          accessibilityRole="button"
          accessibilityLabel={t('auth.forgotPassword.backToLoginAccessibility')}
        >
          <Text className="font-sans-medium text-base text-white">
            {t('auth.forgotPassword.backToLogin')}
          </Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface justify-center items-center">
      <ActivityIndicator size="large" color="#205DC2" />
      <View className="mt-4">
        <Text className="font-sans text-sm text-content">
          {t('auth.login.submitting')}
        </Text>
      </View>
    </SafeAreaView>
  )
}
