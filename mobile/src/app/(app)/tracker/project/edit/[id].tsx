import { useCallback, useEffect } from 'react'
import { Alert, View, Text, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Ref, Space } from '@hcengineering/core'

import { useProjectDetail, useUpdateProject, useDeleteProject } from '@/hooks/useProjects'
import { ProjectForm, type ProjectFormData } from '@/components/features/ProjectForm'
import { Pressable } from 'react-native'

/**
 * Edit project screen.
 *
 * Preloads existing project data and provides edit form. Includes
 * a delete action with confirmation.
 */
export default function EditProjectScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: project, isLoading, error } = useProjectDetail(id)
  const updateProject = useUpdateProject()
  const deleteProjectMutation = useDeleteProject()

  const handleSubmit = useCallback(
    (data: ProjectFormData) => {
      if (id == null) return
      updateProject.mutate(
        {
          projectId: id as Ref<Space>,
          update: {
            name: data.name,
            description: data.description || undefined,
          },
        },
        {
          onSuccess: () => {
            router.back()
          },
          onError: (err) => {
            Alert.alert('Failed to update project', err.message)
          },
        }
      )
    },
    [id, updateProject]
  )

  const handleCancel = useCallback(() => {
    router.back()
  }, [])

  const handleDelete = useCallback(() => {
    if (id == null || project == null) return
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"? All issues in this project will also be deleted. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProjectMutation.mutate(
              { projectId: id as Ref<Space> },
              {
                onSuccess: () => {
                  // Navigate all the way back to the project list
                  router.replace('/(app)/tracker' as Href)
                },
                onError: (err) => {
                  Alert.alert('Delete failed', err.message)
                },
              }
            )
          },
        },
      ]
    )
  }, [id, project, deleteProjectMutation])

  useEffect(() => {
    if (!id) router.replace('/(app)/tracker' as Href)
  }, [id])

  if (!id) return null

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Edit Project' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
        </View>
      </SafeAreaView>
    )
  }

  if (error != null || project == null) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <Stack.Screen options={{ title: 'Edit Project' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            {error != null ? 'Failed to load project' : 'Project not found'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          title: `Edit ${project.identifier}`,
          presentation: 'modal',
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ProjectForm
          initialData={{
            name: project.name,
            identifier: project.identifier,
            description: (project.description as string) ?? '',
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={updateProject.isPending}
          submitLabel="Save"
          identifierReadOnly
        />

        {/* Delete button */}
        <View className="px-4 pb-4">
          <Pressable
            className="bg-negative/10 rounded-md py-3 min-h-[44px] items-center justify-center border border-negative/30"
            onPress={handleDelete}
            disabled={deleteProjectMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Delete project"
          >
            {deleteProjectMutation.isPending ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text className="font-sans-medium text-sm text-negative">Delete Project</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
