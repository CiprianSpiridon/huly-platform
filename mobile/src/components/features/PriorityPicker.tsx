/**
 * Priority picker bottom sheet.
 *
 * Lists the five issue priority levels with icons. On selection, fires
 * the provided onSelect callback and dismisses the sheet.
 *
 * Uses @gorhom/bottom-sheet BottomSheetModal so it integrates with the
 * BottomSheetModalProvider in the root layout.
 */

import { forwardRef, useCallback, useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'

import { PriorityIcon, ISSUE_PRIORITY, type IssuePriorityValue } from '@/components/ui/PriorityIcon'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface PriorityOption {
  value: IssuePriorityValue
  label: string
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: ISSUE_PRIORITY.NoPriority, label: 'No priority' },
  { value: ISSUE_PRIORITY.Urgent, label: 'Urgent' },
  { value: ISSUE_PRIORITY.High, label: 'High' },
  { value: ISSUE_PRIORITY.Medium, label: 'Medium' },
  { value: ISSUE_PRIORITY.Low, label: 'Low' },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PriorityPickerProps {
  currentPriority: number
  onSelect: (priority: IssuePriorityValue) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PriorityPicker = forwardRef<BottomSheetModal, PriorityPickerProps>(
  function PriorityPicker({ currentPriority, onSelect }, ref) {
    const snapPoints = useMemo(() => ['35%'], [])

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    )

    const handleSelect = useCallback(
      (priority: IssuePriorityValue) => {
        onSelect(priority)
        if (ref && 'current' in ref && ref.current) {
          ref.current.dismiss()
        }
      },
      [onSelect, ref]
    )

    const renderItem = useCallback(
      ({ item }: { item: PriorityOption }) => {
        const isSelected = item.value === currentPriority
        return (
          <Pressable
            className={`flex-row items-center gap-3 px-4 py-3 min-h-[44px] ${isSelected ? 'bg-accent-subtle' : ''}`}
            onPress={() => handleSelect(item.value)}
            accessibilityRole="button"
            accessibilityLabel={`Select priority: ${item.label}`}
            accessibilityState={{ selected: isSelected }}
          >
            <PriorityIcon priority={item.value} size={20} />
            <Text className="font-sans-medium text-sm text-content-primary flex-1">
              {item.label}
            </Text>
            {isSelected ? (
              <Text className="font-sans-medium text-sm text-accent-primary">Selected</Text>
            ) : null}
          </Pressable>
        )
      },
      [currentPriority, handleSelect]
    )

    const keyExtractor = useCallback(
      (item: PriorityOption) => String(item.value),
      []
    )

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#1E1F23' }}
        handleIndicatorStyle={{ backgroundColor: '#77818B' }}
        enableDynamicSizing={false}
      >
        <View className="px-4 py-3 border-b border-border-primary">
          <Text
            className="font-sans-semibold text-base text-content-primary"
            accessibilityRole="header"
          >
            Select Priority
          </Text>
        </View>

        <BottomSheetFlatList
          data={PRIORITY_OPTIONS}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </BottomSheetModal>
    )
  }
)

export { PriorityPicker }
export type { PriorityPickerProps }
