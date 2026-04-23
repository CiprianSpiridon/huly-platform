/**
 * Member list / contacts directory screen.
 *
 * Displays all workspace members with search and alphabetical sections.
 * Owners/maintainers can invite new members via the header action.
 * Owners can tap a member to open a detail sheet that changes the member's
 * role or removes them from the workspace. The sheet is gated by the
 * current user's role; non-owners see a read-only row press.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  SectionList,
  RefreshControl,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, router, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'

import { AccountRole } from '@hcengineering/core'
import type { AccountUuid } from '@hcengineering/core'
import { useMembers, useSearchMembers } from '@/hooks/useMembers'
import { MemberRow } from '@/components/features/MemberRow'
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole'
import { useAuthStore } from '@/store/auth'
import { updateMemberRole, removeMember, type MemberItem } from '@/repositories/members'

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

interface RoleChoice {
  label: string
  value: AccountRole
}

const ROLE_CHOICES: RoleChoice[] = [
  { label: 'Owner', value: AccountRole.Owner },
  { label: 'Maintainer', value: AccountRole.Maintainer },
  { label: 'User', value: AccountRole.User },
  { label: 'Guest', value: AccountRole.Guest },
]

function normalizeRoleValue(raw: string): AccountRole | null {
  const upper = raw.toUpperCase()
  switch (upper) {
    case 'OWNER':
      return AccountRole.Owner
    case 'MAINTAINER':
      return AccountRole.Maintainer
    case 'USER':
      return AccountRole.User
    case 'GUEST':
      return AccountRole.Guest
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MembersScreen(): React.ReactNode {
  const { data: members, isLoading, error, refetch } = useMembers()
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [detailMember, setDetailMember] = useState<MemberItem | null>(null)
  const filteredMembers = useSearchMembers(members, searchQuery)
  const currentRole = useWorkspaceRole()
  const currentAccount = useAuthStore((s) => s.account)
  const canInvite = currentRole === 'owner' || currentRole === 'maintainer'
  const canManage = currentRole === 'owner'
  const queryClient = useQueryClient()

  const ownerCount = useMemo(() => {
    if (members == null) return 0
    return members.filter((m) => m.role.toUpperCase() === 'OWNER').length
  }, [members])

  const membersHeaderRight = useCallback(() => {
    if (!canInvite) return null
    return (
      <Pressable
        onPress={() => {
          router.push('/(app)/settings/invite-member' as Href)
        }}
        className="min-h-[44px] min-w-[44px] items-center justify-center pr-2"
        accessibilityRole="button"
        accessibilityLabel="Invite a new member"
      >
        <Ionicons name="person-add-outline" size={22} color="#205DC2" />
      </Pressable>
    )
  }, [canInvite])

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

  const handleMemberPress = useCallback(
    (member: MemberItem) => {
      if (!canManage) return
      setDetailMember(member)
    },
    [canManage]
  )

  const handleCloseDetail = useCallback(() => {
    setDetailMember(null)
  }, [])

  const handleChangeRole = useCallback(
    async (target: MemberItem, newRole: AccountRole) => {
      const currentMemberRole = normalizeRoleValue(target.role)
      if (currentMemberRole === newRole) {
        return
      }
      // Client-side guard: cannot demote the last owner.
      if (currentMemberRole === AccountRole.Owner && newRole !== AccountRole.Owner && ownerCount <= 1) {
        Alert.alert(
          'Cannot demote last owner',
          'Promote another member to Owner before changing this role.',
          [{ text: 'OK' }],
        )
        return
      }

      try {
        await updateMemberRole(target.accountUuid, newRole)
        await queryClient.invalidateQueries({ queryKey: ['members'] })
        setDetailMember(null)
      } catch (err) {
        const message = err instanceof Error ? err.message.toLowerCase() : ''
        if (message.includes('409') || message.includes('conflict')) {
          await queryClient.invalidateQueries({ queryKey: ['members'] })
          Alert.alert(
            'Role changed by another admin',
            'The role was updated from another session. The list has been refreshed.',
            [{ text: 'OK' }],
          )
          setDetailMember(null)
          return
        }
        Alert.alert(
          'Failed to update role',
          err instanceof Error ? err.message : 'An unknown error occurred.',
          [{ text: 'OK' }],
        )
      }
    },
    [ownerCount, queryClient]
  )

  const handleRemoveMember = useCallback(
    (target: MemberItem) => {
      // Client-side guard: cannot remove self via this flow.
      if (currentAccount != null && target.accountUuid === currentAccount) {
        Alert.alert(
          'Cannot remove yourself',
          'To leave the workspace, use the workspace switcher.',
          [{ text: 'OK' }],
        )
        return
      }
      // Client-side guard: cannot remove the last owner.
      if (target.role.toUpperCase() === 'OWNER' && ownerCount <= 1) {
        Alert.alert(
          'Cannot remove last owner',
          'Promote another member to Owner before removing this one.',
          [{ text: 'OK' }],
        )
        return
      }

      Alert.alert(
        'Remove member',
        `Remove ${target.name} from this workspace? They will lose access immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                try {
                  await removeMember(target.accountUuid as AccountUuid)
                  await queryClient.invalidateQueries({ queryKey: ['members'] })
                  setDetailMember(null)
                } catch (err) {
                  Alert.alert(
                    'Failed to remove member',
                    err instanceof Error ? err.message : 'An unknown error occurred.',
                    [{ text: 'OK' }],
                  )
                }
              })()
            },
          },
        ],
      )
    },
    [currentAccount, ownerCount, queryClient]
  )

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Members', headerRight: membersHeaderRight }} />
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
        <Stack.Screen options={{ title: 'Members', headerRight: membersHeaderRight }} />
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
      <Stack.Screen options={{ title: 'Members', headerRight: membersHeaderRight }} />

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
          renderItem={({ item }) => (
            <MemberRow
              member={item}
              onPress={canManage ? handleMemberPress : undefined}
              showChevron={canManage}
            />
          )}
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

      <MemberDetailSheet
        member={detailMember}
        canManage={canManage}
        onClose={handleCloseDetail}
        onChangeRole={handleChangeRole}
        onRemove={handleRemoveMember}
      />
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Detail sheet
// ---------------------------------------------------------------------------

interface MemberDetailSheetProps {
  member: MemberItem | null
  canManage: boolean
  onClose: () => void
  onChangeRole: (member: MemberItem, role: AccountRole) => void | Promise<void>
  onRemove: (member: MemberItem) => void
}

function MemberDetailSheet({
  member,
  canManage,
  onClose,
  onChangeRole,
  onRemove,
}: MemberDetailSheetProps): React.ReactNode {
  const [pending, setPending] = useState<AccountRole | null>(null)

  const currentRole = member != null ? normalizeRoleValue(member.role) : null

  const handleRolePress = useCallback(
    async (role: AccountRole) => {
      if (member == null) return
      if (currentRole === role) return
      setPending(role)
      try {
        await onChangeRole(member, role)
      } finally {
        setPending(null)
      }
    },
    [member, currentRole, onChangeRole]
  )

  return (
    <Modal
      visible={member != null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-surface-overlay"
      >
        <View className="bg-surface-secondary rounded-t-xl p-4 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={onClose}
              className="min-h-[44px] min-w-[44px] items-start justify-center"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text className="font-sans text-base text-content-secondary">Close</Text>
            </Pressable>
            <Text className="font-sans-semibold text-base text-content-primary">
              {member?.name ?? 'Member'}
            </Text>
            <View className="min-h-[44px] min-w-[44px]" />
          </View>

          <Text className="font-sans-medium text-xs text-content-tertiary uppercase mb-2">
            Role
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Select role for member"
          >
            {ROLE_CHOICES.map((choice) => {
              const isActive = currentRole === choice.value
              const isBusy = pending === choice.value
              return (
                <Pressable
                  key={choice.value}
                  onPress={() => {
                    void handleRolePress(choice.value)
                  }}
                  disabled={!canManage || pending != null}
                  className={`flex-row items-center gap-3 px-3 py-3 min-h-[44px] rounded-md mb-2 ${
                    isActive ? 'bg-surface-tertiary' : 'bg-surface-primary'
                  }`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive, disabled: !canManage }}
                  accessibilityLabel={choice.label}
                >
                  <Ionicons
                    name={isActive ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isActive ? '#205DC2' : '#77818B'}
                  />
                  <Text className="flex-1 font-sans-medium text-base text-content-primary">
                    {choice.label}
                  </Text>
                  {isBusy && <ActivityIndicator size="small" color="#205DC2" />}
                </Pressable>
              )
            })}
          </View>

          <Pressable
            onPress={() => {
              if (member != null) onRemove(member)
            }}
            disabled={!canManage || pending != null}
            className={`mt-4 rounded-md min-h-[44px] items-center justify-center ${
              canManage ? 'bg-status-error/10' : 'bg-surface-tertiary'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Remove member from workspace"
            accessibilityState={{ disabled: !canManage }}
          >
            <Text
              className={`font-sans-semibold text-base ${
                canManage ? 'text-status-error' : 'text-content-tertiary'
              }`}
            >
              Remove from workspace
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
