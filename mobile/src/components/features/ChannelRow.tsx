/**
 * Channel row component for the channel list.
 *
 * Displays channel name, last message preview, timestamp, and unread
 * indicator. Used in both Channels and Direct Messages sections.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'

import { truncateMarkupText } from '@/lib/markupUtils'
import type { ChannelItem } from '@/repositories/chat'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChannelRowProps {
  channel: ChannelItem
  unreadCount: number
  onPress: (channel: ChannelItem) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(timestamp: number): string {
  if (timestamp === 0) return ''

  const now = Date.now()
  const diff = now - timestamp

  const ONE_MINUTE = 60_000
  const ONE_HOUR = 60 * ONE_MINUTE
  const ONE_DAY = 24 * ONE_HOUR

  if (diff < ONE_MINUTE) return 'now'
  if (diff < ONE_HOUR) return `${Math.floor(diff / ONE_MINUTE)}m`
  if (diff < ONE_DAY) return `${Math.floor(diff / ONE_HOUR)}h`
  if (diff < 7 * ONE_DAY) return `${Math.floor(diff / ONE_DAY)}d`

  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// truncateMessage replaced by truncateMarkupText from @/lib/markupUtils

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ChannelRowInner({
  channel,
  unreadCount,
  onPress,
}: ChannelRowProps): React.ReactNode {
  const isUnread = unreadCount > 0

  const handlePress = useCallback(() => {
    onPress(channel)
  }, [channel, onPress])

  return (
    <Pressable
      className="flex-row items-center px-4 py-3 min-h-[44px] active:bg-surface-tertiary"
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${channel.name}${isUnread ? `, ${unreadCount} unread messages` : ''}`}
      accessibilityHint="Opens channel"
    >
      {/* Channel icon / indicator */}
      <View className="w-10 h-10 rounded-lg bg-surface-tertiary items-center justify-center mr-3">
        <Text className="font-sans-bold text-base text-content-secondary">
          {channel.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 mr-2">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text
            className={`text-sm flex-1 mr-2 ${
              isUnread
                ? 'font-sans-bold text-content-primary'
                : 'font-sans-medium text-content-primary'
            }`}
            numberOfLines={1}
          >
            {channel.name}
          </Text>
          <Text className="font-sans text-xs text-content-tertiary">
            {formatTimestamp(channel.lastMessageTimestamp)}
          </Text>
        </View>
        {channel.lastMessage.length > 0 && (
          <Text
            className={`text-xs ${
              isUnread
                ? 'font-sans-medium text-content-secondary'
                : 'font-sans text-content-tertiary'
            }`}
            numberOfLines={1}
          >
            {truncateMarkupText(channel.lastMessage)}
          </Text>
        )}
      </View>

      {/* Unread indicator */}
      {isUnread && (
        <View className="min-w-[20px] h-5 rounded-full bg-accent-primary items-center justify-center px-1.5">
          <Text className="font-sans-bold text-xs text-on-accent">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const ChannelRow = memo(ChannelRowInner)

export { ChannelRow }
export type { ChannelRowProps }
