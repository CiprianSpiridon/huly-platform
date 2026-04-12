/**
 * Issue row component for list display.
 *
 * Renders priority icon, identifier, title, status, and assignee in a
 * compact row format. Used inside FlashList for issue lists.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'

import { PriorityIcon } from '@/components/ui/PriorityIcon'
import { AvatarCircle } from '@/components/ui/AvatarCircle'

interface IssueRowProps {
  id: string
  identifier: string
  title: string
  priority: number
  statusName: string
  assigneeName?: string
  assigneeAvatar?: string | null
  onPress: (id: string) => void
  testID?: string
}

function IssueRowInner({
  id,
  identifier,
  title,
  priority,
  statusName,
  assigneeName,
  assigneeAvatar,
  onPress,
  testID,
}: IssueRowProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onPress(id)
  }, [id, onPress])

  return (
    <Pressable
      className="bg-surface-secondary rounded-lg p-3 mb-2 active:opacity-80"
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Issue ${identifier}: ${title}`}
      accessibilityHint="Opens issue details"
      testID={testID}
    >
      <View className="flex-row items-center gap-2 mb-1">
        <PriorityIcon priority={priority} size={16} />
        <Text className="font-sans-medium text-xs text-content-secondary">
          {identifier}
        </Text>
        <View className="flex-1" />
        <View className="bg-surface-tertiary rounded-sm px-1.5 py-0.5">
          <Text className="font-sans text-xs text-content-secondary" numberOfLines={1}>
            {statusName}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text
          className="font-sans-medium text-sm text-caption flex-1 mr-2"
          numberOfLines={2}
        >
          {title}
        </Text>
        {assigneeName ? (
          <AvatarCircle
            name={assigneeName}
            imageUrl={assigneeAvatar}
            size={24}
          />
        ) : null}
      </View>
    </Pressable>
  )
}

const IssueRow = memo(IssueRowInner)

export { IssueRow }
export type { IssueRowProps }
