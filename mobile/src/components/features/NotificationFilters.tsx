/**
 * Notification filter chips for the inbox screen.
 *
 * Renders a horizontal row of mutually exclusive filter chips:
 * All, Mentions, Reactions, Updates.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'

import type { InboxFilter } from '@/store/inbox'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationFiltersProps {
  activeFilter: InboxFilter
  onFilterChange: (filter: InboxFilter) => void
}

interface FilterChipProps {
  label: string
  value: InboxFilter
  isActive: boolean
  onPress: (value: InboxFilter) => void
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

// ---------------------------------------------------------------------------
// Filters row
// ---------------------------------------------------------------------------

function NotificationFiltersInner({
  activeFilter,
  onFilterChange,
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
    </View>
  )
}

const NotificationFilters = memo(NotificationFiltersInner)

export { NotificationFilters }
export type { NotificationFiltersProps }
