/**
 * Notification filter chips for the inbox screen.
 *
 * Renders two filter rows:
 *   1. A horizontal row of mutually exclusive type chips
 *      (All, Mentions, Reactions, Updates).
 *   2. A compact read/unread/all segmented control that composes with the
 *      type chips to produce e.g. "unread mentions".
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'

import type { InboxFilter, InboxReadStatusFilter } from '@/store/inbox'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationFiltersProps {
  activeFilter: InboxFilter
  onFilterChange: (filter: InboxFilter) => void
  readStatusFilter: InboxReadStatusFilter
  onReadStatusChange: (status: InboxReadStatusFilter) => void
}

interface FilterChipProps {
  label: string
  value: InboxFilter
  isActive: boolean
  onPress: (value: InboxFilter) => void
}

interface ReadStatusChipProps {
  label: string
  value: InboxReadStatusFilter
  isActive: boolean
  onPress: (value: InboxReadStatusFilter) => void
}

// ---------------------------------------------------------------------------
// Filter chip
// ---------------------------------------------------------------------------

const FILTERS: Array<{ label: string; value: InboxFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Mentions', value: 'mentions' },
  { label: 'Reactions', value: 'reactions' },
  { label: 'Updates', value: 'updates' },
]

const READ_STATUS_FILTERS: Array<{ label: string; value: InboxReadStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
]

function FilterChipInner({ label, value, isActive, onPress }: FilterChipProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onPress(value)
  }, [value, onPress])

  return (
    <Pressable
      className={`rounded-md px-3 py-1.5 mr-2 ${
        isActive
          ? 'bg-accent-primary'
          : 'bg-surface-accent'
      } active:opacity-80`}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected: isActive }}
    >
      <Text
        className={`font-sans-medium text-sm ${
          isActive ? 'text-on-accent' : 'text-caption'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const FilterChip = memo(FilterChipInner)

function ReadStatusChipInner({
  label,
  value,
  isActive,
  onPress,
}: ReadStatusChipProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onPress(value)
  }, [value, onPress])

  return (
    <Pressable
      className={`flex-1 items-center justify-center py-1.5 ${
        isActive ? 'bg-surface' : 'bg-transparent'
      } rounded-sm active:opacity-80`}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Show ${label} notifications`}
      accessibilityState={{ selected: isActive }}
    >
      <Text
        className={`font-sans-medium text-xs ${
          isActive ? 'text-caption' : 'text-dark'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const ReadStatusChip = memo(ReadStatusChipInner)

// ---------------------------------------------------------------------------
// Filters row
// ---------------------------------------------------------------------------

function NotificationFiltersInner({
  activeFilter,
  onFilterChange,
  readStatusFilter,
  onReadStatusChange,
}: NotificationFiltersProps): React.ReactNode {
  return (
    <View className="py-2 px-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.value}
            label={filter.label}
            value={filter.value}
            isActive={activeFilter === filter.value}
            onPress={onFilterChange}
          />
        ))}
      </ScrollView>

      {/* Read/unread/all segmented control */}
      <View
        className="flex-row mt-2 p-1 bg-surface-accent rounded-md"
        accessibilityRole="radiogroup"
        accessibilityLabel="Filter by read status"
      >
        {READ_STATUS_FILTERS.map((filter) => (
          <ReadStatusChip
            key={filter.value}
            label={filter.label}
            value={filter.value}
            isActive={readStatusFilter === filter.value}
            onPress={onReadStatusChange}
          />
        ))}
      </View>
    </View>
  )
}

const NotificationFilters = memo(NotificationFiltersInner)

export { NotificationFilters }
export type { NotificationFiltersProps }
