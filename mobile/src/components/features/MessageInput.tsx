/**
 * Message input component.
 *
 * Text input with send button for composing messages in channels and
 * threads. Supports draft preservation via callback. Send button is
 * disabled when input is empty or sending is in progress.
 */

import { memo, useState, useCallback, useEffect } from 'react'
import { View, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MessageInputProps {
  onSend: (content: string) => void
  onDraftChange?: (text: string) => void
  initialDraft?: string
  placeholder?: string
  isSending?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MessageInputInner({
  onSend,
  onDraftChange,
  initialDraft = '',
  placeholder = 'Type a message...',
  isSending = false,
}: MessageInputProps): React.ReactNode {
  const [text, setText] = useState(initialDraft)

  // Sync when initial draft changes (e.g. navigating back to a channel)
  useEffect(() => {
    setText(initialDraft)
  }, [initialDraft])

  const handleChangeText = useCallback(
    (value: string) => {
      setText(value)
      onDraftChange?.(value)
    },
    [onDraftChange]
  )

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (trimmed.length === 0 || isSending) return

    onSend(trimmed)
    setText('')
    onDraftChange?.('')
  }, [text, isSending, onSend, onDraftChange])

  const canSend = text.trim().length > 0 && !isSending

  return (
    <View className="flex-row items-end px-4 py-2 bg-surface-primary border-t border-border-primary">
      <TextInput
        className="flex-1 bg-surface-tertiary text-content-primary font-sans text-sm rounded-xl px-4 py-2.5 mr-2 min-h-[44px] max-h-[120px]"
        value={text}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor="#77818B"
        multiline
        textAlignVertical="center"
        returnKeyType="default"
        editable={!isSending}
        accessibilityLabel="Message input"
        accessibilityHint="Type your message here"
      />
      <Pressable
        className={`w-11 h-11 rounded-full items-center justify-center ${
          canSend ? 'bg-accent-primary active:bg-accent-primary-hover' : 'bg-surface-tertiary'
        }`}
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons
            name="send"
            size={18}
            color={canSend ? '#FFFFFF' : '#4E535B'}
          />
        )}
      </Pressable>
    </View>
  )
}

const MessageInput = memo(MessageInputInner)

export { MessageInput }
export type { MessageInputProps }
