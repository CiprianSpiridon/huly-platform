/**
 * Upload progress indicator.
 *
 * Displays a floating pill showing upload status for each active upload.
 * Completed uploads auto-dismiss after 3 seconds. Failed uploads show
 * an error state that can be dismissed.
 */

import { memo, useEffect, useRef, useCallback } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useShallow } from 'zustand/react/shallow'

import { useUploadStore } from '@/store/upload'
import type { UploadEntry } from '@/store/upload'
import { formatFileSize } from '@/lib/format'

// ---------------------------------------------------------------------------
// Individual upload pill
// ---------------------------------------------------------------------------

interface UploadPillProps {
  entry: UploadEntry
  onDismiss: (id: string) => void
}

function UploadPillInner({ entry, onDismiss }: UploadPillProps): React.ReactNode {
  const fadeAnim = useRef(new Animated.Value(1)).current
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss completed uploads after 3 seconds
  useEffect(() => {
    if (entry.status === 'completed') {
      autoDismissTimer.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onDismiss(entry.id)
        })
      }, 3000)
    }

    return () => {
      if (autoDismissTimer.current != null) {
        clearTimeout(autoDismissTimer.current)
      }
    }
  }, [entry.status, entry.id, onDismiss, fadeAnim])

  const handleDismiss = useCallback(() => {
    onDismiss(entry.id)
  }, [entry.id, onDismiss])

  const progressPercent = Math.round(entry.progress * 100)

  return (
    <Animated.View
      style={{ opacity: fadeAnim }}
      className="flex-row items-center bg-surface-tertiary rounded-full px-3 py-2 mb-1.5"
      accessibilityRole="progressbar"
      accessibilityLabel={`Uploading ${entry.filename}`}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: progressPercent,
      }}
    >
      {/* Status icon */}
      {entry.status === 'completed' ? (
        <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
      ) : entry.status === 'failed' ? (
        <Ionicons name="alert-circle" size={18} color="#EE7A7A" />
      ) : (
        <Ionicons name="cloud-upload-outline" size={18} color="#205DC2" />
      )}

      {/* Filename and status */}
      <View className="flex-1 ml-2 mr-1">
        <Text className="font-sans-medium text-xs text-content-primary" numberOfLines={1}>
          {entry.filename}
        </Text>
        {entry.status === 'failed' ? (
          <Text className="font-sans text-xs text-error" numberOfLines={1}>
            {entry.error ?? 'Upload failed'}
          </Text>
        ) : entry.status === 'completed' ? (
          <Text className="font-sans text-xs text-content-tertiary">
            Uploaded
          </Text>
        ) : (
          <View className="flex-row items-center gap-1">
            {/* Progress bar */}
            <View className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden flex-row">
              <View
                className="h-full bg-accent-primary rounded-full"
                style={{ flex: entry.progress }}
              />
              <View style={{ flex: 1 - entry.progress }} />
            </View>
            <Text className="font-sans text-xs text-content-tertiary w-8 text-right">
              {progressPercent}%
            </Text>
          </View>
        )}
      </View>

      {/* Dismiss button for failed uploads */}
      {entry.status === 'failed' && (
        <Pressable
          className="w-7 h-7 items-center justify-center rounded-full active:opacity-70"
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss failed upload of ${entry.filename}`}
        >
          <Ionicons name="close" size={14} color="#77818B" />
        </Pressable>
      )}
    </Animated.View>
  )
}

const UploadPill = memo(UploadPillInner)

// ---------------------------------------------------------------------------
// Upload progress overlay
// ---------------------------------------------------------------------------

function UploadProgress(): React.ReactNode {
  const uploads = useUploadStore(useShallow((s) => [...s.uploads.values()]))
  const removeUpload = useUploadStore((s) => s.removeUpload)

  const handleDismiss = useCallback(
    (id: string) => {
      removeUpload(id)
    },
    [removeUpload]
  )

  // Only show uploads that are active or recently completed/failed
  const visibleUploads = uploads.filter(
    (u) => u.status !== 'completed' || (u.completedAt != null && Date.now() - u.completedAt < 4000)
  )

  if (visibleUploads.length === 0) {
    return null
  }

  return (
    <View className="absolute bottom-20 left-4 right-4 z-50">
      {visibleUploads.map((entry) => (
        <UploadPill key={entry.id} entry={entry} onDismiss={handleDismiss} />
      ))}
    </View>
  )
}

export { UploadProgress }
