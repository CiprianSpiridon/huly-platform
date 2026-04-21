/**
 * Member row component.
 *
 * Renders a single workspace member with avatar, name, email, and
 * optional action button. Used in the member list and assignee contexts.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { AvatarCircle } from '@/components/ui/AvatarCircle'
import type { MemberItem } from '@/repositories/members'

interface MemberRowProps {
  member: MemberItem
  onPress?: (member: MemberItem) => void
  /**
   * When true, show a chevron on the right side signaling the row is
   * tappable. Used by screens that expose a detail sheet.
   */
  showChevron?: boolean
}

function MemberRowInner({ member, onPress, showChevron = false }: MemberRowProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onPress?.(member)
  }, [member, onPress])

  const roleLabel = formatRole(member.role)

  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3 min-h-[44px] active:bg-surface-tertiary"
      onPress={handlePress}
      disabled={onPress == null}
      accessibilityRole={onPress != null ? 'button' : 'text'}
      accessibilityLabel={`${member.name}${member.email.length > 0 ? `, ${member.email}` : ''}${roleLabel != null ? `, role ${roleLabel}` : ''}`}
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
      {roleLabel != null && (
        <Text className="font-sans text-xs text-content-tertiary mr-1">{roleLabel}</Text>
      )}
      {showChevron && onPress != null && (
        <Ionicons name="chevron-forward" size={16} color="#77818B" />
      )}
    </Pressable>
  )
}

function formatRole(raw: string): string | null {
  if (raw.length === 0) return null
  switch (raw.toUpperCase()) {
    case 'OWNER':
      return 'Owner'
    case 'MAINTAINER':
      return 'Maintainer'
    case 'USER':
      return 'User'
    case 'GUEST':
    case 'READONLYGUEST':
    case 'DOCGUEST':
      return 'Guest'
    case 'ADMIN':
      return 'Admin'
    default:
      return null
  }
}

const MemberRow = memo(MemberRowInner)

export { MemberRow }
export type { MemberRowProps }
