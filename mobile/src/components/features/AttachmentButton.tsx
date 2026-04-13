/**
 * Attachment button with action sheet.
 *
 * Presents a "Take Photo" / "Choose from Gallery" action sheet and
 * triggers upload via the useUploadAttachment hook. Used in MessageInput
 * and IssueDetail.
 */

import { useCallback } from 'react'
import { Pressable, ActionSheetIOS, Platform, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useImagePicker } from '@/hooks/useImagePicker'
import { useUploadAttachment } from '@/hooks/useAttachments'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AttachmentButtonProps {
  /** Called with the blob ID after a successful upload. */
  onUploaded?: (blobId: string) => void
  /** Icon color override. */
  color?: string
  /** Icon size override. */
  size?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AttachmentButton({
  onUploaded,
  color = '#77818B',
  size = 22,
}: AttachmentButtonProps): React.ReactNode {
  const { pickFromGallery, pickFromCamera, isPicking } = useImagePicker()
  const { upload, hasActive } = useUploadAttachment()

  const handlePickAndUpload = useCallback(
    async (picker: () => Promise<{ uri: string; filename: string; mimeType: string } | null>) => {
      const image = await picker()
      if (image == null) return

      const blobId = await upload(image.uri, image.filename, image.mimeType)
      if (blobId != null) {
        onUploaded?.(blobId)
      }
    },
    [upload, onUploaded]
  )

  const handlePress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            void handlePickAndUpload(pickFromCamera)
          } else if (buttonIndex === 2) {
            void handlePickAndUpload(pickFromGallery)
          }
        }
      )
    } else {
      // Android: use Alert as a simple action sheet
      Alert.alert(
        'Add Attachment',
        undefined,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Take Photo',
            onPress: () => { void handlePickAndUpload(pickFromCamera) },
          },
          {
            text: 'Choose from Gallery',
            onPress: () => { void handlePickAndUpload(pickFromGallery) },
          },
        ]
      )
    }
  }, [handlePickAndUpload, pickFromCamera, pickFromGallery])

  const isDisabled = isPicking || hasActive

  return (
    <Pressable
      className="w-11 h-11 items-center justify-center rounded-full active:opacity-70"
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel="Add attachment"
      accessibilityHint="Opens options to take a photo or choose from gallery"
      accessibilityState={{ disabled: isDisabled }}
    >
      <Ionicons
        name="attach"
        size={size}
        color={isDisabled ? '#4E535B' : color}
      />
    </Pressable>
  )
}

export { AttachmentButton }
export type { AttachmentButtonProps }
