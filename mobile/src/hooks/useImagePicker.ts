/**
 * Image picker hook.
 *
 * Wraps expo-image-picker for camera and gallery access with permission
 * handling. Shows an alert with a link to Settings when permission is denied.
 */

import { useState, useCallback } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Alert, Linking } from 'react-native'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PickedImage {
  uri: string
  filename: string
  mimeType: string
  width: number
  height: number
  fileSize: number | undefined
}

interface UseImagePickerReturn {
  pickFromGallery: () => Promise<PickedImage | null>
  pickFromCamera: () => Promise<PickedImage | null>
  isPicking: boolean
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

function showPermissionDeniedAlert(type: 'camera' | 'photos'): void {
  const label = type === 'camera' ? 'camera' : 'photo library'
  Alert.alert(
    'Permission needed',
    `Please allow access to your ${label} in Settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => { void Linking.openSettings() } },
    ]
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useImagePicker(): UseImagePickerReturn {
  const [isPicking, setIsPicking] = useState(false)

  const pickFromGallery = useCallback(async (): Promise<PickedImage | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      showPermissionDeniedAlert('photos')
      return null
    }

    setIsPicking(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        exif: false,
      })

      if (result.canceled || result.assets.length === 0) {
        return null
      }

      const asset = result.assets[0]
      if (asset == null) return null

      return {
        uri: asset.uri,
        filename: asset.fileName ?? `image_${Date.now().toString()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
      }
    } finally {
      setIsPicking(false)
    }
  }, [])

  const pickFromCamera = useCallback(async (): Promise<PickedImage | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()

    if (!permission.granted) {
      showPermissionDeniedAlert('camera')
      return null
    }

    setIsPicking(true)
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        exif: false,
      })

      if (result.canceled || result.assets.length === 0) {
        return null
      }

      const asset = result.assets[0]
      if (asset == null) return null

      return {
        uri: asset.uri,
        filename: asset.fileName ?? `photo_${Date.now().toString()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
      }
    } finally {
      setIsPicking(false)
    }
  }, [])

  return { pickFromGallery, pickFromCamera, isPicking }
}
