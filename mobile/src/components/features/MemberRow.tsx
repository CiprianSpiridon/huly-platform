/**
 * Member row component.
 *
 * Renders a single workspace member with avatar, name, email, and
 * optional action button. Used in the member list and assignee contexts.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'

import { AvatarCircle } from '@/components/ui/AvatarCircle'
import type { MemberItem } from '@/repositories/members'

interface MemberRowProps {
  member: MemberItem
  onPress?: (member: MemberItem) => void
}

function MemberRowInner({ member, onPress }: MemberRowProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onPress?.(member)
  }, [member, onPress])

  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3 min-h-[44px] active:bg-surface-tertiary"
      onPress={handlePress}
      disabled={onPress == null}
      accessibilityRole={onPress != null ? 'button' : 'text'}
      accessibilityLabel={`${member.name}${member.email.length > 0 ? `, ${member.email}` : ''}`}
    >
      <AvatarCircle name={member.name} imageUrl={member.avatarUrl} size={40} />
      <View className="flex-1">
        <Text className="font-sans-medium text-sm text-content-primary" numberOfLines={1}>
          {member.name}
        </Text>
        {member.email.length > 0 ? (
          <Text className="font-sans text-xs text-content-secondary" numberOfLines={1}>
            {member.email}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const MemberRow = memo(MemberRowInner)

export { MemberRow }
export type { MemberRowProps }
