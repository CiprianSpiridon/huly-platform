/**
 * Message bubble component.
 *
 * Displays a single chat message with sender avatar + name, text content,
 * timestamp, reaction pills, and reply count. Supports long-press for
 * action menu (reactions, edit, delete, pin). Edit mode replaces the
 * message body with an inline TextInput.
 */

import { memo, useCallback, useState, useRef, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'

import { AvatarCircle } from '@/components/ui/AvatarCircle'
import { ReactionPills } from '@/components/features/ReactionPills'
import { MarkupRenderer } from '@/components/features/MarkupRenderer'
import { markupToPlainText } from '@/lib/markupUtils'
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
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
  onPin?: (messageId: string, isPinned: boolean) => void
  isEditing?: boolean
  onCancelEdit?: () => void
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
// Action menu component
// ---------------------------------------------------------------------------

interface MessageActionMenuProps {
  isOwnMessage: boolean
  onEdit: () => void
  onDelete: () => void
  onPin: () => void
  onReaction: () => void
  onDismiss: () => void
}

function MessageActionMenu({
  isOwnMessage,
  onEdit,
  onDelete,
  onPin,
  onReaction,
  onDismiss,
}: MessageActionMenuProps): React.ReactNode {
  return (
    <Pressable
      className="absolute inset-0 z-10"
      onPress={onDismiss}
      accessibilityLabel="Dismiss action menu"
    >
      <View className="absolute right-4 top-0 bg-surface-secondary rounded-lg border border-border-primary shadow-lg min-w-[160px]">
        <Pressable
          className="flex-row items-center gap-3 px-4 py-3 min-h-[44px] active:bg-surface-tertiary"
          onPress={onReaction}
          accessibilityRole="button"
          accessibilityLabel="Add reaction"
        >
          <Ionicons name="happy-outline" size={18} color="#ABABAF" />
          <Text className="font-sans text-sm text-content-primary">React</Text>
        </Pressable>

        <Pressable
          className="flex-row items-center gap-3 px-4 py-3 min-h-[44px] active:bg-surface-tertiary"
          onPress={onPin}
          accessibilityRole="button"
          accessibilityLabel="Pin message"
        >
          <Ionicons name="pin-outline" size={18} color="#ABABAF" />
          <Text className="font-sans text-sm text-content-primary">Pin</Text>
        </Pressable>

        {isOwnMessage && (
          <>
            <View className="h-px bg-border-primary" />
            <Pressable
              className="flex-row items-center gap-3 px-4 py-3 min-h-[44px] active:bg-surface-tertiary"
              onPress={onEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit message"
            >
              <Ionicons name="pencil-outline" size={18} color="#ABABAF" />
              <Text className="font-sans text-sm text-content-primary">Edit</Text>
            </Pressable>

            <Pressable
              className="flex-row items-center gap-3 px-4 py-3 min-h-[44px] active:bg-surface-tertiary"
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete message"
            >
              <Ionicons name="trash-outline" size={18} color="#F04438" />
              <Text className="font-sans text-sm text-status-error">Delete</Text>
            </Pressable>
          </>
        )}
      </View>
    </Pressable>
  )
}

// ---------------------------------------------------------------------------
// Inline editor component
// ---------------------------------------------------------------------------

interface InlineEditorProps {
  initialContent: string
  onSave: (content: string) => void
  onCancel: () => void
}

function InlineEditor({ initialContent, onSave, onCancel }: InlineEditorProps): React.ReactNode {
  const plainText = markupToPlainText(initialContent)
  const [text, setText] = useState(plainText)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    // Auto-focus on mount
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSave = useCallback(() => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    onSave(trimmed)
  }, [text, onSave])

  return (
    <View className="bg-surface-tertiary rounded-lg p-2 mt-1">
      <TextInput
        ref={inputRef}
        className="text-content-primary font-sans text-sm min-h-[36px] max-h-[120px] px-2 py-1"
        value={text}
        onChangeText={setText}
        multiline
        accessibilityLabel="Edit message text"
        placeholderTextColor="#77818B"
      />
      <View className="flex-row justify-end gap-2 mt-2">
        <Pressable
          className="px-3 py-1.5 rounded-md active:bg-surface-tertiary min-h-[36px] items-center justify-center"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
        >
          <Text className="font-sans-medium text-xs text-content-secondary">Cancel</Text>
        </Pressable>
        <Pressable
          className="px-3 py-1.5 rounded-md bg-accent-primary active:bg-accent-primary-hover min-h-[36px] items-center justify-center"
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save edit"
        >
          <Text className="font-sans-medium text-xs text-white">Save</Text>
        </Pressable>
      </View>
    </View>
  )
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
  onEdit,
  onDelete,
  onPin,
  isEditing = false,
  onCancelEdit,
}: MessageBubbleProps): React.ReactNode {
  const [showActions, setShowActions] = useState(false)
  const isOwnMessage = message.sender === currentUserId

  const handleLongPress = useCallback(() => {
    if (onEdit != null || onDelete != null) {
      setShowActions(true)
    } else {
      onLongPress?.(message)
    }
  }, [message, onLongPress, onEdit, onDelete])

  const handleThreadPress = useCallback(() => {
    onThreadPress?.(message)
  }, [message, onThreadPress])

  const handleReactionToggle = useCallback(
    (emoji: string, hasReacted: boolean) => {
      onReactionToggle(message._id, emoji, hasReacted)
    },
    [message._id, onReactionToggle]
  )

  const handleDismissActions = useCallback(() => {
    setShowActions(false)
  }, [])

  const handleEditPress = useCallback(() => {
    setShowActions(false)
    onEdit?.(message._id, message.content)
  }, [message._id, message.content, onEdit])

  const handleDeletePress = useCallback(() => {
    setShowActions(false)
    Alert.alert(
      'Delete message',
      'Are you sure you want to delete this message? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(message._id),
        },
      ]
    )
  }, [message._id, onDelete])

  const handlePinPress = useCallback(() => {
    setShowActions(false)
    onPin?.(message._id, message.pinned ?? false)
  }, [message._id, message.pinned, onPin])

  const handleReactionFromMenu = useCallback(() => {
    setShowActions(false)
    onLongPress?.(message)
  }, [message, onLongPress])

  const handleSaveEdit = useCallback(
    (content: string) => {
      onEdit?.(message._id, content)
    },
    [message._id, onEdit]
  )

  const handleCancelEdit = useCallback(() => {
    onCancelEdit?.()
  }, [onCancelEdit])

  const displayName = getSenderDisplayName(message.senderName || message.sender)
  const isOptimistic = message._id.startsWith('optimistic')

  // Plain text fallback for accessibility label
  const plainText = markupToPlainText(message.content)

  return (
    <View className="relative">
      {showActions && (
        <MessageActionMenu
          isOwnMessage={isOwnMessage}
          onEdit={handleEditPress}
          onDelete={handleDeletePress}
          onPin={handlePinPress}
          onReaction={handleReactionFromMenu}
          onDismiss={handleDismissActions}
        />
      )}
      <Pressable
        className={`flex-row px-4 py-2 ${isOptimistic ? 'opacity-60' : ''} ${isEditing ? 'bg-accent-subtle/10' : ''}`}
        onLongPress={handleLongPress}
        delayLongPress={400}
        accessibilityRole="text"
        accessibilityLabel={`Message from ${displayName}: ${plainText}`}
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
            {message.modifiedOn > message.createdOn + 1000 && (
              <Text className="font-sans text-xs text-content-tertiary ml-1">(edited)</Text>
            )}
          </View>

          {/* Message text (rich) or inline editor */}
          {isEditing ? (
            <InlineEditor
              initialContent={message.content}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          ) : (
            <MarkupRenderer content={message.content} />
          )}

          {/* Inline attachments */}
          {message.attachments.length > 0 && !isEditing && (
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
          {!isEditing && (
            <ReactionPills
              reactions={message.reactions}
              currentUserId={currentUserId}
              onToggle={handleReactionToggle}
            />
          )}

          {/* Thread indicator */}
          {message.replyCount > 0 && onThreadPress != null && !isEditing && (
            <Pressable
              className="flex-row items-center mt-1.5 min-h-[44px] active:opacity-80"
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
    </View>
  )
}

const MessageBubble = memo(MessageBubbleInner)

export { MessageBubble }
export type { MessageBubbleProps }
