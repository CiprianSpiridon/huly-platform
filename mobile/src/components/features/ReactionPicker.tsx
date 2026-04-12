/**
 * Emoji reaction picker.
 *
 * Renders a bottom sheet with 8 quick-access emoji reactions.
 * Uses @gorhom/bottom-sheet for the modal presentation.
 * Haptic feedback is skipped since expo-haptics is not installed.
 */

import { memo, useCallback, useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import {
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUICK_REACTIONS = [
  { emoji: '\u{1F44D}', label: 'thumbs up' },
  { emoji: '\u{2764}\u{FE0F}', label: 'heart' },
  { emoji: '\u{1F602}', label: 'laughing' },
  { emoji: '\u{1F389}', label: 'party' },
  { emoji: '\u{1F64F}', label: 'pray' },
  { emoji: '\u{1F525}', label: 'fire' },
  { emoji: '\u{1F440}', label: 'eyes' },
  { emoji: '\u{1F680}', label: 'rocket' },
] as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReactionPickerProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>
  onSelectReaction: (emoji: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ReactionPickerInner({
  bottomSheetRef,
  onSelectReaction,
}: ReactionPickerProps): React.ReactNode {
  const snapPoints = useMemo(() => ['25%'], [])

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelectReaction(emoji)
      bottomSheetRef.current?.dismiss()
    },
    [onSelectReaction, bottomSheetRef]
  )

  const handleSheetChanges: BottomSheetModalProps['onChange'] = useCallback(
    (_index: number) => {
      // No-op -- kept for future analytics/tracking
    },
    []
  )

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backgroundStyle={{ backgroundColor: '#1E1F23' }}
      handleIndicatorStyle={{ backgroundColor: '#77818B' }}
      enableDynamicSizing={false}
    >
      <BottomSheetView className="flex-1 px-4 pb-4">
        <Text className="font-sans-medium text-sm text-content-secondary mb-3">
          React
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {QUICK_REACTIONS.map((item) => (
            <Pressable
              key={item.emoji}
              className="w-11 h-11 items-center justify-center rounded-lg active:bg-surface-tertiary"
              onPress={() => handleSelect(item.emoji)}
              accessibilityRole="button"
              accessibilityLabel={`React with ${item.label}`}
            >
              <Text className="text-2xl">{item.emoji}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const ReactionPicker = memo(ReactionPickerInner)

export { ReactionPicker }
export type { ReactionPickerProps }
