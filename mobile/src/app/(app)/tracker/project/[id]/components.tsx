/**
 * Project-scoped Component list screen.
 *
 * Lists all Components in the active tracker project with row-level Edit
 * and Delete affordances. Hard delete (matches web parity) — no archive
 * flag, no isArchived field. Confirmed via Alert; failed delete leaves
 * the row visible (showErrorToast surfaced by useDeleteComponent.onError).
 */

import { useCallback, useMemo } from 'react'
import { View, Text, ActivityIndicator, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Doc, Ref, Space } from '@hcengineering/core'

import { useComponents, useDeleteComponent } from '@/hooks'
import { useMembers } from '@/hooks/useMembers'
import { AvatarCircle } from '@/components/ui/AvatarCircle'
import type { ComponentItem } from '@/repositories/tracker'
import type { MemberItem } from '@/repositories/members'

export default function ProjectComponentsScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = id as Ref<Space>

  const { data, isLoading, error, refetch, isRefetching } = useComponents(projectId)
  const { data: members } = useMembers()
  const deleteComponent = useDeleteComponent()

  const memberById = useMemo(() => {
    const map = new Map<string, MemberItem>()
    if (members != null) {
      for (const m of members) map.set(m._id, m)
    }
    return map
  }, [members])

  const handleEdit = useCallback(
    (componentId: string) => {
      router.push(
        `/(app)/tracker/project/${id}/components/${componentId}` as Href
      )
    },
    [id]
  )

  const handleDelete = useCallback(
    (item: ComponentItem) => {
      Alert.alert(
        'Delete component?',
        'This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteComponent.mutate({
                componentId: item._id as Ref<Doc>,
                space: projectId,
              })
            },
          },
        ],
        { cancelable: true }
      )
    },
    [deleteComponent, projectId]
  )

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Components' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
          <Text className="font-sans text-sm text-content mt-3">
            Loading components...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Components' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            Failed to load components
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            {error.message}
          </Text>
          <Pressable
            className="bg-primary rounded-md px-6 py-3 mt-4 min-h-[44px] items-center justify-center"
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading components"
          >
            <Text className="font-sans-medium text-sm text-on-accent">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const items = data ?? []

  // Empty state
  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Components' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="cube-outline" size={48} color="#77818B" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            No components yet
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            Components organize related issues within a project.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // List view
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Stack.Screen options={{ title: 'Components' }} />
      <FlashList
        data={items}
        renderItem={({ item }) => {
          const lead = item.lead != null ? memberById.get(item.lead) : undefined
          const leadName = lead?.name ?? (item.lead != null ? 'Lead' : undefined)
          const isDeleting =
            deleteComponent.isPending &&
            deleteComponent.variables?.componentId === item._id

          return (
            <View
              className="bg-surface-secondary rounded-lg p-3 mb-2 flex-row items-center"
              accessibilityRole="summary"
              accessibilityLabel={`Component ${item.name}`}
            >
              {leadName != null ? (
                <View className="mr-3">
                  <AvatarCircle
                    name={leadName}
                    imageUrl={lead?.avatarUrl ?? null}
                    size={32}
                  />
                </View>
              ) : null}
              <View className="flex-1 min-w-0 mr-2">
                <Text
                  className="font-sans-medium text-sm text-caption"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.description != null && item.description.length > 0 ? (
                  <Text
                    className="font-sans text-xs text-content-secondary mt-0.5"
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleEdit(item._id)}
                className="p-2 min-h-[44px] min-w-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Edit component ${item.name}`}
              >
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item)}
                disabled={isDeleting}
                className="p-2 min-h-[44px] min-w-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Delete component ${item.name}`}
                accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EE7A7A" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#EE7A7A" />
                )}
              </Pressable>
            </View>
          )
        }}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
        onRefresh={() => void refetch()}
        refreshing={isRefetching}
      />
    </SafeAreaView>
  )
}
