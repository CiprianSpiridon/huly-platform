/**
 * Generic Huly mutation hooks.
 *
 * Provides `useHulyCreate`, `useHulyUpdate`, and `useHulyRemove` that
 * automatically invalidate matching queries on success.
 *
 * When the device is offline or the Huly client is not connected, the
 * mutation is serialized into the offline queue and replayed automatically
 * once connectivity returns. See `src/lib/offline-queue.ts`.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'
import {
  TxFactory,
  generateId,
  type Class,
  type Data,
  type Doc,
  type DocumentUpdate,
  type Ref,
  type Space,
  type TxResult,
} from '@hcengineering/core'

import { getClient } from '@/client'
import { canDispatchMutationNow, enqueueMutation } from '@/lib/offline-queue'

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface HulyCreateParams<T extends Doc> {
  _class: Ref<Class<T>>
  space: Ref<Space>
  data: Data<T>
  id?: Ref<T>
}

/**
 * Marker type returned from mutationFn when the mutation was queued offline.
 * The success hook checks for this to skip invalidation — invalidating after a
 * queued (not-yet-sent) mutation would evict the optimistic UI state the caller
 * wrote into the cache.
 */
interface QueuedSentinel {
  __queued: true
  objectId: string
}

function isQueuedSentinel (value: unknown): value is QueuedSentinel {
  return typeof value === 'object' && value !== null && (value as { __queued?: unknown }).__queued === true
}

/**
 * Create a new document via the REST tx endpoint.
 *
 * On success, invalidates all `['huly', _class, ...]` queries. When the
 * mutation is queued offline, skips invalidation so optimistic UI is preserved
 * until the replay completes.
 */
export function useHulyCreate<T extends Doc> (): UseMutationResult<
  Ref<T>,
  Error,
  HulyCreateParams<T>
> {
  const queryClient = useQueryClient()

  return useMutation<Ref<T>, Error, HulyCreateParams<T>>({
    mutationFn: async (params) => {
      if (!canDispatchMutationNow()) {
        // Pre-generate an id so callers can reference it even before sync.
        const objectId = (params.id ?? generateId()) as Ref<T>
        enqueueMutation({
          kind: 'create',
          _class: params._class as unknown as string,
          space: params.space as unknown as string,
          data: params.data as unknown as Record<string, unknown>,
          objectId: objectId as unknown as string,
        })
        return { __queued: true, objectId: objectId as unknown as string } as unknown as Ref<T>
      }
      const client = getClient()
      if (client === null) {
        // Connection lost between the check and now — queue instead of throwing.
        const objectId = (params.id ?? generateId()) as Ref<T>
        enqueueMutation({
          kind: 'create',
          _class: params._class as unknown as string,
          space: params.space as unknown as string,
          data: params.data as unknown as Record<string, unknown>,
          objectId: objectId as unknown as string,
        })
        return { __queued: true, objectId: objectId as unknown as string } as unknown as Ref<T>
      }
      // Use the authenticated account's PersonId for correct modifiedBy/audit metadata
      const account = await client.getAccount()
      const factory = new TxFactory(account.primarySocialId)
      const tx = factory.createTxCreateDoc(
        params._class,
        params.space,
        params.data,
        params.id
      )
      await client.tx(tx)
      return tx.objectId as Ref<T>
    },
    onSuccess: (data, variables) => {
      if (isQueuedSentinel(data)) return
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return key[0] === 'huly' && key[1] === variables._class
        },
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface HulyUpdateParams<T extends Doc> {
  _class: Ref<Class<T>>
  space: Ref<Space>
  objectId: Ref<T>
  operations: DocumentUpdate<T>
}

/**
 * Update an existing document.
 *
 * On success, invalidates all queries for the same `_class`.
 */
export function useHulyUpdate<T extends Doc> (): UseMutationResult<
  TxResult,
  Error,
  HulyUpdateParams<T>
> {
  const queryClient = useQueryClient()

  return useMutation<TxResult, Error, HulyUpdateParams<T>>({
    mutationFn: async (params) => {
      if (!canDispatchMutationNow() || getClient() === null) {
        enqueueMutation({
          kind: 'update',
          _class: params._class as unknown as string,
          space: params.space as unknown as string,
          objectId: params.objectId as unknown as string,
          operations: params.operations as unknown as Record<string, unknown>,
        })
        return { __queued: true, objectId: params.objectId as unknown as string } as unknown as TxResult
      }
      const client = getClient()
      if (client === null) {
        throw new Error('HulyClient not connected')
      }
      // Use the authenticated account's PersonId for correct modifiedBy/audit metadata
      const account = await client.getAccount()
      const factory = new TxFactory(account.primarySocialId)
      const tx = factory.createTxUpdateDoc(
        params._class,
        params.space,
        params.objectId,
        params.operations
      )
      return await client.tx(tx)
    },
    onSuccess: (data, variables) => {
      if (isQueuedSentinel(data)) return
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return key[0] === 'huly' && key[1] === variables._class
        },
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Remove
// ---------------------------------------------------------------------------

export interface HulyRemoveParams<T extends Doc> {
  _class: Ref<Class<T>>
  space: Ref<Space>
  objectId: Ref<T>
}

/**
 * Remove a document.
 *
 * On success, invalidates all queries for the same `_class`.
 */
export function useHulyRemove<T extends Doc> (): UseMutationResult<
  TxResult,
  Error,
  HulyRemoveParams<T>
> {
  const queryClient = useQueryClient()

  return useMutation<TxResult, Error, HulyRemoveParams<T>>({
    mutationFn: async (params) => {
      if (!canDispatchMutationNow() || getClient() === null) {
        enqueueMutation({
          kind: 'remove',
          _class: params._class as unknown as string,
          space: params.space as unknown as string,
          objectId: params.objectId as unknown as string,
        })
        return { __queued: true, objectId: params.objectId as unknown as string } as unknown as TxResult
      }
      const client = getClient()
      if (client === null) {
        throw new Error('HulyClient not connected')
      }
      // Use the authenticated account's PersonId for correct modifiedBy/audit metadata
      const account = await client.getAccount()
      const factory = new TxFactory(account.primarySocialId)
      const tx = factory.createTxRemoveDoc(
        params._class,
        params.space,
        params.objectId
      )
      return await client.tx(tx)
    },
    onSuccess: (data, variables) => {
      if (isQueuedSentinel(data)) return
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return key[0] === 'huly' && key[1] === variables._class
        },
      })
    },
  })
}
