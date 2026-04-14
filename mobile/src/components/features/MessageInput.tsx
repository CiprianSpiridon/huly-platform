/**
 * Message input component with rich text formatting toolbar.
 *
 * Text input with send button for composing messages in channels and
 * threads. Supports draft preservation via callback. Send button is
 * disabled when input is empty or sending is in progress.
 *
 * A formatting toolbar above the keyboard provides bold, italic, and
 * code toggle buttons. The output is a MarkupNode JSON string for the API.
 */

import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { View, TextInput, Pressable, ActivityIndicator, Text, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { AttachmentButton } from '@/components/features/AttachmentButton'
import {
  MarkupNodeType,
  MarkupMarkType,
  type MarkupNode,
  type MarkupMark,
} from '@/types/markup'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MessageInputProps {
  onSend: (content: string) => void
  onDraftChange?: (text: string) => void
  onAttachmentUploaded?: (blobId: string) => void
  initialDraft?: string
  placeholder?: string
  isSending?: boolean
  showAttachButton?: boolean
  showToolbar?: boolean
}

// ---------------------------------------------------------------------------
// Format types
// ---------------------------------------------------------------------------

type InlineFormat = 'bold' | 'italic' | 'code'

interface FormatButton {
  format: InlineFormat
  label: string
  icon: string
  fontStyle?: string
}

const FORMAT_BUTTONS: readonly FormatButton[] = [
  { format: 'bold', label: 'Bold', icon: 'B', fontStyle: 'font-sans-bold' },
  { format: 'italic', label: 'Italic', icon: 'I', fontStyle: 'italic' },
  { format: 'code', label: 'Code', icon: '</>', fontStyle: '' },
] as const

// ---------------------------------------------------------------------------
// Markup conversion helpers
// ---------------------------------------------------------------------------

/**
 * Map inline format name to MarkupMarkType.
 */
function formatToMarkType(format: InlineFormat): MarkupMarkType {
  switch (format) {
    case 'bold':
      return MarkupMarkType.bold
    case 'italic':
      return MarkupMarkType.em
    case 'code':
      return MarkupMarkType.code
  }
}

/**
 * Convert plain text with active formats into a MarkupNode JSON string.
 *
 * For the mobile MVP, the entire message is treated as a single paragraph.
 * Active formats at send time are applied to the entire text. This is
 * intentionally simple -- a full rich text editor is future work.
 */
function textToMarkupJson(text: string, activeFormats: Set<InlineFormat>): string {
  const marks: MarkupMark[] = []
  for (const fmt of activeFormats) {
    marks.push({ type: formatToMarkType(fmt) })
  }

  // Split on newlines to create multiple paragraphs
  const lines = text.split('\n')
  const paragraphs: MarkupNode[] = lines.map((line) => {
    if (line.length === 0) {
      return { type: MarkupNodeType.paragraph, content: [] }
    }

    const textNode: MarkupNode = {
      type: MarkupNodeType.text,
      text: line,
    }
    if (marks.length > 0) {
      textNode.marks = marks
    }

    return {
      type: MarkupNodeType.paragraph,
      content: [textNode],
    }
  })

  const doc: MarkupNode = {
    type: MarkupNodeType.doc,
    content: paragraphs,
  }

  return JSON.stringify(doc)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MessageInputInner({
  onSend,
  onDraftChange,
  onAttachmentUploaded,
  initialDraft = '',
  placeholder = 'Type a message...',
  isSending = false,
  showAttachButton = true,
  showToolbar = true,
}: MessageInputProps): React.ReactNode {
  const [text, setText] = useState(initialDraft)
  const [activeFormats, setActiveFormats] = useState<Set<InlineFormat>>(new Set())
  const [toolbarVisible, setToolbarVisible] = useState(false)

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

    // Convert to markup JSON if any formats are active, otherwise send plain
    const content = activeFormats.size > 0
      ? textToMarkupJson(trimmed, activeFormats)
      : trimmed

    onSend(content)
    setText('')
    onDraftChange?.('')
    setActiveFormats(new Set())
  }, [text, isSending, onSend, onDraftChange, activeFormats])

  const handleToggleFormat = useCallback((format: InlineFormat) => {
    setActiveFormats((prev) => {
      const next = new Set(prev)
      if (next.has(format)) {
        next.delete(format)
      } else {
        next.add(format)
      }
      return next
    })
  }, [])

  const handleToggleToolbar = useCallback(() => {
    setToolbarVisible((prev) => !prev)
  }, [])

  const canSend = text.trim().length > 0 && !isSending

  return (
    <View className="bg-surface-primary border-t border-border-primary">
      {/* Formatting toolbar */}
      {showToolbar && toolbarVisible && (
        <View className="border-b border-border-primary bg-surface-secondary">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="flex-row items-center px-2 py-1 gap-1"
          >
            {FORMAT_BUTTONS.map((btn) => {
              const isActive = activeFormats.has(btn.format)
              return (
                <Pressable
                  key={btn.format}
                  className={`min-w-[44px] min-h-[44px] items-center justify-center rounded-md px-2 ${
                    isActive ? 'bg-accent-subtle' : 'active:bg-surface-tertiary'
                  }`}
                  onPress={() => handleToggleFormat(btn.format)}
                  accessibilityRole="button"
                  accessibilityLabel={btn.label}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    className={`text-sm ${btn.fontStyle ?? ''} ${
                      isActive ? 'text-accent-primary' : 'text-content-secondary'
                    }`}
                  >
                    {btn.icon}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Input row */}
      <View className="flex-row items-end px-4 py-2">
        {showAttachButton && (
          <AttachmentButton
            onUploaded={onAttachmentUploaded}
            color="#77818B"
            size={22}
          />
        )}

        {/* Formatting toggle */}
        {showToolbar && (
          <Pressable
            className={`w-8 h-11 items-center justify-center mr-1 ${toolbarVisible ? 'opacity-100' : 'opacity-60'}`}
            onPress={handleToggleToolbar}
            accessibilityRole="button"
            accessibilityLabel={toolbarVisible ? 'Hide formatting toolbar' : 'Show formatting toolbar'}
          >
            <Ionicons
              name="text-outline"
              size={18}
              color={toolbarVisible ? '#205DC2' : '#77818B'}
            />
          </Pressable>
        )}

        <TextInput
          className={`flex-1 bg-surface-tertiary text-content-primary font-sans text-sm rounded-xl px-4 py-2.5 mr-2 min-h-[44px] max-h-[120px] ${
            activeFormats.has('bold') ? 'font-sans-bold' : ''
          } ${activeFormats.has('italic') ? 'italic' : ''}`}
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
    </View>
  )
}

const MessageInput = memo(MessageInputInner)

export { MessageInput }
export type { MessageInputProps }
