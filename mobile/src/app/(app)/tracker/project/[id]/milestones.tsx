/**
 * Project-scoped Milestone list screen.
 *
 * Lists all Milestones in the active tracker project with row-level Edit
 * and Delete affordances. Hard delete (matches web parity) — no archive
 * flag, no isArchived field. Confirmed via Alert with reference-loss
 * warning copy mirroring the intent of web's MoveAndDeleteMilestonePopup
 * in a simpler form. Failed delete leaves the row visible (showErrorToast
 * surfaced by useDeleteMilestone.onError).
 *
 * Status badges color-map via the mobile-side `MILESTONE_STATUS` const
 * from `@/lib/milestoneStatus` — NO value-import from @hcengineering/tracker
 * (per the project's RN-Safety Matrix).
 */

import { useCallback } from 'react'
import { View, Text, ActivityIndicator, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Doc, Ref, Space } from '@hcengineering/core'

import { useMilestones, useDeleteMilestone } from '@/hooks'
import { MILESTONE_STATUS, type MilestoneStatusValue } from '@/lib/milestoneStatus'
import type { MilestoneItem } from '@/repositories/tracker'

// ---------------------------------------------------------------------------
// Status badge color/label mapping
// ---------------------------------------------------------------------------

interface BadgeStyle {
  label: string
  // Tailwind classes for background + text color of the badge pill
  className: string
}

function statusBadge(rawStatus: string | undefined): BadgeStyle {
  // MilestoneItem.status is the numeric MilestoneStatus coerced to string
  // (see getMilestones mapper). Coerce back to a number, and only treat
  // recognized MILESTONE_STATUS values as known.
  const n = rawStatus != null ? Number(rawStatus) : NaN
  const known: MilestoneStatusValue | undefined =
    n === MILESTONE_STATUS.Planned ||
    n === MILESTONE_STATUS.InProgress ||
    n === MILESTONE_STATUS.Completed ||
    n === MILESTONE_STATUS.Canceled
      ? (n as MilestoneStatusValue)
      : undefined

  switch (known) {
    case MILESTONE_STATUS.Planned:
      return { label: 'Planned', className: 'bg-surface-tertiary' }
    case MILESTONE_STATUS.InProgress:
      return { label: 'In progress', className: 'bg-primary/20' }
    case MILESTONE_STATUS.Completed:
      return { label: 'Completed', className: 'bg-success/20' }
    case MILESTONE_STATUS.Canceled:
      return { label: 'Canceled', className: 'bg-danger/20' }
    default:
      return { label: 'Planned', className: 'bg-surface-tertiary' }
  }
}

function statusTextClass(rawStatus: string | undefined): string {
  const n = rawStatus != null ? Number(rawStatus) : NaN
  switch (n) {
    case MILESTONE_STATUS.InProgress:
      return 'text-primary'
    case MILESTONE_STATUS.Completed:
      return 'text-success'
    case MILESTONE_STATUS.Canceled:
      return 'text-danger'
    case MILESTONE_STATUS.Planned:
    default:
      return 'text-content'
  }
}

function formatTargetDate(ts: number | undefined): string | undefined {
  if (ts == null || !Number.isFinite(ts) || ts === 0) return undefined
  // Match the precedent set by MilestonePicker / IssueDetail / IssueForm:
  // localized absolute date via toLocaleDateString().
  return new Date(ts).toLocaleDateString()
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ProjectMilestonesScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = id as Ref<Space>

  const { data, isLoading, error, refetch, isRefetching } = useMilestones(projectId)
  const deleteMilestone = useDeleteMilestone()

  const handleEdit = useCallback(
    (milestoneId: string) => {
      router.push(
        `/(app)/tracker/project/${id}/milestones/${milestoneId}` as Href
      )
    },
    [id]
  )

  const handleDelete = useCallback(
    (item: MilestoneItem) => {
      Alert.alert(
        'Delete milestone?',
        'Issues referencing this milestone will lose their reference. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteMilestone.mutate({
                milestoneId: item._id as Ref<Doc>,
                space: projectId,
              })
            },
          },
        ],
        { cancelable: true }
      )
    },
    [deleteMilestone, projectId]
  )

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Milestones' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#205DC2" />
          <Text className="font-sans text-sm text-content mt-3">
            Loading milestones...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Milestones' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#EE7A7A" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            Failed to load milestones
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            {error.message}
          </Text>
          <Pressable
            className="bg-primary rounded-md px-6 py-3 mt-4 min-h-[44px] items-center justify-center"
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading milestones"
          >
            <Text className="font-sans-medium text-sm text-on-accent">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const items = data ?? []

  // Empty state
  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Stack.Screen options={{ title: 'Milestones' }} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="flag-outline" size={48} color="#77818B" />
          <Text className="font-sans-medium text-base text-caption mt-3">
            No milestones yet
          </Text>
          <Text className="font-sans text-sm text-content mt-1 text-center">
            Milestones group issues toward a target date.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // List view
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Stack.Screen options={{ title: 'Milestones' }} />
      <FlashList
        data={items}
        renderItem={({ item }) => {
          const badge = statusBadge(item.status)
          const badgeText = statusTextClass(item.status)
          const targetLabel = formatTargetDate(item.targetDate)
          const isDeleting =
            deleteMilestone.isPending &&
            deleteMilestone.variables?.milestoneId === item._id

          return (
            <View
              className="bg-surface-secondary rounded-lg p-3 mb-2 flex-row items-center"
              accessibilityRole="summary"
              accessibilityLabel={`Milestone ${item.name}, status ${badge.label}`}
            >
              <View className="flex-1 min-w-0 mr-2">
                <Text
                  className="font-sans-medium text-sm text-caption"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View
                    className={`px-2 py-0.5 rounded-full ${badge.className}`}
                  >
                    <Text
                      className={`font-sans-medium text-[11px] ${badgeText}`}
                    >
                      {badge.label}
                    </Text>
                  </View>
                  {targetLabel != null ? (
                    <Text
                      className="font-sans text-xs text-content-secondary ml-2"
                      numberOfLines={1}
                    >
                      Target: {targetLabel}
                    </Text>
                  ) : null}
                </View>
                {item.description != null && item.description.length > 0 ? (
                  <Text
                    className="font-sans text-xs text-content-secondary mt-1"
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleEdit(item._id)}
                className="p-2 min-h-[44px] min-w-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Edit milestone ${item.name}`}
              >
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item)}
                disabled={isDeleting}
                className="p-2 min-h-[44px] min-w-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Delete milestone ${item.name}`}
                accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EE7A7A" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#EE7A7A" />
                )}
              </Pressable>
            </View>
          )
        }}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
        onRefresh={() => void refetch()}
        refreshing={isRefetching}
      />
    </SafeAreaView>
  )
}
