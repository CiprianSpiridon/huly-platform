/**
 * Thread replies screen.
 *
 * Parent message pinned at top (ThreadHeader). Replies below in
 * chronological order. Reuses MessageBubble + MessageInput.
 * useSendThreadReply mutation for new replies.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { BottomSheetModal } from '@gorhom/bottom-sheet'

import { useThread, useSendThreadReply } from '@/hooks/useThread'
import { useToggleReaction } from '@/hooks/useMessages'
import { useConnectionStore } from '@/store/connection'
import { ThreadHeader } from '@/components/features/ThreadHeader'
import { MessageBubble } from '@/components/features/MessageBubble'
import { MessageInput } from '@/components/features/MessageInput'
import { ReactionPicker } from '@/components/features/ReactionPicker'
import type { MessageItem } from '@/repositories/chat'

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ThreadScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const currentUserId = useConnectionStore((s) => s.currentSocialId) ?? 'unknown'

  const { data, isLoading, error, refetch } = useThread(id)
  const sendReply = useSendThreadReply()
  const toggleReaction = useToggleReaction()

  const listRef = useRef<FlashListRef<MessageItem>>(null)
  const reactionPickerRef = useRef<BottomSheetModal>(null)
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null)
  // Track pending attachment blob IDs to include in the next sent reply
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([])

  // Handle send reply -- includes any pending attachment blob IDs
  const handleSend = useCallback(
    (content: string) => {
      if (data == null) return
      const attachmentIds = pendingAttachmentIds.length > 0 ? [...pendingAttachmentIds] : undefined
      sendReply.mutate(
        {
          messageId: id,
          spaceId: data.parent.space,
          content,
          attachmentIds,
        },
        {
          onSuccess: () => {
            setTimeout(() => {
              listRef.current?.scrollToEnd({ animated: true })
            }, 100)
          },
        }
      )
      setPendingAttachmentIds([])
    },
    [id, data, sendReply, pendingAttachmentIds]
  )

  // Handle attachment uploaded -- store blob ID for next send
  const handleAttachmentUploaded = useCallback(
    (blobId: string) => {
      setPendingAttachmentIds((prev) => [...prev, blobId])
    },
    []
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
      if (selectedMessage == null || data == null) return
      const hasReacted = selectedMessage.reactions.some(
        (r) => r.emoji === emoji && r.userIds.includes(currentUserId)
      )
      toggleReaction.mutate({
        messageId: selectedMessage._id,
        spaceId: data.parent.space,
        emoji,
        hasReacted,
      })
    },
    [selectedMessage, data, toggleReaction, currentUserId]
  )

  // Handle inline reaction toggle
  const handleReactionToggle = useCallback(
    (messageId: string, emoji: string, hasReacted: boolean) => {
      if (data == null) return
      toggleReaction.mutate({
        messageId,
        spaceId: data.parent.space,
        emoji,
        hasReacted,
      })
    },
    [data, toggleReaction]
  )

  const renderItem = useCallback(
    ({ item }: { item: MessageItem }) => (
      <MessageBubble
        message={item}
        currentUserId={currentUserId}
        onLongPress={handleLongPress}
        onReactionToggle={handleReactionToggle}
      />
    ),
    [currentUserId, handleLongPress, handleReactionToggle]
  )

  useEffect(() => {
    if (!id) router.replace('/(app)/chat' as Href)
  }, [id])

  if (!id) return null

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Thread' }} />
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-sm text-content-tertiary">Loading thread...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error != null || data == null) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Thread' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="font-sans-medium text-base text-content-primary mb-2">
            Failed to load thread
          </Text>
          <Text className="font-sans text-sm text-content-tertiary mb-4 text-center">
            {error?.message ?? 'Thread not found'}
          </Text>
          <Text
            className="font-sans-medium text-sm text-accent-primary"
            onPress={() => { void refetch() }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading thread"
          >
            Tap to retry
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Thread' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Parent message pinned at top */}
        <ThreadHeader message={data.parent} />

        {/* Replies */}
        {data.replies.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="font-sans text-sm text-content-tertiary text-center">
              No replies yet. Be the first to respond.
            </Text>
          </View>
        ) : (
          <FlashList
            ref={listRef}
            data={data.replies}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        )}

        {/* Reply input */}
        <MessageInput
          onSend={handleSend}
          onAttachmentUploaded={handleAttachmentUploaded}
          placeholder="Reply in thread..."
          isSending={sendReply.isPending}
          showAttachButton
        />
      </KeyboardAvoidingView>

      {/* Reaction picker */}
      <ReactionPicker
        bottomSheetRef={reactionPickerRef}
        onSelectReaction={handleSelectReaction}
      />
    </SafeAreaView>
  )
}
