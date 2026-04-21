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
import { getClient } from '@/client'
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

    // The Datalake returns an array of { key, id, metadata } objects.
    // Normalize to our UploadResult shape.
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0] as Record<string, unknown>
      return {
        uuid: String(first.id ?? first.key ?? ''),
        name: filename,
        size: typeof first.metadata === 'object' && first.metadata != null
          ? (first.metadata as Record<string, unknown>).size as number ?? 0
          : 0,
        contentType: mimeType,
      }
    }

    // Fallback: try single-object format
    if (isUploadResult(parsed)) {
      return parsed
    }

    throw new Error('Invalid upload response format')
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
    const url = getFileUrl(config, blobId, getWorkspaceId())
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
 * Authenticated image source for RN `<Image source={...} />` / expo-image.
 *
 * Uses an Authorization header instead of a query-string token so the JWT
 * doesn't leak into expo-image disk caches, HTTP Referer, server logs, or
 * Sentry breadcrumbs (where query strings on datalake hosts are not covered
 * by the workspace-URL scrubber).
 */
export interface AuthenticatedImageSource {
  uri: string
  headers: Record<string, string>
}

function buildAuthHeaders(token: string | null): Record<string, string> {
  return token != null ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Build an authenticated download source for display.
 *
 * Prefer this over {@link getAuthenticatedFileUrl} for any `<Image>` render.
 */
export function getAuthenticatedFileSource(blobId: string): AuthenticatedImageSource {
  const config = getConfig()
  const token = useAuthStore.getState().token
  const uri = getFileUrl(config, blobId, getWorkspaceId())
  return { uri, headers: buildAuthHeaders(token) }
}

/**
 * Build an authenticated thumbnail source for image previews.
 */
export function getAuthenticatedThumbnailSource(
  blobId: string,
  width: number = 200,
  height: number = 200
): AuthenticatedImageSource {
  const config = getConfig()
  const token = useAuthStore.getState().token
  const uri = getThumbnailUrl(config, blobId, getWorkspaceId(), width, height)
  return { uri, headers: buildAuthHeaders(token) }
}

/**
 * @deprecated Use {@link getAuthenticatedFileSource} instead.
 * Kept for backwards compatibility; the returned URL does NOT contain a token
 * and requires an Authorization header at the fetch site.
 */
export function getAuthenticatedFileUrl(blobId: string): string {
  const config = getConfig()
  return getFileUrl(config, blobId, getWorkspaceId())
}

/**
 * @deprecated Use {@link getAuthenticatedThumbnailSource} instead.
 */
export function getAuthenticatedThumbnailUrl(
  blobId: string,
  width: number = 200,
  height: number = 200
): string {
  const config = getConfig()
  return getThumbnailUrl(config, blobId, getWorkspaceId(), width, height)
}

// ---------------------------------------------------------------------------
// Fetch attachments for a document
// ---------------------------------------------------------------------------

/**
 * Huly class ref for the Attachment class.
 * Declared as a plain string to avoid value-importing @hcengineering/attachment
 * which is blocked by the Metro resolver (svelte transitive deps).
 */
const ATTACHMENT_CLASS = 'attachment:class:Attachment' as import('@hcengineering/core').Ref<
  import('@hcengineering/core').Class<import('@hcengineering/core').Doc>
>

/**
 * Fetch all attachment documents attached to a given parent doc.
 * Returns metadata needed for the UI (blob ID, name, size, content type).
 */
export async function getAttachments(
  attachedTo: string
): Promise<AttachmentMeta[]> {
  const client = getClient()
  if (client === null) {
    throw new Error('HulyClient not connected')
  }

  try {
    const result = await client.findAll(
      ATTACHMENT_CLASS,
      { attachedTo } as Record<string, unknown>,
      { limit: 100 }
    )

    return [...result].map((doc): AttachmentMeta => {
      const record = doc as unknown as Record<string, unknown>
      return {
        blobId: String(record.file ?? record.uuid ?? record._id ?? ''),
        name: String(record.name ?? record.filename ?? 'file'),
        size: Number(record.size ?? 0),
        contentType: String(record.contentType ?? record.type ?? 'application/octet-stream'),
        lastModified: Number(record.lastModified ?? record.modifiedOn ?? 0),
      }
    })
  } catch (error) {
    throw wrapRepositoryError('attachment', 'getAttachments', error)
  }
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
