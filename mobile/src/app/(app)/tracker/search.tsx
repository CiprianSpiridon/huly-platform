import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { useSearchIssues } from '@/hooks/useIssues'
import { SearchResults } from '@/components/features/SearchResults'

const RECENT_SEARCHES_KEY = 'tracker_recent_searches'
const MAX_RECENT = 10
const DEBOUNCE_MS = 300

/**
 * Issue search screen.
 *
 * Debounced search input (300ms). Shows recent searches from AsyncStorage
 * when input is empty. Navigates to issue detail on tap.
 */
export default function SearchScreen(): React.ReactNode {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: results, isLoading } = useSearchIssues(debouncedQuery)

  // Load recent searches on mount
  useEffect(() => {
    void loadRecentSearches()
  }, [])

  // Debounce query
  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [query])

  const loadRecentSearches = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored !== null) {
        setRecentSearches(JSON.parse(stored) as string[])
      }
    } catch {
      // Ignore parse errors
    }
  }

  const saveRecentSearch = useCallback(async (search: string) => {
    if (search.trim().length < 2) return
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      const existing: string[] = stored !== null ? (JSON.parse(stored) as string[]) : []
      const updated = [search, ...existing.filter((s) => s !== search)].slice(0, MAX_RECENT)
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      setRecentSearches(updated)
    } catch {
      // Ignore storage errors
    }
  }, [])

  const clearRecentSearches = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch { /* ignore */ }
    setRecentSearches([])
  }, [])

  const handleResultPress = useCallback(
    (id: string) => {
      void saveRecentSearch(query)
      router.push(`/(app)/tracker/issue/${id}` as Href)
    },
    [query, saveRecentSearch]
  )

  const handleRecentPress = useCallback((search: string) => {
    setQuery(search)
    setDebouncedQuery(search)
  }, [])

  const showHint = debouncedQuery.length < 2 && query.length < 2

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Stack.Screen options={{ title: 'Search Issues' }} />

      {/* Search input */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-surface-tertiary rounded-md px-3 border border-border-primary">
          <Ionicons name="search" size={18} color="#77818B" />
          <TextInput
            className="flex-1 font-sans text-base text-caption py-2.5 ml-2"
            placeholder="Search issues..."
            placeholderTextColor="#77818B"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="Search issues"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              className="p-1 min-h-[44px] min-w-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color="#77818B" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Content */}
      {showHint ? (
        <View className="flex-1 px-4">
          {/* Hint text */}
          {query.length > 0 && query.length < 2 ? (
            <Text className="font-sans text-sm text-dark text-center py-4">
              Type at least 2 characters to search
            </Text>
          ) : null}

          {/* Recent searches */}
          {recentSearches.length > 0 ? (
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-sans-semibold text-sm text-content-secondary">
                  Recent searches
                </Text>
                <Pressable
                  onPress={() => void clearRecentSearches()}
                  className="p-1"
                  accessibilityRole="button"
                  accessibilityLabel="Clear recent searches"
                >
                  <Text className="font-sans text-xs text-negative">Clear</Text>
                </Pressable>
              </View>
              {recentSearches.map((search) => (
                <Pressable
                  key={search}
                  className="flex-row items-center gap-2 py-3 border-b border-divider"
                  onPress={() => handleRecentPress(search)}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${search}`}
                >
                  <Ionicons name="time-outline" size={16} color="#77818B" />
                  <Text className="font-sans text-sm text-caption">{search}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
        </View>
      ) : results && results.length > 0 ? (
        <SearchResults results={results} onResultPress={handleResultPress} />
      ) : (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="search-outline" size={48} color="#77818B" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            No results
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            No issues found for &quot;{debouncedQuery}&quot;
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}
