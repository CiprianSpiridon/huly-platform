/**
 * Attachment thumbnail component.
 *
 * Displays a compact preview of a file attachment. Images show a thumbnail;
 * non-image files show an icon with filename. Pressable to open the viewer.
 */

import { memo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'

import { useAttachmentUrl } from '@/hooks/useAttachments'
import { formatFileSize } from '@/lib/format'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AttachmentThumbnailProps {
  blobId: string
  filename: string
  mimeType: string
  size: number
  onPress: (blobId: string, filename: string, mimeType: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image-outline'
  if (mimeType === 'application/pdf') return 'document-text-outline'
  if (mimeType.startsWith('video/')) return 'videocam-outline'
  if (mimeType.startsWith('audio/')) return 'musical-notes-outline'
  return 'document-outline'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AttachmentThumbnailInner({
  blobId,
  filename,
  mimeType,
  size,
  onPress,
}: AttachmentThumbnailProps): React.ReactNode {
  const isImage = mimeType.startsWith('image/')
  const { thumbnailUrl } = useAttachmentUrl(blobId)

  const handlePress = useCallback(() => {
    onPress(blobId, filename, mimeType)
  }, [blobId, filename, mimeType, onPress])

  return (
    <Pressable
      className="bg-surface-tertiary rounded-md overflow-hidden active:opacity-80 w-[140px]"
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Attachment: ${filename}, ${formatFileSize(size)}`}
    >
      {isImage ? (
        <Image
          source={{ uri: thumbnailUrl }}
          className="w-full h-[100px]"
          contentFit="cover"
          transition={300}
          recyclingKey={blobId}
        />
      ) : (
        <View className="w-full h-[100px] items-center justify-center bg-surface-secondary">
          <Ionicons name={getFileIcon(mimeType) as 'document-outline'} size={32} color="#77818B" />
        </View>
      )}
      <View className="p-2">
        <Text className="font-sans-medium text-xs text-content-primary" numberOfLines={1}>
          {filename}
        </Text>
        <Text className="font-sans text-xs text-content-tertiary">
          {formatFileSize(size)}
        </Text>
      </View>
    </Pressable>
  )
}

const AttachmentThumbnail = memo(AttachmentThumbnailInner)

export { AttachmentThumbnail }
export type { AttachmentThumbnailProps }
