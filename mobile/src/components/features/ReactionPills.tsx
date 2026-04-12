/**
 * Reaction pills displayed below a message.
 *
 * Shows emoji + count for each reaction. Tapping a pill toggles the
 * current user's reaction (add or remove). User's own reactions are
 * visually highlighted.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'

import type { ReactionInfo } from '@/repositories/chat'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReactionPillsProps {
  reactions: ReactionInfo[]
  currentUserId: string
  onToggle: (emoji: string, hasReacted: boolean) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ReactionPillsInner({
  reactions,
  currentUserId,
  onToggle,
}: ReactionPillsProps): React.ReactNode {
  if (reactions.length === 0) {
    return null
  }

  return (
    <View className="flex-row flex-wrap gap-1.5 mt-1">
      {reactions.map((reaction) => {
        const hasReacted = reaction.userIds.includes(currentUserId)
        return (
          <ReactionPill
            key={reaction.emoji}
            emoji={reaction.emoji}
            count={reaction.count}
            hasReacted={hasReacted}
            onToggle={onToggle}
          />
        )
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Single pill
// ---------------------------------------------------------------------------

interface ReactionPillProps {
  emoji: string
  count: number
  hasReacted: boolean
  onToggle: (emoji: string, hasReacted: boolean) => void
}

function ReactionPillInner({
  emoji,
  count,
  hasReacted,
  onToggle,
}: ReactionPillProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onToggle(emoji, hasReacted)
  }, [emoji, hasReacted, onToggle])

  return (
    <Pressable
      className={`flex-row items-center rounded-full px-2 py-0.5 min-h-[28px] ${
        hasReacted
          ? 'bg-accent-subtle border border-accent-primary'
          : 'bg-surface-tertiary border border-border-primary'
      } active:opacity-80`}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${emoji} reaction, ${count} ${count === 1 ? 'person' : 'people'}${hasReacted ? ', you reacted' : ''}`}
    >
      <Text className="text-sm mr-1">{emoji}</Text>
      <Text
        className={`font-sans-medium text-xs ${
          hasReacted ? 'text-accent-primary' : 'text-content-secondary'
        }`}
      >
        {count}
      </Text>
    </Pressable>
  )
}

const ReactionPills = memo(ReactionPillsInner)
const ReactionPill = memo(ReactionPillInner)

export { ReactionPills }
export type { ReactionPillsProps }
