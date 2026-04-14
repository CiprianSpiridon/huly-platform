import { useCallback } from 'react'
import { Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'

import { useCreateProject } from '@/hooks/useProjects'
import { ProjectForm, type ProjectFormData } from '@/components/features/ProjectForm'

/**
 * Create project screen.
 *
 * Provides a form for name, identifier, and description. On submit,
 * creates the project and navigates back to the project list.
 */
export default function NewProjectScreen(): React.ReactNode {
  const createProject = useCreateProject()

  const handleSubmit = useCallback(
    (data: ProjectFormData) => {
      createProject.mutate(
        {
          name: data.name,
          identifier: data.identifier,
          description: data.description || undefined,
        },
        {
          onSuccess: () => {
            router.back()
          },
          onError: (error) => {
            Alert.alert('Failed to create project', error.message)
          },
        }
      )
    },
    [createProject]
  )

  const handleCancel = useCallback(() => {
    router.back()
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'New Project',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createProject.isPending}
          submitLabel="Create"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
