/**
 * Offline mutation queue store.
 *
 * Holds serialized Huly mutations that failed to reach the server because
 * the device was offline (or the Huly client wasn't connected). Persists to
 * AsyncStorage so the queue survives app restarts; replays in order once
 * connectivity returns.
 *
 * Each entry is a pure, JSON-serializable description of the operation.
 * No live Huly types — we rely on the runtime-available class/ref strings
 * at replay time to reconstruct the tx.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type QueuedMutationKind = 'create' | 'update' | 'remove'

export interface QueuedCreate {
  id: string
  kind: 'create'
  enqueuedAt: number
  _class: string
  space: string
  data: Record<string, unknown>
  objectId?: string
}

export interface QueuedUpdate {
  id: string
  kind: 'update'
  enqueuedAt: number
  _class: string
  space: string
  objectId: string
  operations: Record<string, unknown>
}

export interface QueuedRemove {
  id: string
  kind: 'remove'
  enqueuedAt: number
  _class: string
  space: string
  objectId: string
}

export type QueuedMutation = QueuedCreate | QueuedUpdate | QueuedRemove

export interface MutationConflict {
  id: string
  mutation: QueuedMutation
  error: string
}

interface OfflineState {
  queue: QueuedMutation[]
  replaying: boolean
  conflicts: MutationConflict[]
  enqueue: (m: Omit<QueuedMutation, 'id' | 'enqueuedAt'> & { id?: string }) => string
  dequeue: (id: string) => void
  setReplaying: (v: boolean) => void
  recordConflict: (c: MutationConflict) => void
  resolveConflict: (id: string, action: 'discard' | 'retry') => QueuedMutation | null
  clearAll: () => void
}

// Seed with a random offset so two consecutive-millisecond enqueues across
// restarts don't collide on the `m-<date>-<counter>` id.
let idCounter = Math.floor(Math.random() * 1e6)
function nextId(): string {
  idCounter = (idCounter + 1) >>> 0
  return `m-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      queue: [],
      replaying: false,
      conflicts: [],
      enqueue: (m) => {
        const id = m.id ?? nextId()
        const entry = { ...m, id, enqueuedAt: Date.now() } as QueuedMutation
        set((s) => ({ queue: [...s.queue, entry] }))
        return id
      },
      dequeue: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),
      setReplaying: (v) => set({ replaying: v }),
      recordConflict: (c) =>
        set((s) => ({
          conflicts: [...s.conflicts.filter((x) => x.id !== c.id), c],
          queue: s.queue.filter((q) => q.id !== c.id),
        })),
      resolveConflict: (id, action) => {
        const conflict = get().conflicts.find((c) => c.id === id) ?? null
        set((s) => ({ conflicts: s.conflicts.filter((c) => c.id !== id) }))
        if (conflict == null) return null
        if (action === 'retry') {
          set((s) => ({ queue: [...s.queue, conflict.mutation] }))
          return conflict.mutation
        }
        return null
      },
      clearAll: () => set({ queue: [], conflicts: [] }),
    }),
    {
      name: 'huly.offline-queue.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ queue: s.queue, conflicts: s.conflicts }),
    },
  ),
)
