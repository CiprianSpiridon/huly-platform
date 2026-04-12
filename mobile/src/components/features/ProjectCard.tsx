/**
 * Project card component.
 *
 * Displays project identifier badge, name, and description.
 * Feature tier -- composes ui primitives, uses callbacks, navigable.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface ProjectCardProps {
  identifier: string
  name: string
  description?: string
  memberCount?: number
  onPress: () => void
  testID?: string
}

function ProjectCardInner({
  identifier,
  name,
  description,
  memberCount,
  onPress,
  testID,
}: ProjectCardProps): React.ReactNode {
  return (
    <Pressable
      className="bg-surface-secondary rounded-lg p-4 mb-3 border border-border-primary active:opacity-80"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Project ${identifier}: ${name}`}
      accessibilityHint="Opens project issue list"
      testID={testID}
    >
      <View className="flex-row items-center gap-3">
        <View className="bg-accent-subtle rounded-md px-2 py-1">
          <Text className="font-sans-bold text-xs text-accent-primary">
            {identifier}
          </Text>
        </View>
        <Text
          className="font-sans-semibold text-base text-caption flex-1"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#77818B" />
      </View>

      {description ? (
        <Text
          className="font-sans text-sm text-content mt-2"
          numberOfLines={2}
        >
          {description}
        </Text>
      ) : null}

      {memberCount !== undefined && memberCount > 0 ? (
        <View className="flex-row items-center gap-1 mt-2">
          <Ionicons name="people-outline" size={14} color="#77818B" />
          <Text className="font-sans text-xs text-dark">
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const ProjectCard = memo(ProjectCardInner)

export { ProjectCard }
export type { ProjectCardProps }
