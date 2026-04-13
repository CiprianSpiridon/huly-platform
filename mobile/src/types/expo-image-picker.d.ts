/**
 * Type declarations for expo-image-picker.
 *
 * The package is listed in package.json but may not be hoisted to the
 * local node_modules in Rush. At runtime it is resolved via Metro's
 * configured nodeModulesPaths (common/temp/node_modules).
 */

declare module 'expo-image-picker' {
  export interface PermissionResponse {
    granted: boolean
    status: 'granted' | 'denied' | 'undetermined'
    canAskAgain: boolean
    expires: 'never' | number
  }

  export interface ImagePickerAsset {
    uri: string
    width: number
    height: number
    type?: 'image' | 'video'
    fileName?: string | null
    fileSize?: number
    mimeType?: string | null
    exif?: Record<string, unknown> | null
    base64?: string | null
    duration?: number | null
    assetId?: string | null
  }

  export interface ImagePickerResult {
    canceled: boolean
    assets: ImagePickerAsset[]
  }

  export type MediaType = 'images' | 'videos' | 'livePhotos'

  export interface ImagePickerOptions {
    mediaTypes?: MediaType[]
    quality?: number
    allowsEditing?: boolean
    allowsMultipleSelection?: boolean
    selectionLimit?: number
    aspect?: [number, number]
    exif?: boolean
    base64?: boolean
    videoMaxDuration?: number
    videoQuality?: number
    presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'currentContext' | 'overFullScreen' | 'overCurrentContext' | 'popover'
    orderedSelection?: boolean
    cameraType?: 'front' | 'back'
  }

  export function requestMediaLibraryPermissionsAsync(): Promise<PermissionResponse>
  export function requestCameraPermissionsAsync(): Promise<PermissionResponse>
  export function getMediaLibraryPermissionsAsync(): Promise<PermissionResponse>
  export function getCameraPermissionsAsync(): Promise<PermissionResponse>

  export function launchImageLibraryAsync(
    options?: ImagePickerOptions
  ): Promise<ImagePickerResult>

  export function launchCameraAsync(
    options?: ImagePickerOptions
  ): Promise<ImagePickerResult>
}
