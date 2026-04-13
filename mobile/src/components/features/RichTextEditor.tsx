/**
 * Basic rich text editor for issue descriptions.
 *
 * Provides a TextInput with a formatting toolbar and a live preview
 * toggle. Outputs valid MarkupNode JSON suitable for the Huly API.
 *
 * This is a structural editor that applies formatting tokens around
 * the current text. It works with a simple insertion-based model
 * rather than a full cursor-tracked approach (which would require
 * ProseMirror or similar).
 */

import { useState, useCallback, useRef } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'

import { MarkupRenderer } from '@/components/features/MarkupRenderer'
import { EditorToolbar, type FormatAction } from '@/components/features/EditorToolbar'
import {
  MarkupNodeType,
  MarkupMarkType,
  type MarkupNode,
  type MarkupMark,
} from '@/types/markup'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RichTextEditorProps {
  /** Current value as plain text (editing state). */
  value: string
  /** Called when the text content changes. */
  onChangeText: (text: string) => void
  /** Called with the serialised MarkupNode JSON on blur or explicit save. */
  onMarkupChange?: (json: string) => void
  /** Placeholder text. */
  placeholder?: string
  /** Accessibility label for the input. */
  accessibilityLabel?: string
  /** Whether the input is editable. */
  editable?: boolean
  /** Test ID for the container. */
  testID?: string
}

// ---------------------------------------------------------------------------
// Text-to-markup conversion
// ---------------------------------------------------------------------------

/**
 * Convert plain text with lightweight format tokens into a MarkupNode tree.
 *
 * Supports:
 * - Lines starting with `# `, `## `, `### ` -> headings
 * - Lines starting with `- ` or `* ` -> bullet list items
 * - Lines starting with `1. `, `2. ` etc -> ordered list items
 * - Lines wrapped in ``` (fenced code blocks)
 * - Inline `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``
 */
function textToMarkup(text: string): MarkupNode {
  const lines = text.split('\n')
  const content: MarkupNode[] = []
  let inCodeBlock = false
  const codeBlockLines: string[] = []

  for (const line of lines) {
    // Code block fences
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        content.push({
          type: MarkupNodeType.code_block,
          content: [
            { type: MarkupNodeType.text, text: codeBlockLines.join('\n') },
          ],
        })
        codeBlockLines.length = 0
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    // Headings
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line)
    if (headingMatch != null) {
      const level = headingMatch[1]?.length ?? 1
      content.push({
        type: MarkupNodeType.heading,
        attrs: { level },
        content: parseInlineMarks(headingMatch[2] ?? ''),
      })
      continue
    }

    // Bullet list item -- group consecutive items under one parent
    if (/^[-*]\s+/.test(line)) {
      const itemText = line.replace(/^[-*]\s+/, '')
      const listItem: MarkupNode = {
        type: MarkupNodeType.list_item,
        content: [
          {
            type: MarkupNodeType.paragraph,
            content: parseInlineMarks(itemText),
          },
        ],
      }
      const prev = content[content.length - 1]
      if (prev != null && prev.type === MarkupNodeType.bullet_list && prev.content != null) {
        prev.content.push(listItem)
      } else {
        content.push({
          type: MarkupNodeType.bullet_list,
          content: [listItem],
        })
      }
      continue
    }

    // Ordered list item -- group consecutive items under one parent
    const olMatch = /^(\d+)\.\s+(.+)$/.exec(line)
    if (olMatch != null) {
      const listItem: MarkupNode = {
        type: MarkupNodeType.list_item,
        content: [
          {
            type: MarkupNodeType.paragraph,
            content: parseInlineMarks(olMatch[2] ?? ''),
          },
        ],
      }
      const prev = content[content.length - 1]
      if (prev != null && prev.type === MarkupNodeType.ordered_list && prev.content != null) {
        prev.content.push(listItem)
      } else {
        content.push({
          type: MarkupNodeType.ordered_list,
          content: [listItem],
        })
      }
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      content.push({ type: MarkupNodeType.horizontal_rule })
      continue
    }

    // Empty line -> empty paragraph
    if (line.trim().length === 0) {
      content.push({ type: MarkupNodeType.paragraph, content: [] })
      continue
    }

    // Regular paragraph
    content.push({
      type: MarkupNodeType.paragraph,
      content: parseInlineMarks(line),
    })
  }

  // Flush unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    content.push({
      type: MarkupNodeType.code_block,
      content: [
        { type: MarkupNodeType.text, text: codeBlockLines.join('\n') },
      ],
    })
  }

  return { type: MarkupNodeType.doc, content }
}

/**
 * Parse inline formatting marks from a text string.
 *
 * Handles **bold**, *italic*, ~~strike~~, and `code`.
 */
function parseInlineMarks(text: string): MarkupNode[] {
  const nodes: MarkupNode[] = []
  // Pattern matches **bold**, *italic*, ~~strike~~, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null = regex.exec(text)

  while (match != null) {
    // Text before the match
    if (match.index > lastIndex) {
      nodes.push({
        type: MarkupNodeType.text,
        text: text.slice(lastIndex, match.index),
      })
    }

    const marks: MarkupMark[] = []
    let innerText = ''

    if (match[2] != null) {
      // **bold**
      marks.push({ type: MarkupMarkType.bold })
      innerText = match[2]
    } else if (match[3] != null) {
      // *italic*
      marks.push({ type: MarkupMarkType.em })
      innerText = match[3]
    } else if (match[4] != null) {
      // ~~strike~~
      marks.push({ type: MarkupMarkType.strike })
      innerText = match[4]
    } else if (match[5] != null) {
      // `code`
      marks.push({ type: MarkupMarkType.code })
      innerText = match[5]
    }

    nodes.push({
      type: MarkupNodeType.text,
      text: innerText,
      marks,
    })

    lastIndex = match.index + match[0].length
    match = regex.exec(text)
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push({
      type: MarkupNodeType.text,
      text: text.slice(lastIndex),
    })
  }

  // If nothing was parsed, just return the raw text
  if (nodes.length === 0) {
    nodes.push({ type: MarkupNodeType.text, text })
  }

  return nodes
}

// ---------------------------------------------------------------------------
// Toolbar format insertion helpers
// ---------------------------------------------------------------------------

const FORMAT_WRAPPERS: Record<FormatAction, { prefix: string; suffix: string }> = {
  bold: { prefix: '**', suffix: '**' },
  italic: { prefix: '*', suffix: '*' },
  heading: { prefix: '## ', suffix: '' },
  bulletList: { prefix: '- ', suffix: '' },
  orderedList: { prefix: '1. ', suffix: '' },
  code: { prefix: '`', suffix: '`' },
  strike: { prefix: '~~', suffix: '~~' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function RichTextEditor({
  value,
  onChangeText,
  onMarkupChange,
  placeholder = 'Write something...',
  accessibilityLabel = 'Rich text editor',
  editable = true,
  testID,
}: RichTextEditorProps): React.ReactNode {
  const [showPreview, setShowPreview] = useState(false)
  const [activeFormats] = useState<Set<FormatAction>>(() => new Set())
  const inputRef = useRef<TextInput>(null)

  const handleToggleFormat = useCallback(
    (action: FormatAction) => {
      const wrapper = FORMAT_WRAPPERS[action]
      const newText = value + wrapper.prefix + wrapper.suffix
      onChangeText(newText)

      // Re-focus the input after inserting
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    },
    [value, onChangeText]
  )

  const handleBlur = useCallback(() => {
    if (onMarkupChange != null && value.trim().length > 0) {
      const tree = textToMarkup(value)
      onMarkupChange(JSON.stringify(tree))
    }
  }, [value, onMarkupChange])

  const handleTogglePreview = useCallback(() => {
    setShowPreview((prev) => !prev)
  }, [])

  const previewTree = showPreview ? textToMarkup(value) : null

  return (
    <View className="border border-border-primary rounded-md overflow-hidden" testID={testID}>
      {/* Preview toggle */}
      <View className="flex-row items-center justify-between px-3 py-1.5 bg-surface-secondary border-b border-border-primary">
        <Text className="font-sans-medium text-xs text-content-secondary">
          {showPreview ? 'Preview' : 'Edit'}
        </Text>
        <Pressable
          className="min-h-[36px] min-w-[44px] items-center justify-center"
          onPress={handleTogglePreview}
          accessibilityRole="button"
          accessibilityLabel={showPreview ? 'Switch to edit mode' : 'Switch to preview mode'}
        >
          <Text className="font-sans-medium text-xs text-accent-primary">
            {showPreview ? 'Edit' : 'Preview'}
          </Text>
        </Pressable>
      </View>

      {/* Content area */}
      {showPreview ? (
        <View className="min-h-[100px] p-3">
          {previewTree != null ? (
            <MarkupRenderer
              content={previewTree}
              accessibilityLabel="Description preview"
            />
          ) : (
            <Text className="font-sans text-sm text-content-tertiary">
              Nothing to preview
            </Text>
          )}
        </View>
      ) : (
        <TextInput
          ref={inputRef}
          className="bg-surface-primary text-content-primary font-sans text-sm px-3 py-2.5 min-h-[100px]"
          placeholder={placeholder}
          placeholderTextColor="#77818B"
          value={value}
          onChangeText={onChangeText}
          onBlur={handleBlur}
          multiline
          textAlignVertical="top"
          editable={editable}
          accessibilityLabel={accessibilityLabel}
        />
      )}

      {/* Toolbar */}
      {!showPreview && editable && (
        <EditorToolbar
          activeFormats={activeFormats}
          onToggleFormat={handleToggleFormat}
        />
      )}
    </View>
  )
}

export { RichTextEditor, textToMarkup }
export type { RichTextEditorProps }
