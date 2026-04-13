/**
 * Assignee picker bottom sheet.
 *
 * Fetches workspace members, provides real-time search filtering,
 * and lets the user pick an assignee or unassign. On selection, fires
 * the provided onSelect callback.
 *
 * Uses @gorhom/bottom-sheet BottomSheetModal so it integrates with the
 * BottomSheetModalProvider in the root layout.
 */

import { forwardRef, useCallback, useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import type { Ref, Doc } from '@hcengineering/core'

import { useMembers, useSearchMembers } from '@/hooks/useMembers'
import { AvatarCircle } from '@/components/ui/AvatarCircle'
import type { MemberItem } from '@/repositories/members'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssigneePickerProps {
  currentAssigneeId?: string | null
  onSelect: (memberId: Ref<Doc> | null) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AssigneePicker = forwardRef<BottomSheetModal, AssigneePickerProps>(
  function AssigneePicker({ currentAssigneeId, onSelect }, ref) {
    const snapPoints = useMemo(() => ['50%', '75%'], [])
    const [searchQuery, setSearchQuery] = useState('')

    const { data: members, isLoading } = useMembers()
    const filteredMembers = useSearchMembers(members, searchQuery)

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    )

    const handleSelect = useCallback(
      (memberId: Ref<Doc> | null) => {
        onSelect(memberId)
        setSearchQuery('')
        if (ref && 'current' in ref && ref.current) {
          ref.current.dismiss()
        }
      },
      [onSelect, ref]
    )

    const renderItem = useCallback(
      ({ item }: { item: MemberItem }) => {
        const isSelected = item._id === currentAssigneeId
        return (
          <Pressable
            className={`flex-row items-center gap-3 px-4 py-3 min-h-[44px] ${isSelected ? 'bg-accent-subtle' : ''}`}
            onPress={() => handleSelect(item._id as Ref<Doc>)}
            accessibilityRole="button"
            accessibilityLabel={`Assign to ${item.name}`}
            accessibilityState={{ selected: isSelected }}
          >
            <AvatarCircle name={item.name} imageUrl={item.avatarUrl} size={32} />
            <View className="flex-1">
              <Text className="font-sans-medium text-sm text-content-primary">
                {item.name}
              </Text>
              {item.email.length > 0 ? (
                <Text className="font-sans text-xs text-content-secondary" numberOfLines={1}>
                  {item.email}
                </Text>
              ) : null}
            </View>
            {isSelected ? (
              <Text className="font-sans-medium text-sm text-accent-primary">Selected</Text>
            ) : null}
          </Pressable>
        )
      },
      [currentAssigneeId, handleSelect]
    )

    const keyExtractor = useCallback(
      (item: MemberItem) => item._id,
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
            className="font-sans-semibold text-base text-content-primary mb-3"
            accessibilityRole="header"
          >
            Select Assignee
          </Text>

          {/* Search input */}
          <TextInput
            className="bg-surface-tertiary text-content-primary font-sans text-sm rounded-md px-3 py-2 border border-border-primary"
            placeholder="Search members..."
            placeholderTextColor="#77818B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search members"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Unassign option */}
        <Pressable
          className={`flex-row items-center gap-3 px-4 py-3 min-h-[44px] border-b border-border-primary ${
            currentAssigneeId == null ? 'bg-accent-subtle' : ''
          }`}
          onPress={() => handleSelect(null)}
          accessibilityRole="button"
          accessibilityLabel="Unassign"
          accessibilityState={{ selected: currentAssigneeId == null }}
        >
          <View
            className="items-center justify-center bg-surface-tertiary"
            style={{ width: 32, height: 32, borderRadius: 16 }}
          >
            <Text className="font-sans text-xs text-content-tertiary">--</Text>
          </View>
          <Text className="font-sans-medium text-sm text-content-primary flex-1">
            Unassigned
          </Text>
          {currentAssigneeId == null ? (
            <Text className="font-sans-medium text-sm text-accent-primary">Selected</Text>
          ) : null}
        </Pressable>

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-8">
            <ActivityIndicator size="small" color="#205DC2" />
          </View>
        ) : (
          <BottomSheetFlatList
            data={filteredMembers}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View className="items-center py-8">
                <Text className="font-sans text-sm text-content-tertiary">
                  {searchQuery.length > 0 ? 'No members found' : 'No workspace members'}
                </Text>
              </View>
            }
          />
        )}
      </BottomSheetModal>
    )
  }
)

export { AssigneePicker }
export type { AssigneePickerProps }
