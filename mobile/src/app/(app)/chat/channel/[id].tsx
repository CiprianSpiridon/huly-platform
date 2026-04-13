/**
 * Channel detail / messages screen.
 *
 * Inverted FlatList for messages with MessageBubble components.
 * Uses FlatList with inverted prop since FlashList v2 dropped inverted support.
 * MessageInput at bottom with keyboard-avoiding behavior.
 * Long-press on messages opens the reaction picker.
 * Marks channel as read on mount. Loads older messages on scroll to top.
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { BottomSheetModal } from '@gorhom/bottom-sheet'

import { useMessages, useSendMessage, useToggleReaction } from '@/hooks/useMessages'
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

  const clearUnread = useChatStore((s) => s.clearUnread)
  const setActiveChannel = useChatStore((s) => s.setActiveChannel)
  const getDraft = useChatStore((s) => s.getDraft)
  const saveDraft = useChatStore((s) => s.saveDraft)

  const reactionPickerRef = useRef<BottomSheetModal>(null)
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null)
  const [viewedAttachment, setViewedAttachment] = useState<{
    blobId: string
    filename: string
    mimeType: string
  } | null>(null)

  if (!id) {
    router.back()
    return null
  }

  // Mark channel as read and set active on mount
  useEffect(() => {
    clearUnread(id)
    setActiveChannel(id)
    return () => {
      setActiveChannel(null)
    }
  }, [id, clearUnread, setActiveChannel])

  // Handle send
  const handleSend = useCallback(
    (content: string) => {
      sendMessage.mutate({ spaceId: id, content })
    },
    [id, sendMessage]
  )

  // Handle draft changes
  const handleDraftChange = useCallback(
    (text: string) => {
      saveDraft(id, text)
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
      toggleReaction.mutate({
        messageId: selectedMessage._id,
        spaceId: id,
        emoji,
        hasReacted,
      })
    },
    [selectedMessage, id, toggleReaction]
  )

  // Handle inline reaction toggle from pills
  const handleReactionToggle = useCallback(
    (messageId: string, emoji: string, hasReacted: boolean) => {
      toggleReaction.mutate({ messageId, spaceId: id, emoji, hasReacted })
    },
    [id, toggleReaction]
  )

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
      />
    ),
    [currentUserId, handleLongPress, handleReactionToggle, handleThreadPress, handleAttachmentPress]
  )

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
      <Stack.Screen options={{ title: 'Channel' }} />
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
