/**
 * Global search results component.
 *
 * Displays results grouped by category (issues, channels, messages, contacts).
 * Each section has a header and navigable rows.
 */

import { memo, useCallback, useMemo } from 'react'
import { View, Text, Pressable, SectionList } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { GlobalSearchItem, GlobalSearchCategory, GlobalSearchResults as Results } from '@/hooks/useGlobalSearch'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GlobalSearchResultsProps {
  results: Results
  onResultPress: (item: GlobalSearchItem) => void
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const CATEGORY_META: Record<GlobalSearchCategory, { label: string; icon: IoniconsName }> = {
  issues: { label: 'Issues', icon: 'checkmark-circle-outline' },
  channels: { label: 'Channels', icon: 'chatbubbles-outline' },
  messages: { label: 'Messages', icon: 'chatbubble-outline' },
  contacts: { label: 'Contacts', icon: 'people-outline' },
}

// ---------------------------------------------------------------------------
// Section type
// ---------------------------------------------------------------------------

interface SearchSection {
  title: string
  icon: IoniconsName
  data: GlobalSearchItem[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function GlobalSearchResultsView({ results, onResultPress }: GlobalSearchResultsProps): React.ReactNode {
  const sections: SearchSection[] = useMemo(() => {
    const s: SearchSection[] = []
    const categories: GlobalSearchCategory[] = ['issues', 'channels', 'messages', 'contacts']
    for (const cat of categories) {
      const items = results[cat]
      if (items.length > 0) {
        const meta = CATEGORY_META[cat]
        s.push({ title: meta.label, icon: meta.icon, data: items })
      }
    }
    return s
  }, [results])

  const renderItem = useCallback(
    ({ item }: { item: GlobalSearchItem }) => (
      <SearchResultRow item={item} onPress={onResultPress} />
    ),
    [onResultPress]
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: SearchSection }) => (
      <View className="flex-row items-center gap-2 bg-surface px-4 py-2">
        <Ionicons name={section.icon} size={16} color="#77818B" />
        <Text
          className="font-sans-semibold text-xs text-content-secondary uppercase tracking-wide"
          accessibilityRole="header"
        >
          {section.title}
        </Text>
      </View>
    ),
    []
  )

  if (sections.length === 0) {
    return null
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => `${item.category}-${item.id}`}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  )
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

interface SearchResultRowProps {
  item: GlobalSearchItem
  onPress: (item: GlobalSearchItem) => void
}

function SearchResultRowInner({ item, onPress }: SearchResultRowProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onPress(item)
  }, [item, onPress])

  return (
    <Pressable
      className="px-4 py-3 min-h-[44px] active:bg-surface-tertiary"
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.subtitle != null ? `, ${item.subtitle}` : ''}`}
    >
      <Text className="font-sans-medium text-sm text-content-primary" numberOfLines={1}>
        {item.title}
      </Text>
      {item.subtitle != null && item.subtitle.length > 0 ? (
        <Text className="font-sans text-xs text-content-secondary mt-0.5" numberOfLines={1}>
          {item.subtitle}
        </Text>
      ) : null}
    </Pressable>
  )
}

const SearchResultRow = memo(SearchResultRowInner)

export { GlobalSearchResultsView }
export type { GlobalSearchResultsProps }
