/**
 * TwoFactorRow -- settings row showing current 2FA status and linking to the
 * setup/manage screen. Status is derived from `AccountClient.getLoginInfoByToken`
 * which carries an `isTfaEnabled` flag.
 */

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router, type Href } from 'expo-router'

import { getOrCreateAccountClient } from '@/client/account'
import { useAuthStore } from '@/store/auth'
import { SettingsRow } from '@/components/features/SettingsRow'

export function TwoFactorRow(): React.ReactNode {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: enabled } = useQuery({
    queryKey: ['account', '2fa-enabled'],
    queryFn: async () => {
      if (token == null) return false
      const client = await getOrCreateAccountClient(token)
      const info = await client.getLoginInfoByToken()
      if (info == null) return false
      const record = info as unknown as Record<string, unknown>
      return record.isTfaEnabled === true
    },
    enabled: isAuthenticated && token != null,
    staleTime: 60_000,
  })

  const handlePress = useCallback(() => {
    router.push('/(app)/settings/two-factor' as Href)
  }, [])

  return (
    <SettingsRow
      label="Two-Factor Authentication"
      value={enabled === true ? 'Enabled' : 'Disabled'}
      onPress={handlePress}
      showChevron
      accessibilityLabel={`Two-factor authentication is ${enabled === true ? 'enabled' : 'disabled'}. Tap to manage.`}
    />
  )
}
