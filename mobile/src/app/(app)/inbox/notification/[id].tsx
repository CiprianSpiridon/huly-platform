/**
 * Notification detail / fallback screen.
 *
 * For notifications whose objectClass maps to a known route (e.g.,
 * tracker:class:Issue), the list screen navigates directly to the
 * source document. This screen handles:
 *
 * 1. Unknown object classes that have no dedicated screen
 * 2. Deleted source documents that can no longer be resolved
 * 3. Direct deep links to /inbox/notification/[id]
 *
 * Marks the notification as read on mount.
 */

import { useEffect, useCallback, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useHulyFindOne } from '@/hooks/useHulyQuery'
import { useMarkAsRead } from '@/hooks/useNotifications'
import { resolveNotificationRoute } from '@/lib/notificationRouter'
import type { Class, Doc, Ref } from '@hcengineering/core'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOTIFICATION_CLASS = 'notification:class:InboxNotification' as Ref<Class<Doc>>

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function NotificationDetailScreen(): React.ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>()
  const markAsReadMutation = useMarkAsRead()
  const hasMarkedRead = useRef(false)

  if (!id) {
    router.back()
    return null
  }

  const { data: notification, isLoading, error } = useHulyFindOne(
    NOTIFICATION_CLASS,
    { _id: id as Ref<Doc> }
  )

  const record = notification as unknown as Record<string, unknown> | undefined

  // Mark as read on mount (once)
  useEffect(() => {
    if (id && !hasMarkedRead.current) {
      hasMarkedRead.current = true
      markAsReadMutation.mutate([id])
    }
  }, [id, markAsReadMutation])

  // Try to navigate to the source document
  const handleNavigateToSource = useCallback(() => {
    if (record === undefined) return

    const objectClass = String(record.objectClass ?? '')
    const objectId = String(record.objectId ?? '')

    if (objectClass && objectId) {
      const result = resolveNotificationRoute(objectClass, objectId)
      if (result.isKnown) {
        router.push(result.path as never)
        return
      }
    }
  }, [record])

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Notification' }} />
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-sm text-content">Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error / not found state
  if (error !== null || notification === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Notification' }} />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#77818B" />
          <Text className="font-sans-semibold text-lg text-caption mt-4 text-center">
            Notification no longer available
          </Text>
          <Text className="font-sans text-sm text-dark mt-2 text-center">
            The source document may have been deleted or you may no longer have access.
          </Text>
          <Pressable
            className="mt-6 bg-accent-primary rounded-md px-6 py-3 active:opacity-80"
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back to inbox"
          >
            <Text className="font-sans-medium text-sm text-on-accent">
              Back to Inbox
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // Notification detail view
  const title = String(record?.title ?? 'Notification')
  const body = String(record?.body ?? record?.message ?? record?.messageHtml ?? '')
  const objectClass = String(record?.objectClass ?? '')
  const objectId = String(record?.objectId ?? '')
  const hasSource = objectClass !== '' && objectId !== ''
  const isKnownSource = hasSource && resolveNotificationRoute(objectClass, objectId).isKnown

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <Stack.Screen options={{ title: title || 'Notification' }} />

      <View className="flex-1 px-4 pt-4">
        {/* Title */}
        {title !== '' && (
          <Text className="font-sans-semibold text-lg text-caption mb-2">
            {title}
          </Text>
        )}

        {/* Body */}
        {body !== '' && (
          <Text className="font-sans text-base text-content leading-relaxed">
            {body}
          </Text>
        )}

        {/* Navigate to source button */}
        {isKnownSource && (
          <Pressable
            className="mt-6 bg-surface-accent rounded-md p-3 flex-row items-center active:opacity-80"
            onPress={handleNavigateToSource}
            accessibilityRole="button"
            accessibilityLabel="View source document"
          >
            <Ionicons name="open-outline" size={18} color="#205DC2" />
            <Text className="font-sans-medium text-sm text-accent-primary ml-2">
              View source document
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  )
}
