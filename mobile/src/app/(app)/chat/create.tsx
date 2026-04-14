/**
 * Create channel screen.
 *
 * Form with channel name, description, private toggle, and initial
 * member picker. On submit calls useCreateChannel and navigates
 * to the new channel on success.
 */

import { useCallback, useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack, type Href } from 'expo-router'
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'

import { useCreateChannel } from '@/hooks/useChannels'
import { useMembers, useSearchMembers } from '@/hooks/useMembers'
import { AvatarCircle } from '@/components/ui/AvatarCircle'
import type { MemberItem } from '@/repositories/members'

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CreateChannelScreen(): React.ReactNode {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<MemberItem[]>([])

  const createChannel = useCreateChannel()
  const memberPickerRef = useRef<BottomSheetModal>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const { data: allMembers, isLoading: membersLoading } = useMembers()
  const filteredMembers = useSearchMembers(allMembers, memberSearch)

  const snapPoints = useMemo(() => ['50%', '75%'], [])

  // Filter out already selected members
  const selectedIds = useMemo(() => new Set(selectedMembers.map((m) => m._id)), [selectedMembers])
  const availableMembers = useMemo(
    () => filteredMembers.filter((m) => !selectedIds.has(m._id)),
    [filteredMembers, selectedIds]
  )

  const canSubmit = name.trim().length > 0 && !createChannel.isPending

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return

    createChannel.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
        memberIds: selectedMembers.map((m) => m._id),
      },
      {
        onSuccess: (channel) => {
          router.replace(`/(app)/chat/channel/${channel._id}` as Href)
        },
        onError: (error) => {
          Alert.alert('Failed to create channel', error.message)
        },
      }
    )
  }, [canSubmit, createChannel, name, description, isPrivate, selectedMembers])

  const handleCancel = useCallback(() => {
    const isDirty = name.length > 0 || description.length > 0 || selectedMembers.length > 0
    if (isDirty) {
      Alert.alert('Discard changes?', 'You have unsaved changes.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }, [name, description, selectedMembers])

  const handleOpenMemberPicker = useCallback(() => {
    setMemberSearch('')
    memberPickerRef.current?.present()
  }, [])

  const handleSelectMember = useCallback((member: MemberItem) => {
    setSelectedMembers((prev) => [...prev, member])
    memberPickerRef.current?.dismiss()
  }, [])

  const handleRemoveMember = useCallback((memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m._id !== memberId))
  }, [])

  const renderMemberPickerBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  )

  const renderMemberPickerItem = useCallback(
    ({ item }: { item: MemberItem }) => (
      <Pressable
        className="flex-row items-center gap-3 px-4 py-3 min-h-[44px] active:bg-surface-tertiary"
        onPress={() => handleSelectMember(item)}
        accessibilityRole="button"
        accessibilityLabel={`Add ${item.name}`}
      >
        <AvatarCircle name={item.name} imageUrl={item.avatarUrl} size={32} />
        <View className="flex-1">
          <Text className="font-sans-medium text-sm text-content-primary">{item.name}</Text>
          {item.email.length > 0 && (
            <Text className="font-sans text-xs text-content-secondary" numberOfLines={1}>
              {item.email}
            </Text>
          )}
        </View>
      </Pressable>
    ),
    [handleSelectMember]
  )

  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'New Channel',
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
              accessibilityLabel="Create channel"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {createChannel.isPending ? (
                <ActivityIndicator size="small" color="#205DC2" />
              ) : (
                <Text className="font-sans-semibold text-base text-accent-primary">Create</Text>
              )}
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* Channel name */}
          <View className="px-4 py-4 border-b border-border-primary">
            <Text className="font-sans text-xs text-content-tertiary mb-1 uppercase tracking-wide">
              Channel name
            </Text>
            <TextInput
              className="bg-surface-tertiary text-content-primary font-sans text-base rounded-md px-3 py-2.5 border border-border-primary"
              value={name}
              onChangeText={setName}
              placeholder="e.g. engineering"
              placeholderTextColor="#77818B"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Channel name"
            />
          </View>

          {/* Description */}
          <View className="px-4 py-4 border-b border-border-primary">
            <Text className="font-sans text-xs text-content-tertiary mb-1 uppercase tracking-wide">
              Description (optional)
            </Text>
            <TextInput
              className="bg-surface-tertiary text-content-primary font-sans text-sm rounded-md px-3 py-2.5 border border-border-primary min-h-[60px]"
              value={description}
              onChangeText={setDescription}
              placeholder="What is this channel about?"
              placeholderTextColor="#77818B"
              multiline
              accessibilityLabel="Channel description"
            />
          </View>

          {/* Private toggle */}
          <View className="px-4 py-3 border-b border-border-primary flex-row items-center justify-between min-h-[44px]">
            <View className="flex-1 mr-4">
              <Text className="font-sans text-base text-content-primary">Private channel</Text>
              <Text className="font-sans text-xs text-content-tertiary mt-0.5">
                Only invited members can see this channel
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: '#3E3F43', true: '#205DC2' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Private channel toggle"
            />
          </View>

          {/* Members section */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between px-4 py-2">
              <Text className="font-sans-semibold text-xs text-content-tertiary uppercase tracking-wide">
                Initial members ({selectedMembers.length})
              </Text>
              <Pressable
                onPress={handleOpenMemberPicker}
                className="min-h-[36px] min-w-[36px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Add initial member"
              >
                <Ionicons name="person-add-outline" size={18} color="#205DC2" />
              </Pressable>
            </View>

            {selectedMembers.length === 0 ? (
              <View className="px-4 py-4">
                <Text className="font-sans text-sm text-content-tertiary text-center">
                  No members added yet. You can add them now or later.
                </Text>
              </View>
            ) : (
              selectedMembers.map((member) => (
                <View key={member._id} className="flex-row items-center">
                  <View className="flex-1">
                    <Pressable
                      className="flex-row items-center gap-3 px-4 py-3 min-h-[44px]"
                      accessibilityRole="text"
                      accessibilityLabel={member.name}
                    >
                      <AvatarCircle name={member.name} imageUrl={member.avatarUrl} size={36} />
                      <View className="flex-1">
                        <Text className="font-sans-medium text-sm text-content-primary">
                          {member.name}
                        </Text>
                        {member.email.length > 0 && (
                          <Text className="font-sans text-xs text-content-secondary" numberOfLines={1}>
                            {member.email}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveMember(member._id)}
                    className="px-3 min-h-[44px] min-w-[44px] items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.name}`}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#F04438" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Member picker bottom sheet */}
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

        {membersLoading ? (
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
                  {memberSearch.length > 0 ? 'No members found' : 'No members available'}
                </Text>
              </View>
            }
          />
        )}
      </BottomSheetModal>
    </SafeAreaView>
  )
}
