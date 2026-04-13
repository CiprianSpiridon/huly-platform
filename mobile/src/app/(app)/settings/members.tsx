/**
 * Member list / contacts directory screen.
 *
 * Displays all workspace members with search and alphabetical sections.
 * Accessible from the Settings tab.
 */

import { useCallback, useMemo, useState } from 'react'
import { View, Text, TextInput, ActivityIndicator, SectionList, RefreshControl, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useMembers, useSearchMembers } from '@/hooks/useMembers'
import { MemberRow } from '@/components/features/MemberRow'
import type { MemberItem } from '@/repositories/members'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MemberSection {
  title: string
  data: MemberItem[]
}

function groupByAlpha(members: MemberItem[]): MemberSection[] {
  const grouped = new Map<string, MemberItem[]>()
  for (const member of members) {
    const letter = (member.name[0] ?? '#').toUpperCase()
    const key = /[A-Z]/.test(letter) ? letter : '#'
    const existing = grouped.get(key)
    if (existing != null) {
      existing.push(member)
    } else {
      grouped.set(key, [member])
    }
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }))
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MembersScreen(): React.ReactNode {
  const { data: members, isLoading, error, refetch } = useMembers()
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const filteredMembers = useSearchMembers(members, searchQuery)

  const sections = useMemo(
    () => groupByAlpha(filteredMembers),
    [filteredMembers]
  )

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Members' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Members' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            Failed to load members
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            {error.message}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Members' }} />

      {/* Search bar */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-surface-tertiary rounded-md px-3 border border-border-primary">
          <Ionicons name="search" size={18} color="#77818B" />
          <TextInput
            className="flex-1 font-sans text-base text-caption py-2.5 ml-2"
            placeholder="Search members..."
            placeholderTextColor="#77818B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search members"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <View className="min-h-[44px] min-w-[44px] items-center justify-center">
              <Pressable
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color="#77818B" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* Member count */}
      <View className="px-4 pb-2">
        <Text className="font-sans text-xs text-content-secondary">
          {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Member list */}
      {sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="people-outline" size={48} color="#77818B" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            {searchQuery.length > 0 ? 'No members found' : 'No members yet'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <MemberRow member={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <View className="bg-surface px-4 py-1">
              <Text
                className="font-sans-semibold text-xs text-content-secondary uppercase"
                accessibilityRole="header"
              >
                {title}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#205DC2"
              progressBackgroundColor="#1E1F23"
            />
          }
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  )
}
