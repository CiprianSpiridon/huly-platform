/**
 * New DM / group DM screen.
 *
 * Shows a member picker with search. Single selection creates a 1:1 DM,
 * multi-selection creates a group DM. Navigate to the new conversation
 * on success.
 */

import { useCallback, useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useCreateDM } from '@/hooks/useChannels'
import { useMembers, useSearchMembers } from '@/hooks/useMembers'
import { AvatarCircle } from '@/components/ui/AvatarCircle'
import type { MemberItem } from '@/repositories/members'

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function NewDMScreen(): React.ReactNode {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<MemberItem[]>([])

  const createDM = useCreateDM()
  const { data: allMembers, isLoading } = useMembers()
  const filteredMembers = useSearchMembers(allMembers, searchQuery)

  const selectedIds = useMemo(() => new Set(selectedMembers.map((m) => m._id)), [selectedMembers])

  const canSubmit = selectedMembers.length > 0 && !createDM.isPending

  const handleToggleMember = useCallback((member: MemberItem) => {
    setSelectedMembers((prev) => {
      const exists = prev.some((m) => m._id === member._id)
      if (exists) {
        return prev.filter((m) => m._id !== member._id)
      }
      return [...prev, member]
    })
  }, [])

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return

    createDM.mutate(
      { memberIds: selectedMembers.map((m) => m._id) },
      {
        onSuccess: (channel) => {
          router.replace(`/(app)/chat/channel/${channel._id}` as Href)
        },
        onError: (error) => {
          Alert.alert('Failed to create conversation', error.message)
        },
      }
    )
  }, [canSubmit, createDM, selectedMembers])

  const handleCancel = useCallback(() => {
    router.back()
  }, [])

  const renderMemberItem = useCallback(
    ({ item }: { item: MemberItem }) => {
      const isSelected = selectedIds.has(item._id)
      return (
        <Pressable
          className={`flex-row items-center gap-3 px-4 py-3 min-h-[44px] ${isSelected ? 'bg-accent-subtle' : 'active:bg-surface-tertiary'}`}
          onPress={() => handleToggleMember(item)}
          accessibilityRole="button"
          accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${item.name}`}
          accessibilityState={{ selected: isSelected }}
        >
          <AvatarCircle name={item.name} imageUrl={item.avatarUrl} size={40} />
          <View className="flex-1">
            <Text className="font-sans-medium text-sm text-content-primary">{item.name}</Text>
            {item.email.length > 0 && (
              <Text className="font-sans text-xs text-content-secondary" numberOfLines={1}>
                {item.email}
              </Text>
            )}
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={22} color="#205DC2" />
          )}
        </Pressable>
      )
    },
    [selectedIds, handleToggleMember]
  )

  const keyExtractor = useCallback((item: MemberItem) => item._id, [])

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'New Message',
          headerLeft: () => (
            <Pressable
              onPress={handleCancel}
              className="p-2 min-w-[44px] min-h-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="font-sans-medium text-base text-content-secondary">Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              className={`p-2 min-w-[44px] min-h-[44px] items-center justify-center ${!canSubmit ? 'opacity-40' : ''}`}
              accessibilityRole="button"
              accessibilityLabel={selectedMembers.length > 1 ? 'Create group message' : 'Create direct message'}
              accessibilityState={{ disabled: !canSubmit }}
            >
              {createDM.isPending ? (
                <ActivityIndicator size="small" color="#205DC2" />
              ) : (
                <Text className="font-sans-semibold text-base text-accent-primary">
                  {selectedMembers.length > 1 ? 'Create' : 'Start'}
                </Text>
              )}
            </Pressable>
          ),
        }}
      />

      {/* Search bar */}
      <View className="px-4 py-3 border-b border-border-primary">
        <TextInput
          className="bg-surface-tertiary text-content-primary font-sans text-sm rounded-md px-3 py-2.5 border border-border-primary"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search people..."
          placeholderTextColor="#77818B"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          accessibilityLabel="Search people"
        />
      </View>

      {/* Selected members chips */}
      {selectedMembers.length > 0 && (
        <View className="px-4 py-2 border-b border-border-primary">
          <View className="flex-row flex-wrap gap-2">
            {selectedMembers.map((member) => (
              <Pressable
                key={member._id}
                className="flex-row items-center gap-1.5 bg-accent-subtle rounded-full px-3 py-1.5"
                onPress={() => handleToggleMember(member)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${member.name}`}
              >
                <AvatarCircle name={member.name} size={20} />
                <Text className="font-sans-medium text-xs text-accent-primary">
                  {member.name}
                </Text>
                <Ionicons name="close" size={14} color="#205DC2" />
              </Pressable>
            ))}
          </View>
          <Text className="font-sans text-xs text-content-tertiary mt-1">
            {selectedMembers.length === 1 ? 'Direct message' : `Group message (${selectedMembers.length} people)`}
          </Text>
        </View>
      )}

      {/* Member list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#205DC2" />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center py-8 px-4">
              <Text className="font-sans text-sm text-content-tertiary text-center">
                {searchQuery.length > 0 ? 'No people found' : 'No workspace members available'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
