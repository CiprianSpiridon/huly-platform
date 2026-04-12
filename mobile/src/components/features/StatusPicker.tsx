/**
 * Status picker bottom sheet.
 *
 * Fetches available IssueStatus documents for the project and lets the
 * user pick one. On selection, fires the provided onSelect callback.
 *
 * Uses @gorhom/bottom-sheet BottomSheetModal so it integrates with the
 * BottomSheetModalProvider in the root layout.
 */

import { forwardRef, useCallback, useMemo } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import type { Ref, Class, Doc } from '@hcengineering/core'
import type { IssueStatus } from '@hcengineering/tracker'

import { useHulyQuery } from '@/hooks/useHulyQuery'
import { StatusChip, type StatusCategory } from '@/components/ui/StatusChip'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * String ref to tracker:class:IssueStatus -- avoids value import.
 */
const ISSUE_STATUS_CLASS = 'tracker:class:IssueStatus' as Ref<Class<IssueStatus>>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StatusPickerProps {
  projectId: string
  currentStatusId?: string
  onSelect: (statusId: Ref<IssueStatus>) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map Huly status category numbers to StatusChip category names.
 * Huly uses a category field with known numeric values.
 */
function resolveCategory(status: Record<string, unknown>): StatusCategory {
  const cat = status.category as string | undefined
  if (cat === undefined) return 'unstarted'
  const catStr = String(cat)
  if (catStr.includes('Won')) return 'completed'
  if (catStr.includes('Lost') || catStr.includes('Cancelled')) return 'canceled'
  if (catStr.includes('Active') || catStr.includes('InProgress')) return 'started'
  if (catStr.includes('Backlog')) return 'backlog'
  return 'unstarted'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StatusPicker = forwardRef<BottomSheetModal, StatusPickerProps>(
  function StatusPicker({ projectId, currentStatusId, onSelect }, ref) {
    const snapPoints = useMemo(() => ['40%', '60%'], [])

    // Fetch all IssueStatus docs for this project (space = projectId)
    const { data: statuses, isLoading } = useHulyQuery<IssueStatus>(
      ISSUE_STATUS_CLASS,
      { space: projectId } as Record<string, unknown>,
      {
        findOptions: { limit: 100 },
        queryOptions: { staleTime: 5 * 60_000 },
      }
    )

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    )

    const handleSelect = useCallback(
      (statusId: Ref<IssueStatus>) => {
        onSelect(statusId)
        if (ref && 'current' in ref && ref.current) {
          ref.current.dismiss()
        }
      },
      [onSelect, ref]
    )

    const renderItem = useCallback(
      ({ item }: { item: IssueStatus }) => {
        const statusRecord = item as unknown as Record<string, unknown>
        const name = (statusRecord.name as string | undefined) ?? 'Unknown'
        const itemId = (item as unknown as { _id: string })._id
        const isSelected = itemId === currentStatusId
        const category = resolveCategory(statusRecord)

        return (
          <Pressable
            className={`flex-row items-center justify-between px-4 py-3 min-h-[44px] ${isSelected ? 'bg-accent-subtle' : ''}`}
            onPress={() => handleSelect(itemId as Ref<IssueStatus>)}
            accessibilityRole="button"
            accessibilityLabel={`Select status: ${name}`}
            accessibilityState={{ selected: isSelected }}
          >
            <StatusChip name={name} category={category} />
            {isSelected ? (
              <Text className="font-sans-medium text-sm text-accent-primary">Selected</Text>
            ) : null}
          </Pressable>
        )
      },
      [currentStatusId, handleSelect]
    )

    const keyExtractor = useCallback(
      (item: IssueStatus) => (item as unknown as { _id: string })._id,
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
            Select Status
          </Text>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-8">
            <ActivityIndicator size="small" color="#205DC2" />
          </View>
        ) : (
          <BottomSheetFlatList
            data={statuses != null ? [...statuses] : []}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </BottomSheetModal>
    )
  }
)

export { StatusPicker }
export type { StatusPickerProps }
