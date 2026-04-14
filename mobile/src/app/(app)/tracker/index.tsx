import { useCallback, useState } from 'react'
import { View, Text, ActivityIndicator, RefreshControl, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { router, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Project } from '@hcengineering/tracker'

import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/features/ProjectCard'

/**
 * Project list screen.
 *
 * Displays all tracker projects with pull-to-refresh, loading skeleton,
 * empty state, and FAB for creating new projects.
 */
export default function ProjectListScreen(): React.ReactNode {
  const { data: projects, isLoading, error, refetch, fetchStatus } = useProjects()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleProjectPress = useCallback((project: Project) => {
    router.push(`/(app)/tracker/project/${project._id}` as Href)
  }, [])

  const handleSearchPress = useCallback(() => {
    router.push('/(app)/tracker/search' as Href)
  }, [])

  const handleCreateProjectPress = useCallback(() => {
    router.push('/(app)/tracker/project/new' as Href)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
          <Text className="font-sans text-sm text-content mt-3">
            Loading projects...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            Failed to load projects
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            {error.message}
          </Text>
          <Pressable
            className="bg-primary rounded-md px-6 py-3 mt-4 min-h-[44px] items-center justify-center"
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading projects"
          >
            <Text className="font-sans-medium text-sm text-on-accent">
              Retry
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // Empty state
  if (!projects || projects.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="folder-open-outline" size={48} color="#77818B" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            No projects
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            No tracker projects found in this workspace.
          </Text>
          <Pressable
            className="bg-primary rounded-md px-6 py-3 mt-4 min-h-[44px] items-center justify-center"
            onPress={handleCreateProjectPress}
            accessibilityRole="button"
            accessibilityLabel="Create new project"
          >
            <Text className="font-sans-medium text-sm text-on-accent">Create Project</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // Offline banner
  const isOffline = fetchStatus === 'paused'

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {isOffline ? (
        <View className="bg-priority-medium/15 px-4 py-2">
          <Text className="font-sans-medium text-xs text-priority-medium text-center">
            You are offline. Showing cached data.
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="font-sans-bold text-xl text-caption">
          Projects
        </Text>
        <Pressable
          onPress={handleSearchPress}
          className="p-2 min-h-[44px] min-w-[44px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Search issues"
        >
          <Ionicons name="search" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlashList
        data={projects}
        renderItem={({ item }) => (
          <ProjectCard
            identifier={item.identifier}
            name={item.name}
            description={item.description as string | undefined}
            memberCount={item.members?.length}
            onPress={() => handleProjectPress(item)}
          />
        )}
        keyExtractor={(item) => item._id}

        estimatedItemSize={80}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#205DC2"
            progressBackgroundColor="#1E1F23"
          />
        }
      />

      {/* FAB for new project */}
      <Pressable
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        onPress={handleCreateProjectPress}
        accessibilityRole="button"
        accessibilityLabel="Create new project"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  )
}
