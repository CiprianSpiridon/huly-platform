/**
 * Create Milestone screen.
 *
 * Project-scoped form: Name (required, max 80, mapped to tx field `label`),
 * Description (multiline, optional), Status picker (4 chips sourced from
 * `MILESTONE_STATUS` — NO string literals, NO value-import from
 * @hcengineering/tracker per the project's RN-Safety Matrix), and
 * Target date input (text-driven YYYY-MM-DD picker, matching the existing
 * `IssueForm` due-date precedent — `@react-native-community/datetimepicker`
 * is not in mobile/package.json and adding a native dep requires a rebuild).
 *
 * Defaults: status = Planned, targetDate = today + 30 days.
 *
 * Past-date warning is non-blocking and matches the web's permissive
 * validation (web's `MoveAndDeleteMilestonePopup` does not hard-block).
 */

import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Ref, Space } from '@hcengineering/core'

import { useCreateMilestone } from '@/hooks'
import {
  MILESTONE_STATUS,
  type MilestoneStatusValue,
} from '@/lib/milestoneStatus'

const NAME_MAX = 80
const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_OFFSET_DAYS = 30

interface StatusOption {
  value: MilestoneStatusValue
  label: string
  // Active state classes for the chip container + text
  activeContainerClass: string
  activeTextClass: string
}

const STATUS_OPTIONS: readonly StatusOption[] = [
  {
    value: MILESTONE_STATUS.Planned,
    label: 'Planned',
    activeContainerClass: 'bg-surface-tertiary border border-border-primary',
    activeTextClass: 'text-content',
  },
  {
    value: MILESTONE_STATUS.InProgress,
    label: 'In progress',
    activeContainerClass: 'bg-primary/20 border border-primary',
    activeTextClass: 'text-primary',
  },
  {
    value: MILESTONE_STATUS.Completed,
    label: 'Completed',
    activeContainerClass: 'bg-success/20 border border-success',
    activeTextClass: 'text-success',
  },
  {
    value: MILESTONE_STATUS.Canceled,
    label: 'Canceled',
    activeContainerClass: 'bg-danger/20 border border-danger',
    activeTextClass: 'text-danger',
  },
]

function startOfTodayPlusDays(days: number): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime() + days * DAY_MS
}

function formatYmd(ts: number): string {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseYmd(text: string): number | undefined {
  // Accept YYYY-MM-DD; Date.parse interprets it as UTC midnight which is fine
  // for a target date — we strip the time component when displaying.
  const parsed = Date.parse(text)
  return isNaN(parsed) ? undefined : parsed
}

export default function NewMilestoneScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = id as Ref<Space>

  const createMilestone = useCreateMilestone()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<MilestoneStatusValue>(MILESTONE_STATUS.Planned)
  const [targetDate, setTargetDate] = useState<number>(() =>
    startOfTodayPlusDays(DEFAULT_OFFSET_DAYS)
  )
  const [dateText, setDateText] = useState<string>(() =>
    formatYmd(startOfTodayPlusDays(DEFAULT_OFFSET_DAYS))
  )
  const [dateError, setDateError] = useState<string | undefined>(undefined)

  const trimmedName = name.trim()
  const isNameEmpty = trimmedName.length === 0
  const isPending = createMilestone.isPending
  const isSubmitDisabled = isNameEmpty || isPending

  const isPastDate = useMemo(() => {
    return (
      targetDate < Date.now() &&
      (status === MILESTONE_STATUS.InProgress ||
        status === MILESTONE_STATUS.Planned)
    )
  }, [targetDate, status])

  const handleDateChange = useCallback((text: string) => {
    setDateText(text)
    const parsed = parseYmd(text)
    if (parsed === undefined) {
      setDateError('Use YYYY-MM-DD')
      return
    }
    setDateError(undefined)
    setTargetDate(parsed)
  }, [])

  const handleSubmit = useCallback(() => {
    if (isSubmitDisabled) return
    createMilestone.mutate(
      {
        label: trimmedName,
        description: description.trim() ? description.trim() : undefined,
        status,
        space: projectId,
        targetDate,
      },
      {
        onSuccess: () => {
          router.back()
        },
        // Errors surfaced by the hook via showErrorToast.
      }
    )
  }, [
    isSubmitDisabled,
    createMilestone,
    trimmedName,
    description,
    status,
    projectId,
    targetDate,
  ])

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: 'New milestone' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16 }}
        >
          {/* Name */}
          <View className="mb-4">
            <Text className="font-sans-medium text-sm text-content-secondary mb-1">
              Name *
            </Text>
            <TextInput
              className="bg-surface-tertiary text-caption font-sans text-base rounded-md px-3 py-2.5 border border-border-primary"
              placeholder="Milestone name"
              placeholderTextColor="#77818B"
              value={name}
              onChangeText={setName}
              maxLength={NAME_MAX}
              autoFocus
              accessibilityLabel="Milestone name"
            />
            {isNameEmpty ? (
              <Text className="font-sans text-xs text-negative mt-1">
                Name required
              </Text>
            ) : null}
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="font-sans-medium text-sm text-content-secondary mb-1">
              Description
            </Text>
            <TextInput
              className="bg-surface-tertiary text-caption font-sans text-base rounded-md px-3 py-2.5 border border-border-primary min-h-[88px]"
              placeholder="Optional"
              placeholderTextColor="#77818B"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Milestone description"
            />
          </View>

          {/* Status picker */}
          <View className="mb-4">
            <Text className="font-sans-medium text-sm text-content-secondary mb-2">
              Status
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => {
                const isActive = status === option.value
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setStatus(option.value)}
                    className={`flex-row items-center gap-1.5 rounded-md px-3 py-2 min-h-[40px] ${
                      isActive
                        ? option.activeContainerClass
                        : 'bg-surface-tertiary border border-border-primary'
                    }`}
                    accessibilityRole="radio"
                    accessibilityLabel={`Status: ${option.label}`}
                    accessibilityState={{ selected: isActive }}
                  >
                    {isActive ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#FFFFFF"
                      />
                    ) : null}
                    <Text
                      className={`font-sans-medium text-xs ${
                        isActive ? option.activeTextClass : 'text-caption'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* Target date */}
          <View className="mb-4">
            <Text className="font-sans-medium text-sm text-content-secondary mb-1">
              Target date
            </Text>
            <View className="flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={16} color="#77818B" />
              <TextInput
                className="flex-1 bg-surface-tertiary text-caption font-sans text-sm rounded-md px-3 py-2.5 border border-border-primary min-h-[44px]"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#77818B"
                value={dateText}
                onChangeText={handleDateChange}
                accessibilityLabel="Target date in YYYY-MM-DD format"
              />
            </View>
            {dateError != null ? (
              <Text className="font-sans text-xs text-negative mt-1">
                {dateError}
              </Text>
            ) : null}
            {dateError == null && isPastDate ? (
              <Text className="font-sans text-xs text-warning mt-1">
                Target date is in the past
              </Text>
            ) : null}
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-3 mt-4">
            <Pressable
              className="flex-1 bg-surface-tertiary rounded-md py-3 min-h-[44px] items-center justify-center"
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="font-sans-medium text-sm text-caption">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 rounded-md py-3 min-h-[44px] items-center justify-center ${
                isSubmitDisabled ? 'bg-primary/50' : 'bg-primary'
              }`}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              accessibilityRole="button"
              accessibilityLabel="Create milestone"
              accessibilityState={{ disabled: isSubmitDisabled, busy: isPending }}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="font-sans-medium text-sm text-on-accent">
                  Create
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
