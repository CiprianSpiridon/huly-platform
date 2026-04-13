/**
 * Attachment repository.
 *
 * Handles file upload to the Huly datalake via expo-file-system (multipart),
 * file download to local cache, and sharing. Does NOT import
 * @hcengineering/attachment (blocked by Metro) -- uses type-only references
 * and REST endpoints directly.
 */

import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { getConfig } from '@/client/config'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { getFileUrl, getThumbnailUrl } from '@/lib/files'
import { wrapRepositoryError } from './base'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadResult {
  uuid: string
  name: string
  size: number
  contentType: string
}

export interface AttachmentMeta {
  blobId: string
  name: string
  size: number
  contentType: string
  lastModified: number
}

export interface UploadProgressCallback {
  (progress: number): void
}

// ---------------------------------------------------------------------------
// Auth helpers (read Zustand outside React)
// ---------------------------------------------------------------------------

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  if (token == null) {
    throw new Error('Not authenticated')
  }
  return { Authorization: `Bearer ${token}` }
}

function getWorkspaceId(): string {
  const workspace = useWorkspaceStore.getState().selectedWorkspace
  if (workspace == null) {
    throw new Error('No workspace selected')
  }
  return workspace
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Upload a local file to the Huly datalake.
 *
 * Uses expo-file-system `uploadAsync` for multipart form upload.
 * The datalake endpoint is `{UPLOAD_URL}` from ServerConfig.
 *
 * NOTE: `expo-file-system.uploadAsync` does not support onProgress callbacks.
 * For progress tracking we use a two-phase approach:
 * 1. Get file info for size
 * 2. Upload and resolve when complete
 * The upload store tracks per-file state (pending/complete/error).
 */
export async function uploadFile(
  localUri: string,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  try {
    const config = getConfig()
    const headers = getAuthHeaders()
    const workspace = getWorkspaceId()

    // The UPLOAD_URL may have placeholders; for form-data upload we use it directly
    const uploadUrl = config.UPLOAD_URL

    const result = await FileSystem.uploadAsync(
      uploadUrl,
      localUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        parameters: {
          workspace,
          name: filename,
        },
        headers,
        mimeType,
      }
    )

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload failed with status ${result.status.toString()}`)
    }

    const parsed: unknown = JSON.parse(result.body)
    if (!isUploadResult(parsed)) {
      throw new Error('Invalid upload response format')
    }

    return parsed
  } catch (error) {
    throw wrapRepositoryError('attachment', 'uploadFile', error)
  }
}

/**
 * Get the file info (size) of a local file for progress estimation.
 */
export async function getLocalFileSize(localUri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(localUri)
  if (!info.exists) {
    throw new Error(`File not found: ${localUri}`)
  }
  return info.size ?? 0
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Download a file from the datalake to the local cache directory.
 * Returns the local file URI.
 */
export async function downloadFile(
  blobId: string,
  filename: string
): Promise<string> {
  try {
    const config = getConfig()
    const headers = getAuthHeaders()
    const url = getFileUrl(config, blobId)
    const localPath = `${FileSystem.cacheDirectory ?? ''}${filename}`

    const result = await FileSystem.downloadAsync(url, localPath, { headers })

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Download failed with status ${result.status.toString()}`)
    }

    return result.uri
  } catch (error) {
    throw wrapRepositoryError('attachment', 'downloadFile', error)
  }
}

/**
 * Download a file and open the native share sheet.
 */
export async function downloadAndShare(
  blobId: string,
  filename: string
): Promise<void> {
  const localPath = await downloadFile(blobId, filename)
  const canShare = await Sharing.isAvailableAsync()
  if (canShare) {
    await Sharing.shareAsync(localPath)
  }
}

// ---------------------------------------------------------------------------
// URL builders (for components that need authenticated image URLs)
// ---------------------------------------------------------------------------

/**
 * Build an authenticated download URL with token as query param.
 * Used for expo-image source URIs where custom headers are not supported.
 */
export function getAuthenticatedFileUrl(blobId: string): string {
  const config = getConfig()
  const token = useAuthStore.getState().token
  const url = getFileUrl(config, blobId)
  return token != null ? `${url}?token=${encodeURIComponent(token)}` : url
}

/**
 * Build an authenticated thumbnail URL for image previews.
 */
export function getAuthenticatedThumbnailUrl(
  blobId: string,
  width: number = 200,
  height: number = 200
): string {
  const config = getConfig()
  const token = useAuthStore.getState().token
  const url = getThumbnailUrl(config, blobId, width, height)
  return token != null ? `${url}&token=${encodeURIComponent(token)}` : url
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function isUploadResult(data: unknown): data is UploadResult {
  if (typeof data !== 'object' || data === null) return false
  const r = data as Record<string, unknown>
  return (
    typeof r.uuid === 'string' &&
    typeof r.name === 'string' &&
    typeof r.size === 'number' &&
    typeof r.contentType === 'string'
  )
}
