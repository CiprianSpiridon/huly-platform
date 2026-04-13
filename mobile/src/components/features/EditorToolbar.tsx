/**
 * Rich text editor toolbar.
 *
 * Provides toggle buttons for bold, italic, heading, bullet list,
 * ordered list, code, and strikethrough formatting.
 * All buttons meet 44pt minimum touch target.
 */

import { memo } from 'react'
import { View, Pressable, Text, ScrollView } from 'react-native'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'code'
  | 'strike'

interface ToolbarButton {
  action: FormatAction
  label: string
  icon: string
}

interface EditorToolbarProps {
  activeFormats: Set<FormatAction>
  onToggleFormat: (action: FormatAction) => void
}

// ---------------------------------------------------------------------------
// Button definitions
// ---------------------------------------------------------------------------

const TOOLBAR_BUTTONS: readonly ToolbarButton[] = [
  { action: 'bold', label: 'Bold', icon: 'B' },
  { action: 'italic', label: 'Italic', icon: 'I' },
  { action: 'heading', label: 'Heading', icon: 'H' },
  { action: 'bulletList', label: 'Bullet list', icon: '\u2022' },
  { action: 'orderedList', label: 'Numbered list', icon: '1.' },
  { action: 'code', label: 'Code', icon: '</>' },
  { action: 'strike', label: 'Strikethrough', icon: 'S' },
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EditorToolbarInner({
  activeFormats,
  onToggleFormat,
}: EditorToolbarProps): React.ReactNode {
  return (
    <View className="border-t border-border-primary bg-surface-secondary">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row items-center px-2 py-1 gap-1"
      >
        {TOOLBAR_BUTTONS.map((btn) => {
          const isActive = activeFormats.has(btn.action)
          return (
            <Pressable
              key={btn.action}
              className={`min-w-[44px] min-h-[44px] items-center justify-center rounded-md px-2 ${
                isActive ? 'bg-accent-subtle' : 'active:bg-surface-tertiary'
              }`}
              onPress={() => onToggleFormat(btn.action)}
              accessibilityRole="button"
              accessibilityLabel={btn.label}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                className={`text-sm ${
                  btn.action === 'bold' ? 'font-sans-bold' : ''
                }${btn.action === 'italic' ? ' italic' : ''
                }${btn.action === 'strike' ? ' line-through' : ''
                } ${isActive ? 'text-accent-primary' : 'text-content-secondary'}`}
              >
                {btn.icon}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const EditorToolbar = memo(EditorToolbarInner)

export { EditorToolbar }
export type { EditorToolbarProps }
