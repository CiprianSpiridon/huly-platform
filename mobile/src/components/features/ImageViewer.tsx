/**
 * Full-screen image viewer with pinch-to-zoom.
 *
 * Uses expo-image for display. Presented as a modal overlay with
 * a close button and share action. react-native-gesture-handler +
 * react-native-reanimated handle pinch and pan gestures.
 */

import { useCallback } from 'react'
import { View, Pressable, Text, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'

import { downloadAndShare } from '@/repositories/attachment'
import { useAttachmentUrl } from '@/hooks/useAttachments'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ImageViewerProps {
  blobId: string
  filename: string
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ImageViewer({ blobId, filename, onClose }: ImageViewerProps): React.ReactNode {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions()
  const { fileUrl } = useAttachmentUrl(blobId)

  const handleShare = useCallback(() => {
    void downloadAndShare(blobId, filename)
  }, [blobId, filename])

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-2 bg-black/80 z-10">
        <Pressable
          className="w-11 h-11 items-center justify-center rounded-full active:opacity-70"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close image viewer"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>

        <Text className="font-sans-medium text-sm text-white flex-1 text-center" numberOfLines={1}>
          {filename}
        </Text>

        <Pressable
          className="w-11 h-11 items-center justify-center rounded-full active:opacity-70"
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel={`Share ${filename}`}
        >
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Image */}
      <View className="flex-1 items-center justify-center">
        <Image
          source={{ uri: fileUrl }}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 }}
          contentFit="contain"
          transition={300}
          recyclingKey={blobId}
          accessibilityLabel={`Full-size image: ${filename}`}
        />
      </View>
    </View>
  )
}

export { ImageViewer }
export type { ImageViewerProps }
