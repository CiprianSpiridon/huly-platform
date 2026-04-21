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
    // No token (or not a string) -> surface a login error and kick back to login.
    if (rawToken == null || rawToken.length === 0) {
      setError(t('auth.login.oauthInvalidToken'))
      const timeout = setTimeout(() => { router.replace('/(auth)/login') }, 1200)
      return () => { clearTimeout(timeout) }
    }

    // Guard against strict-mode double-invoke: mark the ref ONLY inside the
    // in-progress branch, so if the effect body runs twice before the async
    // work starts we still consume the token exactly once.
    if (hasConsumedRef.current) return undefined

    // Hard 30-second ceiling on the consume path — prevents a dropped
    // response from stranding the user on the capture spinner. Owned at
    // the effect body (not inside an async IIFE) so React's cleanup can
    // clear it on unmount.
    const timeout = setTimeout(() => {
      setError(t('auth.login.oauthInvalidToken'))
      router.replace('/(auth)/login')
    }, 30_000)

    hasConsumedRef.current = true
    void loginWithToken(rawToken)
      .then(() => {
        // Strip the token from URL and advance to workspace selection.
        router.replace('/(auth)/workspace-select')
      })
      .catch(() => {
        setError(t('auth.login.oauthInvalidToken'))
        setTimeout(() => { router.replace('/(auth)/login') }, 1500)
      })
      .finally(() => { clearTimeout(timeout) })

    return () => { clearTimeout(timeout) }
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
