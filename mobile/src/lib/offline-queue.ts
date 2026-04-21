/**
 * Offline mutation queue replay + online detection.
 *
 * Bridges the Zustand `useOfflineStore` to the live HulyClient and NetInfo.
 * Exposes:
 *  - `installOfflineQueueWatcher()` — call once at app startup to auto-replay
 *    when connectivity returns.
 *  - `replayQueue()` — manual trigger (used after login/workspace swap).
 *  - `isDeviceOnline()` — quick sync check for gating mutations at call sites.
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'
import {
  TxFactory,
  type Class,
  type Data,
  type Doc,
  type DocumentUpdate,
  type Ref,
  type Space,
} from '@hcengineering/core'

import { getClient } from '@/client'
import { queryClient } from '@/client/queryClient'
import { useOfflineStore, type QueuedMutation } from '@/store/offline'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/store/toast'

/**
 * Map a Huly `_class` reference to the TanStack Query key roots it can affect.
 * Used after replaying an offline mutation to invalidate the right caches.
 *
 * Falls back to a broad set covering all Huly-backed roots when the class
 * isn't recognized, so we never leave the UI displaying stale data after a
 * successful sync.
 */
function queryRootsFor(_class: string): readonly string[] {
  if (_class.startsWith('tracker:class:')) {
    return ['tracker', 'huly']
  }
  if (_class.startsWith('chunter:class:')) {
    return ['chat', 'notifications', 'huly']
  }
  if (_class.startsWith('notification:class:')) {
    return ['notifications', 'huly']
  }
  if (_class.startsWith('attachment:class:')) {
    return ['attachments', 'huly']
  }
  return ['tracker', 'chat', 'notifications', 'attachments', 'huly']
}

let lastOnline = false
let initialized = false

export function isDeviceOnline(): boolean {
  return lastOnline
}

export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch()
    lastOnline = state.isConnected === true && state.isInternetReachable !== false
  } catch {
    // If we can't tell, assume online — avoids false positives blocking mutations.
    lastOnline = true
  }
  initialized = true
  return lastOnline
}

/**
 * Returns true iff the device currently can reach the server AND the shared
 * Huly client is connected. Callers use this to decide whether to queue.
 *
 * Returns false until the initial NetInfo check has resolved, so mutations
 * issued during app startup are queued instead of racing against an unknown
 * network state.
 */
export function canDispatchMutationNow(): boolean {
  if (!initialized) return false
  if (!lastOnline) return false
  if (getClient() == null) return false
  return true
}

async function runMutation(m: QueuedMutation): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new Error('HulyClient not connected')
  }
  const account = await client.getAccount()
  const factory = new TxFactory(account.primarySocialId)
  if (m.kind === 'create') {
    const tx = factory.createTxCreateDoc(
      m._class as Ref<Class<Doc>>,
      m.space as Ref<Space>,
      m.data as Data<Doc>,
      m.objectId as Ref<Doc> | undefined,
    )
    await client.tx(tx)
  } else if (m.kind === 'update') {
    const tx = factory.createTxUpdateDoc(
      m._class as Ref<Class<Doc>>,
      m.space as Ref<Space>,
      m.objectId as Ref<Doc>,
      m.operations as DocumentUpdate<Doc>,
    )
    await client.tx(tx)
  } else {
    const tx = factory.createTxRemoveDoc(
      m._class as Ref<Class<Doc>>,
      m.space as Ref<Space>,
      m.objectId as Ref<Doc>,
    )
    await client.tx(tx)
  }
}

function isConflictError(err: unknown): boolean {
  if (err == null) return false
  const msg = (err as { message?: unknown }).message
  if (typeof msg !== 'string') return false
  const lower = msg.toLowerCase()
  // Classify explicit conflict/auth rejections only. "not found" is ambiguous
  // — it collides with transient network errors from REST proxies — so we
  // leave those in the queue for retry rather than promoting them to
  // user-facing conflicts.
  return (
    lower.includes('409') ||
    lower.includes('conflict') ||
    lower.includes('permission') ||
    lower.includes('forbidden')
  )
}

let replayInFlight = false

/**
 * Replay all queued mutations in FIFO order. Conflicts are moved to the
 * conflicts list for user-visible resolution. Transient errors stop the
 * replay so the next attempt (e.g. reconnect) can resume without data loss.
 */
export async function replayQueue(): Promise<{ replayed: number, conflicts: number }> {
  if (replayInFlight) return { replayed: 0, conflicts: 0 }
  replayInFlight = true

  const store = useOfflineStore.getState()
  if (store.queue.length === 0) {
    replayInFlight = false
    return { replayed: 0, conflicts: 0 }
  }
  if (!canDispatchMutationNow()) {
    replayInFlight = false
    return { replayed: 0, conflicts: 0 }
  }

  store.setReplaying(true)
  let replayed = 0
  let conflicts = 0
  try {
    // Copy a snapshot so we iterate stable FIFO order; the store mutates
    // as we dequeue, but a local snapshot avoids re-shuffling.
    const pending = [...useOfflineStore.getState().queue]
    for (const m of pending) {
      try {
        await runMutation(m)
        useOfflineStore.getState().dequeue(m.id)
        replayed += 1
        for (const root of queryRootsFor(m._class)) {
          void queryClient.invalidateQueries({ queryKey: [root] })
        }
      } catch (err) {
        if (isConflictError(err)) {
          useOfflineStore.getState().recordConflict({
            id: m.id,
            mutation: m,
            error: err instanceof Error ? err.message : 'Server rejected change',
          })
          conflicts += 1
          continue
        }
        // Transient: stop, leave in queue, next connectivity event will retry.
        showErrorToast(err, 'Unable to sync offline changes')
        break
      }
    }
  } finally {
    useOfflineStore.getState().setReplaying(false)
    replayInFlight = false
  }

  if (replayed > 0) {
    showSuccessToast(
      `Synced ${replayed} offline ${replayed === 1 ? 'change' : 'changes'}`,
    )
  }
  if (conflicts > 0) {
    showInfoToast(
      `${conflicts} offline ${conflicts === 1 ? 'change needs' : 'changes need'} attention`,
      'Open the offline banner to resolve.',
    )
  }
  return { replayed, conflicts }
}

let watcherInstalled = false
let netUnsub: (() => void) | null = null

/** Subscribe to NetInfo + Huly client readiness so the queue replays automatically. */
export function installOfflineQueueWatcher(): void {
  if (watcherInstalled) return
  watcherInstalled = true

  void checkIsOnline().then(() => {
    if (canDispatchMutationNow()) {
      void replayQueue()
    }
  })

  netUnsub = NetInfo.addEventListener((state: NetInfoState) => {
    const connected = state.isConnected === true && state.isInternetReachable !== false
    const wasOffline = !lastOnline
    lastOnline = connected
    initialized = true
    if (connected && wasOffline && canDispatchMutationNow()) {
      void replayQueue()
    }
  })
}

export function uninstallOfflineQueueWatcher(): void {
  if (netUnsub != null) {
    netUnsub()
    netUnsub = null
  }
  watcherInstalled = false
}

/**
 * Enqueue a mutation that could not be sent live. Callers should only use
 * this from the shared useHuly* hooks; screens should not touch the store
 * directly.
 */
export function enqueueMutation(m: Omit<QueuedMutation, 'id' | 'enqueuedAt'>): string {
  return useOfflineStore.getState().enqueue(m)
}
