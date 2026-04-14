/**
 * Channel detail / messages screen.
 *
 * Inverted FlatList for messages with MessageBubble components.
 * Uses FlatList with inverted prop since FlashList v2 dropped inverted support.
 * MessageInput at bottom with keyboard-avoiding behavior.
 * Long-press on messages opens the reaction picker or action menu
 * (edit/delete for own messages). Marks channel as read on mount.
 * Loads older messages on scroll to top.
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, FlatList, Alert, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'

import { useMessages, useSendMessage, useToggleReaction, useEditMessage, useDeleteMessage, usePinMessage } from '@/hooks/useMessages'
import { useChatStore } from '@/store/chat'
import { useConnectionStore } from '@/store/connection'
import { MessageBubble } from '@/components/features/MessageBubble'
import { MessageInput } from '@/components/features/MessageInput'
import { ReactionPicker } from '@/components/features/ReactionPicker'
import { AttachmentViewer } from '@/components/features/AttachmentViewer'
import { UploadProgress } from '@/components/features/UploadProgress'
import type { MessageItem } from '@/repositories/chat'

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ChannelDetailScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const currentUserId = useConnectionStore((s) => s.currentSocialId) ?? 'unknown'

  const {
    data: messagesData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(id)

  const sendMessage = useSendMessage()
  const toggleReaction = useToggleReaction()
  const editMessageMutation = useEditMessage()
  const deleteMessageMutation = useDeleteMessage()
  const pinMessageMutation = usePinMessage()

  const clearUnread = useChatStore((s) => s.clearUnread)
  const setActiveChannel = useChatStore((s) => s.setActiveChannel)
  const getDraft = useChatStore((s) => s.getDraft)
  const saveDraft = useChatStore((s) => s.saveDraft)
  const editingMessageId = useChatStore((s) => s.editingMessageId)
  const setEditingMessage = useChatStore((s) => s.setEditingMessage)

  const reactionPickerRef = useRef<BottomSheetModal>(null)
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null)
  const [viewedAttachment, setViewedAttachment] = useState<{
    blobId: string
    filename: string
    mimeType: string
  } | null>(null)
  // Track pending attachment blob IDs to include in the next sent message
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([])

  // Mark channel as read and set active on mount
  useEffect(() => {
    if (id == null) return
    clearUnread(id)
    setActiveChannel(id)
    return () => {
      setActiveChannel(null)
      setEditingMessage(null)
    }
  }, [id, clearUnread, setActiveChannel, setEditingMessage])

  // Handle send -- includes any pending attachment blob IDs
  const handleSend = useCallback(
    (content: string) => {
      if (!id) return
      const attachmentIds = pendingAttachmentIds.length > 0 ? [...pendingAttachmentIds] : undefined
      sendMessage.mutate(
        { spaceId: id, content, attachmentIds },
        {
          onSuccess: () => {
            saveDraft(id, '')
          },
          onError: () => {
            Alert.alert('Send failed', 'Message could not be sent. Please try again.')
          },
        }
      )
      setPendingAttachmentIds([])
    },
    [id, sendMessage, pendingAttachmentIds, saveDraft]
  )

  // Handle attachment uploaded -- store blob ID for next send
  const handleAttachmentUploaded = useCallback(
    (blobId: string) => {
      setPendingAttachmentIds((prev) => [...prev, blobId])
    },
    []
  )

  // Handle draft changes
  const handleDraftChange = useCallback(
    (text: string) => {
      if (id) saveDraft(id, text)
    },
    [id, saveDraft]
  )

  // Handle long-press for reaction picker
  const handleLongPress = useCallback(
    (message: MessageItem) => {
      setSelectedMessage(message)
      reactionPickerRef.current?.present()
    },
    []
  )

  // Handle reaction selection from picker
  const handleSelectReaction = useCallback(
    (emoji: string) => {
      if (selectedMessage == null) return
      const hasReacted = selectedMessage.reactions.some(
        (r) => r.emoji === emoji && r.userIds.includes(currentUserId)
      )
      if (!id) return
      toggleReaction.mutate({
        messageId: selectedMessage._id,
        spaceId: id,
        emoji,
        hasReacted,
      })
    },
    [selectedMessage, id, toggleReaction, currentUserId]
  )

  // Handle inline reaction toggle from pills
  const handleReactionToggle = useCallback(
    (messageId: string, emoji: string, hasReacted: boolean) => {
      if (id) toggleReaction.mutate({ messageId, spaceId: id, emoji, hasReacted })
    },
    [id, toggleReaction]
  )

  // Handle edit message
  const handleEdit = useCallback(
    (messageId: string, content: string) => {
      if (!id) return
      if (editingMessageId === messageId) {
        // This is the save action from InlineEditor
        editMessageMutation.mutate(
          { messageId, spaceId: id, content },
          {
            onSuccess: () => setEditingMessage(null),
            onError: () => Alert.alert('Edit failed', 'Could not edit the message.'),
          }
        )
      } else {
        // This is the initial edit action -- enter edit mode
        setEditingMessage(messageId)
      }
    },
    [editingMessageId, editMessageMutation, id, setEditingMessage]
  )

  // Handle delete message
  const handleDelete = useCallback(
    (messageId: string) => {
      if (!id) return
      deleteMessageMutation.mutate(
        { messageId, spaceId: id },
        {
          onError: () => Alert.alert('Delete failed', 'Could not delete the message.'),
        }
      )
    },
    [deleteMessageMutation, id]
  )

  // Handle pin message
  const handlePin = useCallback(
    (messageId: string, isPinned: boolean) => {
      if (id) pinMessageMutation.mutate({ messageId, spaceId: id, isPinned })
    },
    [pinMessageMutation, id]
  )

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null)
  }, [setEditingMessage])

  // Handle attachment press
  const handleAttachmentPress = useCallback(
    (blobId: string, filename: string, mimeType: string) => {
      setViewedAttachment({ blobId, filename, mimeType })
    },
    []
  )

  const handleCloseAttachmentViewer = useCallback(() => {
    setViewedAttachment(null)
  }, [])

  // Handle thread navigation
  const handleThreadPress = useCallback(
    (message: MessageItem) => {
      router.push(`/(app)/chat/thread/${message._id}` as Href)
    },
    []
  )

  // Navigate to channel settings
  const handleSettingsPress = useCallback(() => {
    router.push(`/(app)/chat/channel/${id}/settings` as Href)
  }, [id])

  // Load more messages when reaching the top
  const handleEndReached = useCallback(() => {
    if (hasNextPage === true && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const renderItem = useCallback(
    ({ item }: { item: MessageItem }) => (
      <MessageBubble
        message={item}
        currentUserId={currentUserId}
        onLongPress={handleLongPress}
        onReactionToggle={handleReactionToggle}
        onThreadPress={handleThreadPress}
        onAttachmentPress={handleAttachmentPress}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPin={handlePin}
        isEditing={editingMessageId === item._id}
        onCancelEdit={handleCancelEdit}
      />
    ),
    [currentUserId, handleLongPress, handleReactionToggle, handleThreadPress, handleAttachmentPress, handleEdit, handleDelete, handlePin, editingMessageId, handleCancelEdit]
  )

  useEffect(() => {
    if (!id) router.replace('/(app)/chat' as Href)
  }, [id])

  if (!id) return null

  const messages = messagesData?.items ?? []

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Channel' }} />
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-sm text-content-tertiary">Loading messages...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error != null) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Channel' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="font-sans-medium text-base text-content-primary mb-2">
            Failed to load messages
          </Text>
          <Text className="font-sans text-sm text-content-tertiary mb-4 text-center">
            {error.message}
          </Text>
          <Text
            className="font-sans-medium text-sm text-accent-primary"
            onPress={() => { void refetch() }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading messages"
          >
            Tap to retry
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Channel',
          headerRight: () => (
            <Pressable
              onPress={handleSettingsPress}
              className="p-2 min-w-[44px] min-h-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Channel settings"
            >
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Empty state */}
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="font-sans-medium text-base text-content-primary mb-2">
              No messages yet
            </Text>
            <Text className="font-sans text-sm text-content-tertiary text-center">
              Be the first to send a message
            </Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            inverted
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            maxToRenderPerBatch={15}
            windowSize={11}
            removeClippedSubviews
            ListFooterComponent={
              isFetchingNextPage ? (
                <View className="py-4 items-center">
                  <Text className="font-sans text-xs text-content-tertiary">Loading older messages...</Text>
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Message input */}
        <MessageInput
          onSend={handleSend}
          onDraftChange={handleDraftChange}
          onAttachmentUploaded={handleAttachmentUploaded}
          initialDraft={getDraft(id)}
          isSending={sendMessage.isPending}
          showAttachButton
        />
      </KeyboardAvoidingView>

      {/* Upload progress overlay */}
      <UploadProgress />

      {/* Attachment viewer modal */}
      <AttachmentViewer
        attachment={viewedAttachment}
        onClose={handleCloseAttachmentViewer}
      />

      {/* Reaction picker */}
      <ReactionPicker
        bottomSheetRef={reactionPickerRef}
        onSelectReaction={handleSelectReaction}
      />
    </SafeAreaView>
  )
}
