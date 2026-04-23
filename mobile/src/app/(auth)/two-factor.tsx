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

import { useTwoFactor } from '@/hooks/use-auth'
import { useAuthStore } from '@/store/auth'

export default function TwoFactorScreen(): React.ReactNode {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const { verify, isLoading, error } = useTwoFactor()
  const isSubmitting = useRef(false)

  // If the user signs out (or clearAuth is called) while this screen is
  // still mounted, the `tfaToken` transient will be wiped. Force-route
  // back to login so we don't leave the user on a dead 2FA screen.
  const tfaToken = useAuthStore((s) => s.tfaToken)
  useEffect(() => {
    if (tfaToken == null) {
      setCode('')
      router.replace('/(auth)/login')
    }
  }, [tfaToken])

  const handleVerify = useCallback(async () => {
    if (isSubmitting.current) return
    isSubmitting.current = true
    try {
      await verify(code)
      router.replace('/(auth)/workspace-select')
    } catch {
      Alert.alert(t('auth.twoFactor.failureTitle'), t('auth.twoFactor.failureMessage'))
    } finally {
      isSubmitting.current = false
    }
  }, [code, verify, t])

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <Text className="font-sans-bold text-2xl text-caption">
              {t('auth.twoFactor.title')}
            </Text>
            <Text className="font-sans text-sm text-content mt-2">
              {t('auth.twoFactor.subtitle')}
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                {t('auth.twoFactor.codeLabel')}
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption text-center tracking-widest"
                value={code}
                onChangeText={setCode}
                placeholder={t('auth.twoFactor.codePlaceholder')}
                placeholderTextColor="#77818B"
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
                accessibilityLabel={t('auth.twoFactor.codeAccessibility')}
              />
            </View>

            {error != null && (
              <Text className="font-sans text-sm text-error text-center">
                {error}
              </Text>
            )}

            <Pressable
              className={`rounded-md p-3 items-center ${code.length === 6 && !isLoading ? 'bg-primary' : 'bg-primary/50'}`}
              onPress={handleVerify}
              disabled={code.length < 6 || isLoading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.twoFactor.submitAccessibility')}
              accessibilityState={{ disabled: code.length < 6 || isLoading }}
            >
              <Text className="font-sans-medium text-base text-white">
                {isLoading ? t('auth.twoFactor.submitting') : t('auth.twoFactor.submit')}
              </Text>
            </Pressable>

            <Pressable
              className="items-center p-3"
              onPress={() => { router.back() }}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.twoFactor.backAccessibility')}
            >
              <Text className="font-sans text-sm text-link">
                {t('auth.twoFactor.back')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
