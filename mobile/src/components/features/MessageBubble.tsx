/**
 * Message bubble component.
 *
 * Displays a single chat message with sender avatar + name, text content,
 * timestamp, reaction pills, and reply count. Supports long-press for
 * reaction picker.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { Image } from 'expo-image'

import { AvatarCircle } from '@/components/ui/AvatarCircle'
import { ReactionPills } from '@/components/features/ReactionPills'
import { getAuthenticatedThumbnailUrl } from '@/repositories/attachment'
import type { MessageItem } from '@/repositories/chat'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: MessageItem
  currentUserId: string
  onLongPress?: (message: MessageItem) => void
  onReactionToggle: (messageId: string, emoji: string, hasReacted: boolean) => void
  onThreadPress?: (message: MessageItem) => void
  onAttachmentPress?: (blobId: string, filename: string, mimeType: string) => void
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
  // Extract readable name from social ID or email
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

function MessageBubbleInner({
  message,
  currentUserId,
  onLongPress,
  onReactionToggle,
  onThreadPress,
  onAttachmentPress,
}: MessageBubbleProps): React.ReactNode {
  const handleLongPress = useCallback(() => {
    onLongPress?.(message)
  }, [message, onLongPress])

  const handleThreadPress = useCallback(() => {
    onThreadPress?.(message)
  }, [message, onThreadPress])

  const handleReactionToggle = useCallback(
    (emoji: string, hasReacted: boolean) => {
      onReactionToggle(message._id, emoji, hasReacted)
    },
    [message._id, onReactionToggle]
  )

  const displayName = getSenderDisplayName(message.senderName || message.sender)
  const isOptimistic = message._id.startsWith('optimistic')

  // Strip basic HTML tags from message content for display
  const textContent = message.content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

  return (
    <Pressable
      className={`flex-row px-4 py-2 ${isOptimistic ? 'opacity-60' : ''}`}
      onLongPress={handleLongPress}
      delayLongPress={400}
      accessibilityRole="text"
      accessibilityLabel={`Message from ${displayName}: ${textContent}`}
    >
      {/* Avatar */}
      <View className="mr-3 pt-0.5">
        <AvatarCircle name={displayName} size={36} />
      </View>

      {/* Content */}
      <View className="flex-1">
        {/* Header: name + timestamp */}
        <View className="flex-row items-center mb-0.5">
          <Text className="font-sans-semibold text-sm text-content-primary mr-2">
            {displayName}
          </Text>
          <Text className="font-sans text-xs text-content-tertiary">
            {formatMessageTime(message.createdOn)}
          </Text>
        </View>

        {/* Message text */}
        <Text className="font-sans text-sm text-content-primary leading-5">
          {textContent}
        </Text>

        {/* Inline attachments */}
        {message.attachments.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-1.5"
            contentContainerClassName="gap-1.5"
          >
            {message.attachments.map((att) => {
              const isImage = att.contentType.startsWith('image/')
              if (isImage) {
                const thumbUrl = getAuthenticatedThumbnailUrl(att.blobId, 240, 160)
                return (
                  <Pressable
                    key={att.blobId}
                    onPress={() => onAttachmentPress?.(att.blobId, att.name, att.contentType)}
                    accessibilityRole="button"
                    accessibilityLabel={`Image attachment: ${att.name}`}
                    className="active:opacity-80"
                  >
                    <Image
                      source={{ uri: thumbUrl }}
                      className="w-[200px] h-[140px] rounded-md"
                      contentFit="cover"
                      transition={200}
                      recyclingKey={att.blobId}
                    />
                  </Pressable>
                )
              }
              return (
                <Pressable
                  key={att.blobId}
                  onPress={() => onAttachmentPress?.(att.blobId, att.name, att.contentType)}
                  className="bg-surface-tertiary rounded-md px-3 py-2 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel={`File attachment: ${att.name}`}
                >
                  <Text className="font-sans-medium text-xs text-content-primary" numberOfLines={1}>
                    {att.name}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        )}

        {/* Reactions */}
        <ReactionPills
          reactions={message.reactions}
          currentUserId={currentUserId}
          onToggle={handleReactionToggle}
        />

        {/* Thread indicator */}
        {message.replyCount > 0 && onThreadPress != null && (
          <Pressable
            className="flex-row items-center mt-1.5 active:opacity-80"
            onPress={handleThreadPress}
            accessibilityRole="button"
            accessibilityLabel={`${message.replyCount} ${message.replyCount === 1 ? 'reply' : 'replies'}, open thread`}
          >
            <Text className="font-sans-medium text-xs text-accent-primary">
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  )
}

const MessageBubble = memo(MessageBubbleInner)

export { MessageBubble }
export type { MessageBubbleProps }
