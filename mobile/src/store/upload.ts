/**
 * Upload progress Zustand store.
 *
 * Tracks upload state for file attachments. Each upload has a unique ID
 * and progresses through: pending -> uploading -> completed | failed.
 * This is client-only state (not server data), so Zustand is correct.
 */

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed'

export interface UploadEntry {
  id: string
  filename: string
  mimeType: string
  localUri: string
  status: UploadStatus
  /** 0-1 progress fraction. Set to 1 on complete. */
  progress: number
  /** Datalake blob ID after successful upload. */
  blobId: string | null
  /** Error message if failed. */
  error: string | null
  /** Timestamp when the upload was started. */
  startedAt: number
  /** Timestamp when the upload completed or failed. */
  completedAt: number | null
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface UploadState {
  uploads: Map<string, UploadEntry>

  startUpload: (id: string, filename: string, mimeType: string, localUri: string) => void
  updateProgress: (id: string, progress: number) => void
  completeUpload: (id: string, blobId: string) => void
  failUpload: (id: string, error: string) => void
  removeUpload: (id: string) => void
  clearCompleted: () => void
  hasActiveUploads: () => boolean
  getUploadsByStatus: (status: UploadStatus) => UploadEntry[]
}

export const useUploadStore = create<UploadState>((set, get) => ({
  uploads: new Map<string, UploadEntry>(),

  startUpload: (id, filename, mimeType, localUri) => {
    set((state) => {
      const next = new Map(state.uploads)
      next.set(id, {
        id,
        filename,
        mimeType,
        localUri,
        status: 'pending',
        progress: 0,
        blobId: null,
        error: null,
        startedAt: Date.now(),
        completedAt: null,
      })
      return { uploads: next }
    })
  },

  updateProgress: (id, progress) => {
    set((state) => {
      const entry = state.uploads.get(id)
      if (entry == null) return state
      const next = new Map(state.uploads)
      next.set(id, { ...entry, status: 'uploading', progress: Math.min(progress, 1) })
      return { uploads: next }
    })
  },

  completeUpload: (id, blobId) => {
    set((state) => {
      const entry = state.uploads.get(id)
      if (entry == null) return state
      const next = new Map(state.uploads)
      next.set(id, {
        ...entry,
        status: 'completed',
        progress: 1,
        blobId,
        completedAt: Date.now(),
      })
      return { uploads: next }
    })
  },

  failUpload: (id, error) => {
    set((state) => {
      const entry = state.uploads.get(id)
      if (entry == null) return state
      const next = new Map(state.uploads)
      next.set(id, {
        ...entry,
        status: 'failed',
        error,
        completedAt: Date.now(),
      })
      return { uploads: next }
    })
  },

  removeUpload: (id) => {
    set((state) => {
      const next = new Map(state.uploads)
      next.delete(id)
      return { uploads: next }
    })
  },

  clearCompleted: () => {
    set((state) => {
      const next = new Map(state.uploads)
      const toDelete: string[] = []
      for (const [key, entry] of next) {
        if (entry.status === 'completed') toDelete.push(key)
      }
      for (const key of toDelete) next.delete(key)
      return { uploads: next }
    })
  },

  hasActiveUploads: () => {
    const { uploads } = get()
    for (const entry of uploads.values()) {
      if (entry.status === 'pending' || entry.status === 'uploading') {
        return true
      }
    }
    return false
  },

  getUploadsByStatus: (status) => {
    const { uploads } = get()
    const result: UploadEntry[] = []
    for (const entry of uploads.values()) {
      if (entry.status === status) {
        result.push(entry)
      }
    }
    return result
  },
}))
