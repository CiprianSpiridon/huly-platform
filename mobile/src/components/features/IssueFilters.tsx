/**
 * Issue filter controls component.
 *
 * Renders filter and sort controls in a horizontal row.
 * Reads and writes to the tracker Zustand store.
 */

import { useCallback } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useTrackerStore } from '@/store/tracker'
import type { ViewMode } from '@/store/tracker'
import { ISSUE_PRIORITY } from '@/components/ui/PriorityIcon'

const PRIORITY_OPTIONS = [
  { value: ISSUE_PRIORITY.Urgent, label: 'Urgent' },
  { value: ISSUE_PRIORITY.High, label: 'High' },
  { value: ISSUE_PRIORITY.Medium, label: 'Medium' },
  { value: ISSUE_PRIORITY.Low, label: 'Low' },
] as const

const SORT_OPTIONS = [
  { key: 'modifiedOn' as const, label: 'Updated' },
  { key: 'priority' as const, label: 'Priority' },
  { key: 'status' as const, label: 'Status' },
  { key: 'dueDate' as const, label: 'Due date' },
] as const

function IssueFilterControls(): React.ReactNode {
  const filters = useTrackerStore((s) => s.issueFilters)
  const sort = useTrackerStore((s) => s.issueSort)
  const viewMode = useTrackerStore((s) => s.viewMode)
  const setFilter = useTrackerStore((s) => s.setFilter)
  const setSort = useTrackerStore((s) => s.setSort)
  const setViewMode = useTrackerStore((s) => s.setViewMode)
  const clearFilters = useTrackerStore((s) => s.clearFilters)

  const togglePriority = useCallback(
    (value: number) => {
      const current = filters.priority
      const next = current.includes(value)
        ? current.filter((p) => p !== value)
        : [...current, value]
      setFilter('priority', next)
    },
    [filters.priority, setFilter]
  )

  const cycleSortKey = useCallback(() => {
    const currentIndex = SORT_OPTIONS.findIndex((o) => o.key === sort.key)
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length
    const nextOption = SORT_OPTIONS[nextIndex]
    if (nextOption !== undefined) {
      setSort({ key: nextOption.key, order: sort.order })
    }
  }, [sort, setSort])

  const toggleSortOrder = useCallback(() => {
    setSort({
      key: sort.key,
      order: sort.order === 'ascending' ? 'descending' : 'ascending',
    })
  }, [sort, setSort])

  const toggleViewMode = useCallback(() => {
    const next: ViewMode = viewMode === 'list' ? 'kanban' : 'list'
    setViewMode(next)
  }, [viewMode, setViewMode])

  const hasActiveFilters = filters.priority.length > 0 || filters.status.length > 0

  return (
    <View className="px-4 pb-2">
      {/* Sort + view controls */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Pressable
            className="flex-row items-center gap-1 bg-surface-accent rounded-sm px-2 py-1 min-h-[32px]"
            onPress={cycleSortKey}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${SORT_OPTIONS.find((o) => o.key === sort.key)?.label ?? sort.key}`}
          >
            <Ionicons name="swap-vertical" size={14} color="#FFFFFF" />
            <Text className="font-sans-medium text-xs text-caption">
              {SORT_OPTIONS.find((o) => o.key === sort.key)?.label ?? 'Sort'}
            </Text>
          </Pressable>
          <Pressable
            className="bg-surface-accent rounded-sm px-2 py-1 min-h-[32px] items-center justify-center"
            onPress={toggleSortOrder}
            accessibilityRole="button"
            accessibilityLabel={`Sort ${sort.order}`}
          >
            <Ionicons
              name={sort.order === 'ascending' ? 'arrow-up' : 'arrow-down'}
              size={14}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
        <Pressable
          className="bg-surface-accent rounded-sm px-2 py-1 min-h-[32px] items-center justify-center"
          onPress={toggleViewMode}
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'list' ? 'Switch to kanban view' : 'Switch to list view'}
        >
          <Ionicons
            name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
            size={16}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {/* Priority filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-center gap-2">
          {PRIORITY_OPTIONS.map((option) => {
            const isActive = filters.priority.includes(option.value)
            return (
              <Pressable
                key={option.value}
                className={`rounded-sm px-2.5 py-1 min-h-[32px] items-center justify-center ${
                  isActive ? 'bg-accent-subtle border border-accent-primary' : 'bg-surface-accent'
                }`}
                onPress={() => togglePriority(option.value)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${option.label} priority`}
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  className={`font-sans-medium text-xs ${
                    isActive ? 'text-accent-primary' : 'text-caption'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
          {hasActiveFilters ? (
            <Pressable
              className="rounded-sm px-2.5 py-1 min-h-[32px] items-center justify-center"
              onPress={clearFilters}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <Text className="font-sans-medium text-xs text-negative">Clear</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  )
}

export { IssueFilterControls }
