/**
 * Attachment hooks.
 *
 * useUploadAttachment: orchestrates file upload with progress tracking
 * via the upload store and attachment repository.
 *
 * useAttachmentUrl: builds authenticated URLs for blob display.
 */

import { useCallback, useMemo } from 'react'

import { uploadFile, getLocalFileSize, getAuthenticatedFileUrl, getAuthenticatedThumbnailUrl } from '@/repositories/attachment'
import { useUploadStore } from '@/store/upload'
import type { UploadEntry, UploadStatus } from '@/store/upload'

// ---------------------------------------------------------------------------
// useUploadAttachment
// ---------------------------------------------------------------------------

interface UseUploadAttachmentReturn {
  upload: (localUri: string, filename: string, mimeType: string) => Promise<string | null>
  uploads: UploadEntry[]
  hasActive: boolean
  clearCompleted: () => void
}

let uploadCounter = 0

/**
 * Hook for uploading file attachments with store-tracked progress.
 *
 * Returns an `upload` function that:
 * 1. Registers the upload in the store (pending)
 * 2. Reads local file size for potential progress estimation
 * 3. Calls the attachment repository to upload
 * 4. Updates store to completed/failed
 *
 * Returns the blob ID on success, null on failure.
 */
export function useUploadAttachment(): UseUploadAttachmentReturn {
  const startUpload = useUploadStore((s) => s.startUpload)
  const updateProgress = useUploadStore((s) => s.updateProgress)
  const completeUpload = useUploadStore((s) => s.completeUpload)
  const failUpload = useUploadStore((s) => s.failUpload)
  const clearCompleted = useUploadStore((s) => s.clearCompleted)
  const uploads = useUploadStore((s) => [...s.uploads.values()])
  const hasActiveUploads = useUploadStore((s) => s.hasActiveUploads)

  const hasActive = hasActiveUploads()

  const upload = useCallback(
    async (localUri: string, filename: string, mimeType: string): Promise<string | null> => {
      const id = `upload_${Date.now()}_${(uploadCounter++).toString()}`

      startUpload(id, filename, mimeType, localUri)

      try {
        // Get file size for progress estimation
        await getLocalFileSize(localUri)

        // Mark as uploading (expo-file-system uploadAsync does not give
        // progress callbacks, so we go straight to "uploading" at 0.5)
        updateProgress(id, 0.5)

        const result = await uploadFile(localUri, filename, mimeType)

        completeUpload(id, result.uuid)
        return result.uuid
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed'
        failUpload(id, message)
        return null
      }
    },
    [startUpload, updateProgress, completeUpload, failUpload]
  )

  return { upload, uploads, hasActive, clearCompleted }
}

// ---------------------------------------------------------------------------
// useAttachmentUrl
// ---------------------------------------------------------------------------

interface UseAttachmentUrlReturn {
  fileUrl: string
  thumbnailUrl: string
}

/**
 * Hook to get authenticated file and thumbnail URLs for a blob ID.
 * URLs include the auth token as a query parameter for expo-image compatibility.
 */
export function useAttachmentUrl(
  blobId: string,
  thumbnailWidth: number = 200,
  thumbnailHeight: number = 200
): UseAttachmentUrlReturn {
  const fileUrl = useMemo(() => getAuthenticatedFileUrl(blobId), [blobId])
  const thumbnailUrl = useMemo(
    () => getAuthenticatedThumbnailUrl(blobId, thumbnailWidth, thumbnailHeight),
    [blobId, thumbnailWidth, thumbnailHeight]
  )

  return { fileUrl, thumbnailUrl }
}

// ---------------------------------------------------------------------------
// useUploadsByStatus
// ---------------------------------------------------------------------------

/**
 * Select uploads filtered by status. Returns a stable reference when the
 * filtered set has not changed.
 */
export function useUploadsByStatus(status: UploadStatus): UploadEntry[] {
  return useUploadStore((s) => s.getUploadsByStatus(status))
}
