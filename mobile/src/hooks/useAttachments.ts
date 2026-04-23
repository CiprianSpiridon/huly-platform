/**
 * Attachment hooks.
 *
 * useUploadAttachment: orchestrates file upload with progress tracking
 * via the upload store and attachment repository.
 *
 * useAttachmentUrl: builds authenticated URLs for blob display.
 */

import { useCallback, useMemo } from 'react'

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'

import {
  uploadFile,
  getLocalFileSize,
  getAuthenticatedFileSource,
  getAuthenticatedThumbnailSource,
  getAttachments,
  deleteAttachment,
  type AttachmentMeta,
  type AuthenticatedImageSource,
  type DeleteAttachmentParams,
} from '@/repositories/attachment'
import { useUploadStore } from '@/store/upload'
import type { UploadEntry, UploadStatus } from '@/store/upload'
import { useAuthStore } from '@/store/auth'
import { useConnectionStore } from '@/store/connection'
import { showErrorToast } from '@/store/toast'
import { useShallow } from 'zustand/react/shallow'

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
  const uploads = useUploadStore(useShallow((s) => [...s.uploads.values()]))
  const hasActive = useUploadStore((s) => {
    for (const e of s.uploads.values()) {
      if (e.status === 'pending' || e.status === 'uploading') return true
    }
    return false
  })

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
  /** Source for the full-size file, safe to pass directly to `<Image source={...} />`. */
  fileSource: AuthenticatedImageSource
  /** Source for the thumbnail, safe to pass directly to `<Image source={...} />`. */
  thumbnailSource: AuthenticatedImageSource
  /**
   * @deprecated Use `fileSource` instead — this field omits the auth header
   * and will 401 without it. Retained to keep compile compatibility during
   * the migration.
   */
  fileUrl: string
  /**
   * @deprecated Use `thumbnailSource` instead.
   */
  thumbnailUrl: string
}

/**
 * Hook to get authenticated file and thumbnail sources for a blob ID.
 *
 * Returns `{ uri, headers }` objects suitable for `<Image source={...} />`
 * (both React Native's built-in Image and expo-image). The Authorization
 * header carries the workspace JWT, so the token is never leaked into the
 * image cache key, HTTP logs, or Sentry breadcrumbs.
 */
export function useAttachmentUrl(
  blobId: string,
  thumbnailWidth: number = 200,
  thumbnailHeight: number = 200
): UseAttachmentUrlReturn {
  const token = useAuthStore((s) => s.token)

  const fileSource = useMemo(
    () => getAuthenticatedFileSource(blobId),
    // token is part of the returned headers, so rebuild the source whenever
    // it changes (e.g. after re-login).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blobId, token]
  )
  const thumbnailSource = useMemo(
    () => getAuthenticatedThumbnailSource(blobId, thumbnailWidth, thumbnailHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blobId, thumbnailWidth, thumbnailHeight, token]
  )

  return {
    fileSource,
    thumbnailSource,
    fileUrl: fileSource.uri,
    thumbnailUrl: thumbnailSource.uri,
  }
}

// ---------------------------------------------------------------------------
// useDocAttachments -- fetch attachment docs for a parent document
// ---------------------------------------------------------------------------

const ATTACHMENTS_STALE_TIME = 30_000   // 30 seconds
const ATTACHMENTS_GC_TIME = 5 * 60_000  // 5 minutes

/**
 * Hook to fetch attachment documents for a given parent doc (e.g. an Issue).
 * Queries `attachment:class:Attachment` with `{ attachedTo: docId }`.
 */
export function useDocAttachments(
  docId: string | undefined
): UseQueryResult<AttachmentMeta[], Error> {
  const clientReady = useConnectionStore((s) => s.status === 'connected')
  return useQuery<AttachmentMeta[], Error>({
    queryKey: ['attachments', docId],
    queryFn: () => getAttachments(docId!),
    staleTime: ATTACHMENTS_STALE_TIME,
    gcTime: ATTACHMENTS_GC_TIME,
    enabled: docId !== undefined && clientReady,
  })
}

// ---------------------------------------------------------------------------
// useUploadsByStatus
// ---------------------------------------------------------------------------

/**
 * Select uploads filtered by status. Returns a stable reference when the
 * filtered set has not changed.
 */
export function useUploadsByStatus(status: UploadStatus): UploadEntry[] {
  return useUploadStore(useShallow((s) => [...s.uploads.values()].filter(e => e.status === status)))
}

// ---------------------------------------------------------------------------
// useDeleteAttachment -- TxRemoveDoc on an Attachment
// ---------------------------------------------------------------------------

/**
 * Hook to delete an attachment via TxRemoveDoc.
 *
 * Variables shape `{_id, space, attachedTo}` mirrors `useUpdateProject`'s
 * variables-on-mutate pattern. On success, invalidates the
 * `['attachments', attachedTo]` query the caller renders from. On error,
 * surfaces the wrapped error via the global toast and leaves the UI in
 * its current state (no silent desync).
 */
export function useDeleteAttachment(): UseMutationResult<void, Error, DeleteAttachmentParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteAttachmentParams>({
    mutationFn: async (params) => {
      await deleteAttachment(params)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['attachments', variables.attachedTo],
      })
    },
    onError: (err) => {
      showErrorToast(err)
    },
  })
}
