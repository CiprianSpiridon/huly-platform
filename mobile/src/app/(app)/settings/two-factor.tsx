/**
 * Two-Factor Authentication screen.
 *
 * Enable flow: call `generate2faSecret()` to fetch the shared secret and
 * otpauth URL, show the secret for the user to enter into an authenticator
 * app (Authy, 1Password, Google Authenticator, ...), then verify a 6-digit
 * TOTP code before calling `enable2fa(secret, code)`.
 *
 * Disable flow: require a TOTP code, then call `disable2fa(code)`.
 *
 * Note: this screen renders the secret as selectable copyable text rather
 * than as a QR image because the repo does not ship a QR rendering library.
 * The otpauth URL is also exposed so advanced users can paste it into a
 * password manager that supports it.
 *
 * Recovery codes: the backend does not currently expose recovery codes via
 * the mobile RPC surface. When a user loses their TOTP device, the screen
 * shows a support contact link so they can request an admin reset.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getOrCreateAccountClient, generate2faSecret, enable2fa, disable2fa } from '@/client/account'
import { useAuthStore } from '@/store/auth'

const SUPPORT_EMAIL = 'mailto:support@huly.io?subject=2FA%20device%20lost'

export default function TwoFactorScreen(): React.ReactNode {
  const token = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()

  const { data: enabled, isLoading } = useQuery({
    queryKey: ['account', '2fa-enabled'],
    queryFn: async () => {
      if (token == null) return false
      const client = await getOrCreateAccountClient(token)
      const info = await client.getLoginInfoByToken()
      if (info == null) return false
      const record = info as unknown as Record<string, unknown>
      return record.isTfaEnabled === true
    },
    enabled: token != null,
    staleTime: 60_000,
  })

  const invalidateStatus = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['account', '2fa-enabled'] })
  }, [queryClient])

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Two-Factor Authentication' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color="#205DC2" />
            </View>
          ) : enabled === true ? (
            <DisableFlow onDisabled={invalidateStatus} />
          ) : (
            <EnableFlow onEnabled={invalidateStatus} />
          )}

          <View className="px-4 mt-8">
            <Text className="font-sans text-xs text-content-tertiary">
              Lost your authenticator device?
            </Text>
            <Pressable
              onPress={() => {
                void Linking.openURL(SUPPORT_EMAIL)
              }}
              className="mt-1 min-h-[44px] justify-center"
              accessibilityRole="link"
              accessibilityLabel="Contact Huly support for recovery"
            >
              <Text className="font-sans-medium text-sm text-accent-primary">
                Contact support
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Enable flow
// ---------------------------------------------------------------------------

function EnableFlow({ onEnabled }: { onEnabled: () => void }): React.ReactNode {
  const [secret, setSecret] = useState<string | null>(null)
  const [otpUrl, setOtpUrl] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [isLoadingSecret, setIsLoadingSecret] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      setIsLoadingSecret(true)
      setError(null)
      try {
        const result = await generate2faSecret()
        if (cancelled) return
        setSecret(result.secret)
        setOtpUrl(result.url)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to generate 2FA secret')
      } finally {
        if (!cancelled) setIsLoadingSecret(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleCopySecret = useCallback(async () => {
    if (secret == null) return
    await Clipboard.setStringAsync(secret)
    Alert.alert('Copied', 'Secret copied to clipboard.', [{ text: 'OK' }])
  }, [secret])

  const handleVerify = useCallback(async () => {
    if (secret == null) return
    const trimmed = code.trim()
    if (trimmed.length < 6) {
      setError('Enter the 6-digit code from your authenticator app')
      return
    }
    setIsVerifying(true)
    setError(null)
    try {
      await enable2fa(secret, trimmed)
      onEnabled()
      Alert.alert(
        'Two-factor enabled',
        'Two-factor authentication has been enabled on your account.',
        [{ text: 'OK' }],
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }, [secret, code, onEnabled])

  return (
    <View className="px-4 pt-4">
      <Text className="font-sans-semibold text-lg text-content-primary mb-2">
        Enable 2FA
      </Text>
      <Text className="font-sans text-sm text-content-secondary mb-4">
        Add your account to an authenticator app (1Password, Authy, Google
        Authenticator), then enter the 6-digit code it shows to finish
        enabling two-factor authentication.
      </Text>

      {isLoadingSecret ? (
        <View className="items-center py-4">
          <ActivityIndicator size="small" color="#205DC2" />
        </View>
      ) : secret != null ? (
        <>
          <Text className="font-sans-medium text-xs text-content-tertiary uppercase mb-1">
            Secret
          </Text>
          <View className="bg-surface-tertiary rounded-md p-3 mb-2">
            <Text
              selectable
              className="font-sans text-base text-content-primary"
              accessibilityLabel={`2FA secret ${secret}`}
            >
              {secret}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              void handleCopySecret()
            }}
            className="flex-row items-center gap-2 mb-4 min-h-[44px]"
            accessibilityRole="button"
            accessibilityLabel="Copy secret to clipboard"
          >
            <Ionicons name="copy-outline" size={16} color="#205DC2" />
            <Text className="font-sans-medium text-sm text-accent-primary">
              Copy secret
            </Text>
          </Pressable>

          {otpUrl != null && (
            <>
              <Text className="font-sans-medium text-xs text-content-tertiary uppercase mb-1">
                Or open in authenticator
              </Text>
              <Pressable
                onPress={() => {
                  void Linking.openURL(otpUrl)
                }}
                className="bg-surface-tertiary rounded-md p-3 mb-4 min-h-[44px] justify-center"
                accessibilityRole="link"
                accessibilityLabel="Open in authenticator app"
              >
                <Text
                  className="font-sans text-sm text-accent-primary"
                  numberOfLines={1}
                >
                  {otpUrl}
                </Text>
              </Pressable>
            </>
          )}
        </>
      ) : null}

      <Text className="font-sans-medium text-xs text-content-tertiary uppercase mb-1">
        Verification code
      </Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        className="font-sans text-base text-content-primary bg-surface-tertiary rounded-md px-3 py-2.5"
        placeholder="123456"
        placeholderTextColor="#77818B"
        keyboardType="number-pad"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={6}
        editable={!isVerifying && secret != null}
        accessibilityLabel="Six digit verification code"
      />

      {error != null && (
        <View className="flex-row items-start gap-2 mt-3">
          <Ionicons name="alert-circle" size={16} color="#EE7A7A" />
          <Text className="font-sans text-sm text-status-error flex-1">{error}</Text>
        </View>
      )}

      <Pressable
        onPress={() => {
          void handleVerify()
        }}
        disabled={isVerifying || secret == null || code.trim().length < 6}
        className={`mt-6 rounded-md min-h-[44px] items-center justify-center ${
          isVerifying || secret == null || code.trim().length < 6
            ? 'bg-surface-tertiary'
            : 'bg-accent-primary'
        }`}
        accessibilityRole="button"
        accessibilityLabel="Verify and enable two-factor authentication"
      >
        {isVerifying ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="font-sans-semibold text-base text-content-primary">
            Verify and Enable
          </Text>
        )}
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Disable flow
// ---------------------------------------------------------------------------

function DisableFlow({ onDisabled }: { onDisabled: () => void }): React.ReactNode {
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDisable = useCallback(async () => {
    const trimmed = code.trim()
    if (trimmed.length < 6) {
      setError('Enter the 6-digit code from your authenticator app')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await disable2fa(trimmed)
      onDisabled()
      Alert.alert(
        'Two-factor disabled',
        'Two-factor authentication has been turned off.',
        [{ text: 'OK' }],
      )
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsSubmitting(false)
    }
  }, [code, onDisabled])

  return (
    <View className="px-4 pt-4">
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name="shield-checkmark" size={20} color="#3BCA7D" />
        <Text className="font-sans-semibold text-lg text-content-primary">
          2FA is enabled
        </Text>
      </View>
      <Text className="font-sans text-sm text-content-secondary mb-4">
        To turn off two-factor authentication, enter a 6-digit code from your
        authenticator app.
      </Text>

      <Text className="font-sans-medium text-xs text-content-tertiary uppercase mb-1">
        Verification code
      </Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        className="font-sans text-base text-content-primary bg-surface-tertiary rounded-md px-3 py-2.5"
        placeholder="123456"
        placeholderTextColor="#77818B"
        keyboardType="number-pad"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={6}
        editable={!isSubmitting}
        accessibilityLabel="Six digit verification code"
      />

      {error != null && (
        <View className="flex-row items-start gap-2 mt-3">
          <Ionicons name="alert-circle" size={16} color="#EE7A7A" />
          <Text className="font-sans text-sm text-status-error flex-1">{error}</Text>
        </View>
      )}

      <Pressable
        onPress={() => {
          void handleDisable()
        }}
        disabled={isSubmitting || code.trim().length < 6}
        className={`mt-6 rounded-md min-h-[44px] items-center justify-center ${
          isSubmitting || code.trim().length < 6 ? 'bg-surface-tertiary' : 'bg-status-error/80'
        }`}
        accessibilityRole="button"
        accessibilityLabel="Disable two-factor authentication"
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="font-sans-semibold text-base text-content-primary">
            Disable 2FA
          </Text>
        )}
      </Pressable>
    </View>
  )
}
