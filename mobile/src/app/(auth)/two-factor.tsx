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

import { useTwoFactor } from '@/hooks/use-auth'

export default function TwoFactorScreen(): React.ReactNode {
  const [code, setCode] = useState('')
  const { verify, isLoading, error } = useTwoFactor()
  const isSubmitting = useRef(false)

  const handleVerify = useCallback(async () => {
    if (isSubmitting.current) return
    isSubmitting.current = true
    try {
      await verify(code)
      router.replace('/(auth)/workspace-select')
    } catch {
      Alert.alert('Error', 'Invalid verification code. Please try again.')
    } finally {
      isSubmitting.current = false
    }
  }, [code, verify])

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <Text className="font-sans-bold text-2xl text-caption">
              Two-factor authentication
            </Text>
            <Text className="font-sans text-sm text-content mt-2">
              Enter the 6-digit code from your authenticator app
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                Verification code
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption text-center tracking-widest"
                value={code}
                onChangeText={setCode}
                placeholder="000000"
                placeholderTextColor="#77818B"
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
                accessibilityLabel="Two-factor authentication code"
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
              accessibilityLabel="Verify"
              accessibilityState={{ disabled: code.length < 6 || isLoading }}
            >
              <Text className="font-sans-medium text-base text-white">
                {isLoading ? 'Verifying...' : 'Verify'}
              </Text>
            </Pressable>

            <Pressable
              className="items-center p-3"
              onPress={() => { router.back() }}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text className="font-sans text-sm text-link">
                Back to login
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
