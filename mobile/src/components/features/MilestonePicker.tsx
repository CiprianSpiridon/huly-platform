/**
 * Milestone picker bottom sheet.
 *
 * Fetches available milestones for a project and lets the user pick one.
 * Uses @gorhom/bottom-sheet BottomSheetModal.
 */

import { forwardRef, useCallback, useMemo } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import type { Ref, Doc } from '@hcengineering/core'

import { useMilestones } from '@/hooks/useProjects'
import type { MilestoneItem } from '@/repositories/tracker'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MilestonePickerProps {
  projectId: string
  currentMilestoneId?: string | null
  onSelect: (milestoneId: Ref<Doc> | null) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MilestonePicker = forwardRef<BottomSheetModal, MilestonePickerProps>(
  function MilestonePicker({ projectId, currentMilestoneId, onSelect }, ref) {
    const snapPoints = useMemo(() => ['40%', '60%'], [])
    const { data: milestones, isLoading } = useMilestones(projectId)

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    )

    const handleSelect = useCallback(
      (milestoneId: Ref<Doc> | null) => {
        onSelect(milestoneId)
        if (ref && 'current' in ref && ref.current) {
          ref.current.dismiss()
        }
      },
      [onSelect, ref]
    )

    const renderItem = useCallback(
      ({ item }: { item: MilestoneItem }) => {
        const isSelected = item._id === currentMilestoneId
        return (
          <Pressable
            className={`flex-row items-center gap-3 px-4 py-3 min-h-[44px] ${isSelected ? 'bg-accent-subtle' : ''}`}
            onPress={() => handleSelect(item._id as Ref<Doc>)}
            accessibilityRole="button"
            accessibilityLabel={`Select milestone: ${item.name}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
            <View className="flex-1">
              <Text className="font-sans-medium text-sm text-content-primary">
                {item.name}
              </Text>
              {item.targetDate != null ? (
                <Text className="font-sans text-xs text-content-secondary">
                  Target: {new Date(item.targetDate).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
            {isSelected ? (
              <Text className="font-sans-medium text-sm text-accent-primary">Selected</Text>
            ) : null}
          </Pressable>
        )
      },
      [currentMilestoneId, handleSelect]
    )

    const keyExtractor = useCallback(
      (item: MilestoneItem) => item._id,
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
            Select Milestone
          </Text>
        </View>

        {/* None option */}
        <Pressable
          className={`flex-row items-center gap-3 px-4 py-3 min-h-[44px] border-b border-border-primary ${
            currentMilestoneId == null ? 'bg-accent-subtle' : ''
          }`}
          onPress={() => handleSelect(null)}
          accessibilityRole="button"
          accessibilityLabel="No milestone"
          accessibilityState={{ selected: currentMilestoneId == null }}
        >
          <Ionicons name="remove-circle-outline" size={20} color="#77818B" />
          <Text className="font-sans-medium text-sm text-content-primary flex-1">
            None
          </Text>
          {currentMilestoneId == null ? (
            <Text className="font-sans-medium text-sm text-accent-primary">Selected</Text>
          ) : null}
        </Pressable>

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-8">
            <ActivityIndicator size="small" color="#205DC2" />
          </View>
        ) : (
          <BottomSheetFlatList
            data={milestones ?? []}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View className="items-center py-8">
                <Text className="font-sans text-sm text-content-tertiary">
                  No milestones in this project
                </Text>
              </View>
            }
          />
        )}
      </BottomSheetModal>
    )
  }
)

export { MilestonePicker }
export type { MilestonePickerProps }
