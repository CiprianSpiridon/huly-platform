/**
 * Search results component.
 *
 * Displays a list of search result items using FlashList.
 * Each result shows a title and optional identifier.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import { FlashList } from '@shopify/flash-list'

import type { IssueSearchResult } from '@/repositories/tracker'

interface SearchResultsProps {
  results: IssueSearchResult[]
  onResultPress: (id: string) => void
  testID?: string
}

function SearchResults({ results, onResultPress, testID }: SearchResultsProps): React.ReactNode {
  return (
    <FlashList
      data={results}
      renderItem={({ item }) => (
        <SearchResultRow item={item} onPress={onResultPress} />
      )}
      keyExtractor={(item) => item.id}

      contentContainerStyle={{ paddingHorizontal: 16 }}
      testID={testID}
    />
  )
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

interface SearchResultRowProps {
  item: IssueSearchResult
  onPress: (id: string) => void
}

function SearchResultRowInner({ item, onPress }: SearchResultRowProps): React.ReactNode {
  const handlePress = useCallback(() => {
    onPress(item.id)
  }, [item.id, onPress])

  return (
    <Pressable
      className="bg-surface-secondary rounded-lg p-3 mb-2 active:opacity-80"
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${item.shortTitle ?? 'Issue'}: ${item.title ?? 'Untitled'}`}
    >
      <View className="flex-row items-center gap-2 mb-1">
        {item.shortTitle ? (
          <Text className="font-sans-medium text-xs text-content-secondary">
            {item.shortTitle}
          </Text>
        ) : null}
      </View>
      <Text className="font-sans-medium text-sm text-caption" numberOfLines={2}>
        {item.title ?? 'Untitled'}
      </Text>
      {item.description ? (
        <Text className="font-sans text-xs text-content mt-1" numberOfLines={1}>
          {item.description}
        </Text>
      ) : null}
    </Pressable>
  )
}

const SearchResultRow = memo(SearchResultRowInner)

export { SearchResults }
export type { SearchResultsProps }
