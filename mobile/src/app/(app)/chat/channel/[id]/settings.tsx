/**
 * Channel settings screen.
 *
 * Shows channel metadata (name, description), member list,
 * mute toggle, pinned messages link, and leave/archive actions.
 * Admins can edit the channel name and description inline.
 */

import { useCallback, useState, useRef, useMemo } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, Alert, ActivityIndicator, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'

import {
  useChannelDetail,
  useChannelMembers,
  useUpdateChannel,
  useLeaveChannel,
  useArchiveChannel,
  useAddChannelMember,
  useRemoveChannelMember,
} from '@/hooks/useChannels'
import { useMembers, useSearchMembers } from '@/hooks/useMembers'
import { useChatStore } from '@/store/chat'
import { useConnectionStore } from '@/store/connection'
import { SettingsRow } from '@/components/features/SettingsRow'
import { MemberRow } from '@/components/features/MemberRow'
import { AvatarCircle } from '@/components/ui/AvatarCircle'
import type { MemberItem } from '@/repositories/members'

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ChannelSettingsScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const currentUserId = useConnectionStore((s) => s.currentSocialId) ?? 'unknown'

  const { data: channel, isLoading: channelLoading } = useChannelDetail(id)
  const { data: channelMembers, isLoading: membersLoading } = useChannelMembers(id)
  const updateChannel = useUpdateChannel()
  const leaveChannelMutation = useLeaveChannel()
  const archiveChannelMutation = useArchiveChannel()
  const addMember = useAddChannelMember()
  const removeMember = useRemoveChannelMember()

  const mutedChannels = useChatStore((s) => s.mutedChannels)
  const isMuted = id ? mutedChannels.has(id) : false
  const muteChannel = useChatStore((s) => s.muteChannel)
  const unmuteChannel = useChatStore((s) => s.unmuteChannel)

  const [editingName, setEditingName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [descriptionValue, setDescriptionValue] = useState('')

  // Member picker bottom sheet
  const memberPickerRef = useRef<BottomSheetModal>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const { data: allMembers, isLoading: allMembersLoading } = useMembers()
  const filteredMembers = useSearchMembers(allMembers, memberSearch)

  // Filter out members already in channel
  const existingMemberIds = useMemo(() => {
    return new Set(channelMembers?.map((m) => m.memberId) ?? [])
  }, [channelMembers])

  const availableMembers = useMemo(() => {
    return filteredMembers.filter((m) => !existingMemberIds.has(m._id))
  }, [filteredMembers, existingMemberIds])

  const snapPoints = useMemo(() => ['50%', '75%'], [])

  // Handlers
  const handleStartEditName = useCallback(() => {
    setNameValue(channel?.name ?? '')
    setEditingName(true)
  }, [channel?.name])

  const handleSaveName = useCallback(() => {
    if (!id) return
    const trimmed = nameValue.trim()
    if (trimmed.length === 0) return
    updateChannel.mutate(
      { channelId: id, updates: { name: trimmed } },
      { onError: () => Alert.alert('Error', 'Failed to update channel') }
    )
    setEditingName(false)
  }, [nameValue, updateChannel, id])

  const handleStartEditDescription = useCallback(() => {
    setDescriptionValue(channel?.description ?? '')
    setEditingDescription(true)
  }, [channel?.description])

  const handleSaveDescription = useCallback(() => {
    if (!id) return
    updateChannel.mutate(
      { channelId: id, updates: { description: descriptionValue.trim() } },
      { onError: () => Alert.alert('Error', 'Failed to update channel') }
    )
    setEditingDescription(false)
  }, [descriptionValue, updateChannel, id])

  const handleToggleMute = useCallback(() => {
    if (!id) return
    if (isMuted) {
      unmuteChannel(id)
    } else {
      muteChannel(id)
    }
  }, [isMuted, muteChannel, unmuteChannel, id])

  const handlePinnedMessages = useCallback(() => {
    // Navigate would go to a pinned messages view; for now show alert
    Alert.alert('Pinned Messages', 'Pinned messages view coming soon.')
  }, [])

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave channel',
      'Are you sure you want to leave this channel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            if (!id) return
            leaveChannelMutation.mutate(id, {
              onSuccess: () => {
                router.replace('/(app)/chat' as Href)
              },
              onError: () => {
                Alert.alert('Error', 'Failed to leave the channel.')
              },
            })
          },
        },
      ]
    )
  }, [leaveChannelMutation, id])

  const handleArchive = useCallback(() => {
    Alert.alert(
      'Archive channel',
      'Are you sure you want to archive this channel? Members will still be able to view messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            if (!id) return
            archiveChannelMutation.mutate(id, {
              onSuccess: () => {
                router.replace('/(app)/chat' as Href)
              },
              onError: () => {
                Alert.alert('Error', 'Failed to archive the channel.')
              },
            })
          },
        },
      ]
    )
  }, [archiveChannelMutation, id])

  const handleAddMember = useCallback(() => {
    setMemberSearch('')
    memberPickerRef.current?.present()
  }, [])

  const handleSelectNewMember = useCallback(
    (member: MemberItem) => {
      if (!id) return
      addMember.mutate(
        { channelId: id, memberId: member._id },
        {
          onSuccess: () => {
            memberPickerRef.current?.dismiss()
          },
          onError: () => {
            Alert.alert('Error', 'Failed to add member.')
          },
        }
      )
    },
    [addMember, id]
  )

  const handleRemoveMember = useCallback(
    (member: MemberItem) => {
      Alert.alert(
        'Remove member',
        `Remove ${member.name} from this channel?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              if (id) removeMember.mutate({ channelId: id, memberId: member._id })
            },
          },
        ]
      )
    },
    [removeMember, id]
  )

  const renderMemberPickerBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  )

  const renderMemberPickerItem = useCallback(
    ({ item }: { item: MemberItem }) => (
      <MemberRow member={item} onPress={handleSelectNewMember} />
    ),
    [handleSelectNewMember]
  )

  // Loading state
  if (channelLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Settings' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#205DC2" />
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (channel == null) {
    return (
      <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Settings' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="font-sans-medium text-base text-content-primary mb-2">
            Channel not found
          </Text>
          <Text
            className="font-sans-medium text-sm text-accent-primary"
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            Go back
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const isDM = channel._class.includes('DirectMessage')

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen options={{ title: isDM ? 'Conversation Settings' : 'Channel Settings' }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Channel name */}
        <View className="px-4 py-4 border-b border-border-primary">
          {editingName ? (
            <View>
              <Text className="font-sans text-xs text-content-tertiary mb-1 uppercase tracking-wide">
                Channel name
              </Text>
              <TextInput
                className="bg-surface-tertiary text-content-primary font-sans text-base rounded-md px-3 py-2 border border-border-primary"
                value={nameValue}
                onChangeText={setNameValue}
                autoFocus
                accessibilityLabel="Channel name input"
              />
              <View className="flex-row justify-end gap-2 mt-2">
                <Pressable
                  className="px-3 py-2 min-h-[36px] items-center justify-center"
                  onPress={() => setEditingName(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text className="font-sans-medium text-sm text-content-secondary">Cancel</Text>
                </Pressable>
                <Pressable
                  className="px-3 py-2 bg-accent-primary rounded-md min-h-[36px] items-center justify-center"
                  onPress={handleSaveName}
                  accessibilityRole="button"
                  accessibilityLabel="Save channel name"
                >
                  <Text className="font-sans-medium text-sm text-white">Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={!isDM ? handleStartEditName : undefined}
              accessibilityRole={!isDM ? 'button' : 'text'}
              accessibilityLabel={`Channel name: ${channel.name}`}
              className="min-h-[44px] justify-center"
            >
              <Text className="font-sans text-xs text-content-tertiary mb-1 uppercase tracking-wide">
                {isDM ? 'Conversation' : 'Channel name'}
              </Text>
              <View className="flex-row items-center">
                <Text className="font-sans-semibold text-lg text-content-primary flex-1">
                  {channel.name || 'Unnamed'}
                </Text>
                {!isDM && (
                  <Ionicons name="pencil-outline" size={16} color="#77818B" />
                )}
              </View>
            </Pressable>
          )}
        </View>

        {/* Description */}
        {!isDM && (
          <View className="px-4 py-4 border-b border-border-primary">
            {editingDescription ? (
              <View>
                <Text className="font-sans text-xs text-content-tertiary mb-1 uppercase tracking-wide">
                  Description
                </Text>
                <TextInput
                  className="bg-surface-tertiary text-content-primary font-sans text-sm rounded-md px-3 py-2 border border-border-primary min-h-[60px]"
                  value={descriptionValue}
                  onChangeText={setDescriptionValue}
                  multiline
                  autoFocus
                  accessibilityLabel="Channel description input"
                />
                <View className="flex-row justify-end gap-2 mt-2">
                  <Pressable
                    className="px-3 py-2 min-h-[36px] items-center justify-center"
                    onPress={() => setEditingDescription(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text className="font-sans-medium text-sm text-content-secondary">Cancel</Text>
                  </Pressable>
                  <Pressable
                    className="px-3 py-2 bg-accent-primary rounded-md min-h-[36px] items-center justify-center"
                    onPress={handleSaveDescription}
                    accessibilityRole="button"
                    accessibilityLabel="Save description"
                  >
                    <Text className="font-sans-medium text-sm text-white">Save</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={handleStartEditDescription}
                accessibilityRole="button"
                accessibilityLabel={`Description: ${channel.description || 'No description'}`}
                className="min-h-[44px] justify-center"
              >
                <Text className="font-sans text-xs text-content-tertiary mb-1 uppercase tracking-wide">
                  Description
                </Text>
                <View className="flex-row items-center">
                  <Text className="font-sans text-sm text-content-secondary flex-1">
                    {channel.description || 'No description'}
                  </Text>
                  <Ionicons name="pencil-outline" size={16} color="#77818B" />
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* Notifications */}
        <View className="px-4 py-3 border-b border-border-primary flex-row items-center justify-between min-h-[44px]">
          <Text className="font-sans text-base text-content-primary">Mute notifications</Text>
          <Switch
            value={isMuted}
            onValueChange={handleToggleMute}
            trackColor={{ false: '#3E3F43', true: '#205DC2' }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Mute channel notifications"
          />
        </View>

        {/* Pinned messages */}
        <SettingsRow
          label="Pinned messages"
          showChevron
          onPress={handlePinnedMessages}
        />

        {/* Members section */}
        <View className="mt-4">
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text className="font-sans-semibold text-xs text-content-tertiary uppercase tracking-wide">
              Members ({channelMembers?.length ?? 0})
            </Text>
            {!isDM && (
              <Pressable
                onPress={handleAddMember}
                className="min-h-[36px] min-w-[36px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Add member"
              >
                <Ionicons name="person-add-outline" size={18} color="#205DC2" />
              </Pressable>
            )}
          </View>

          {membersLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#205DC2" />
            </View>
          ) : (
            channelMembers?.map((cm) => {
              const memberInfo = allMembers?.find((m) => m._id === cm.memberId)
              const displayMember: MemberItem = memberInfo ?? {
                _id: cm.memberId,
                accountUuid: cm.memberId,
                name: cm.memberId,
                email: '',
                avatarUrl: undefined,
                role: cm.role,
                isActive: true,
                createdOn: 0,
                modifiedOn: 0,
              }
              return (
                <MemberRow
                  key={cm.memberId}
                  member={displayMember}
                  onPress={!isDM ? handleRemoveMember : undefined}
                />
              )
            })
          )}
        </View>

        {/* Danger zone */}
        <View className="mt-6 border-t border-border-primary">
          <SettingsRow
            label="Leave channel"
            destructive
            onPress={handleLeave}
          />
          {!isDM && (
            <SettingsRow
              label="Archive channel"
              destructive
              onPress={handleArchive}
            />
          )}
        </View>
      </ScrollView>

      {/* Add member picker */}
      <BottomSheetModal
        ref={memberPickerRef}
        snapPoints={snapPoints}
        backdropComponent={renderMemberPickerBackdrop}
        backgroundStyle={{ backgroundColor: '#1E1F23' }}
        handleIndicatorStyle={{ backgroundColor: '#77818B' }}
        enableDynamicSizing={false}
      >
        <View className="px-4 py-3 border-b border-border-primary">
          <Text
            className="font-sans-semibold text-base text-content-primary mb-3"
            accessibilityRole="header"
          >
            Add Member
          </Text>
          <TextInput
            className="bg-surface-tertiary text-content-primary font-sans text-sm rounded-md px-3 py-2 border border-border-primary"
            placeholder="Search members..."
            placeholderTextColor="#77818B"
            value={memberSearch}
            onChangeText={setMemberSearch}
            accessibilityLabel="Search members"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {allMembersLoading ? (
          <View className="flex-1 items-center justify-center py-8">
            <ActivityIndicator size="small" color="#205DC2" />
          </View>
        ) : (
          <BottomSheetFlatList
            data={availableMembers}
            keyExtractor={(item: MemberItem) => item._id}
            renderItem={renderMemberPickerItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View className="items-center py-8">
                <Text className="font-sans text-sm text-content-tertiary">
                  {memberSearch.length > 0 ? 'No members found' : 'All members are already in the channel'}
                </Text>
              </View>
            }
          />
        )}
      </BottomSheetModal>
    </SafeAreaView>
  )
}
