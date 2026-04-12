import { useState, useCallback } from 'react'
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

import { useLogin } from '@/hooks/use-auth'

export default function LoginScreen(): React.ReactNode {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useLogin()

  const handleLogin = useCallback(async () => {
    try {
      const result = await login(email, password)

      if (result.tfaRequired === true) {
        router.push('/(auth)/two-factor')
        return
      }

      router.replace('/(auth)/workspace-select')
    } catch {
      Alert.alert('Error', 'Login failed. Please check your credentials and try again.')
    }
  }, [email, password, login])

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
              Sign in to Huly
            </Text>
            <Text className="font-sans text-sm text-content mt-2">
              Enter your email and password
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                Email
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                placeholderTextColor="#77818B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
                editable={!isLoading}
                accessibilityLabel="Email address"
              />
            </View>

            <View className="gap-1">
              <Text className="font-sans-medium text-sm text-content">
                Password
              </Text>
              <TextInput
                className="rounded-md bg-surface-panel p-3 font-sans text-base text-caption"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#77818B"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                editable={!isLoading}
                accessibilityLabel="Password"
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
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: !isFormValid || isLoading }}
            >
              <Text className="font-sans-medium text-base text-white">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Text>
            </Pressable>

            <Pressable
              className="items-center p-3"
              onPress={() => { router.push('/(auth)/otp') }}
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel="Sign in with OTP"
            >
              <Text className="font-sans text-sm text-link">
                Sign in with OTP
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
