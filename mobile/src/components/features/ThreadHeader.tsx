/**
 * Thread header component.
 *
 * Displays the parent message pinned at the top of the thread view
 * with a visual distinction (border and background) from reply messages.
 */

import { memo } from 'react'
import { View, Text } from 'react-native'

import { AvatarCircle } from '@/components/ui/AvatarCircle'
import type { MessageItem } from '@/repositories/chat'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ThreadHeaderProps {
  message: MessageItem
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessageTime(timestamp: number): string {
  if (timestamp === 0) return ''
  const date = new Date(timestamp)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes
  return `${displayHours}:${displayMinutes} ${ampm}`
}

function getSenderDisplayName(sender: string): string {
  if (sender.includes('@')) {
    return sender.split('@')[0] ?? sender
  }
  if (sender.includes(':')) {
    const parts = sender.split(':')
    return parts[parts.length - 1] ?? sender
  }
  return sender
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ThreadHeaderInner({ message }: ThreadHeaderProps): React.ReactNode {
  const displayName = getSenderDisplayName(message.senderName || message.sender)

  const textContent = message.content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

  return (
    <View
      className="px-4 py-3 bg-surface-secondary border-b border-border-primary"
      accessibilityRole="header"
      accessibilityLabel={`Thread started by ${displayName}: ${textContent}`}
    >
      <View className="flex-row items-start">
        <View className="mr-3 pt-0.5">
          <AvatarCircle name={displayName} size={36} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center mb-0.5">
            <Text className="font-sans-semibold text-sm text-content-primary mr-2">
              {displayName}
            </Text>
            <Text className="font-sans text-xs text-content-tertiary">
              {formatMessageTime(message.createdOn)}
            </Text>
          </View>
          <Text className="font-sans text-sm text-content-primary leading-5">
            {textContent}
          </Text>
        </View>
      </View>
      <View className="mt-2 pt-2 border-t border-border-primary">
        <Text className="font-sans-medium text-xs text-content-tertiary">
          {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
        </Text>
      </View>
    </View>
  )
}

const ThreadHeader = memo(ThreadHeaderInner)

export { ThreadHeader }
export type { ThreadHeaderProps }
