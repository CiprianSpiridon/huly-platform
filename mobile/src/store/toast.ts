/**
 * Global toast store.
 *
 * Lightweight Zustand store for queued, auto-dismissing toasts.
 * Use `showErrorToast()` / `showInfoToast()` / `showSuccessToast()` from any
 * place in the app — the ErrorToast component renders from this store.
 */

import { create } from 'zustand'

export type ToastKind = 'error' | 'info' | 'success'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
  /** Optional extra detail (shown subdued). */
  detail?: string
  /** Milliseconds before auto-dismiss. */
  durationMs: number
}

interface ToastState {
  queue: Toast[]
  push: (t: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }) => string
  dismiss: (id: string) => void
  clear: () => void
}

export const DEFAULT_TOAST_DURATION_MS = 4_000

let idCounter = 0
function nextId(): string {
  idCounter = (idCounter + 1) >>> 0
  return `toast-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

export const useToastStore = create<ToastState>((set) => ({
  queue: [],
  push: (t) => {
    const id = nextId()
    const toast: Toast = {
      id,
      kind: t.kind,
      message: t.message,
      ...(t.detail != null ? { detail: t.detail } : {}),
      durationMs: t.durationMs ?? DEFAULT_TOAST_DURATION_MS,
    }
    set((s) => ({ queue: [...s.queue, toast] }))
    return id
  },
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((t) => t.id !== id) })),
  clear: () => set({ queue: [] }),
}))

function friendlyMessage(err: unknown): { message: string, detail?: string } {
  if (err == null) return { message: 'Something went wrong' }
  if (err instanceof Error) {
    return { message: err.message.length > 0 ? err.message : 'Something went wrong' }
  }
  if (typeof err === 'string') return { message: err }
  return { message: 'Something went wrong' }
}

export function showErrorToast(err: unknown, fallbackMessage?: string): string {
  const { message, detail } = friendlyMessage(err)
  return useToastStore.getState().push({
    kind: 'error',
    message: fallbackMessage ?? message,
    ...(detail != null ? { detail } : {}),
  })
}

export function showInfoToast(message: string, detail?: string): string {
  return useToastStore.getState().push({
    kind: 'info',
    message,
    ...(detail != null ? { detail } : {}),
  })
}

export function showSuccessToast(message: string, detail?: string): string {
  return useToastStore.getState().push({
    kind: 'success',
    message,
    ...(detail != null ? { detail } : {}),
  })
}
