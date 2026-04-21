/**
 * Create Workspace screen.
 *
 * Simple form to create a new workspace under the current account. On
 * success, connects to the new workspace via useConnectionStore, persists
 * it in useWorkspaceStore, and navigates to the default tab.
 *
 * Error handling:
 * - Empty name -> inline validation, no API call.
 * - Duplicate slug / validation / network error -> inline error banner;
 *   form values are preserved; any optimistic workspace store write is
 *   only persisted after the connection succeeds (via the same pattern
 *   used by useSelectWorkspace).
 */

import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'

import { createWorkspace } from '@/client/account'
import { useWorkspaceStore } from '@/store/workspace'
import { useConnectionStore } from '@/store/connection'

export default function CreateWorkspaceScreen(): React.ReactNode {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const disconnect = useConnectionStore((s) => s.disconnect)
  const connect = useConnectionStore((s) => s.connect)
  const queryClient = useQueryClient()

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      setSubmitError('Workspace name is required')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // 1. Create the workspace server-side
      const wsInfo = await createWorkspace(trimmed)

      // 2. Disconnect from the current workspace
      disconnect()

      // 3. Clear all cached queries from the previous workspace
      queryClient.clear()

      // 4. Connect to the new workspace FIRST -- if this fails we must not
      //    persist workspace credentials that point to a broken connection.
      await connect(wsInfo.endpoint, wsInfo.workspace, wsInfo.token)

      // 5. Persist only after connect succeeds
      await setWorkspace(wsInfo)

      // 6. Navigate to the default tab; leaving the stack pops this screen.
      router.replace('/(app)/tracker' as Href)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create workspace'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [name, disconnect, queryClient, connect, setWorkspace])

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Create Workspace' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-4 pt-4">
            <Text className="font-sans-medium text-base text-content-primary mb-1">
              Workspace name
            </Text>
            <Text className="font-sans text-xs text-content-tertiary mb-2">
              Choose a name for your new workspace. You can invite teammates
              after it is created.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="font-sans text-base text-content-primary bg-surface-tertiary rounded-md px-3 py-2.5"
              placeholder="My Team"
              placeholderTextColor="#77818B"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSubmitting}
              accessibilityLabel="Workspace name"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleSubmit()
              }}
            />

            {submitError != null && (
              <View className="flex-row items-start gap-2 mt-3">
                <Ionicons name="alert-circle" size={16} color="#EE7A7A" />
                <Text className="font-sans text-sm text-status-error flex-1">
                  {submitError}
                </Text>
              </View>
            )}

            <Pressable
              onPress={() => {
                void handleSubmit()
              }}
              disabled={isSubmitting || name.trim().length === 0}
              className={`mt-6 rounded-md min-h-[44px] items-center justify-center ${
                isSubmitting || name.trim().length === 0
                  ? 'bg-surface-tertiary'
                  : 'bg-accent-primary'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Create workspace"
              accessibilityState={{
                disabled: isSubmitting || name.trim().length === 0,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="font-sans-semibold text-base text-content-primary">
                  Create Workspace
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
