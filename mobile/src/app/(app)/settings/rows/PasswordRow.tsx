/**
 * PasswordRow -- settings row that opens the change-password screen.
 *
 * Gated by `AccountClient.checkHasPassword()`:
 *  - `true`  → "Change Password" row navigates to the form.
 *  - `false` → "Set a Password" row links to the web app (OTP-only
 *     accounts need to set a password on web first; the mobile app does
 *     not call changePassword with a null old password because the
 *     AccountClient signature requires two non-null strings).
 *
 * While the status is loading the row renders nothing to avoid flashing
 * the wrong label; this is acceptable because the password section is
 * optional in settings.
 */

import { useCallback } from 'react'
import { Linking } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router, type Href } from 'expo-router'

import { getOrCreateAccountClient } from '@/client/account'
import { useAuthStore } from '@/store/auth'
import { SettingsRow } from '@/components/features/SettingsRow'

const WEB_APP_URL = 'https://app.huly.io/login/password'

export function PasswordRow(): React.ReactNode {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: hasPassword, isLoading } = useQuery({
    queryKey: ['account', 'hasPassword'],
    queryFn: async () => {
      if (token == null) return false
      const client = await getOrCreateAccountClient(token)
      return await client.checkHasPassword()
    },
    enabled: isAuthenticated && token != null,
    staleTime: 5 * 60_000,
  })

  const handleChangePassword = useCallback(() => {
    router.push('/(app)/settings/change-password' as Href)
  }, [])

  const handleSetPassword = useCallback(() => {
    void Linking.openURL(WEB_APP_URL)
  }, [])

  if (isLoading || hasPassword == null) return null

  if (hasPassword) {
    return (
      <SettingsRow
        label="Change Password"
        onPress={handleChangePassword}
        showChevron
        accessibilityLabel="Change your account password"
      />
    )
  }

  return (
    <SettingsRow
      label="Set a Password"
      value="On web"
      onPress={handleSetPassword}
      showChevron
      accessibilityLabel="Set a password on the Huly web app"
    />
  )
}
