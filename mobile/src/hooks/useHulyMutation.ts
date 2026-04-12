/**
 * Generic Huly mutation hooks.
 *
 * Provides `useHulyCreate`, `useHulyUpdate`, and `useHulyRemove` that
 * automatically invalidate matching queries on success.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'
import {
  TxFactory,
  type Class,
  type Data,
  type Doc,
  type DocumentUpdate,
  type PersonId,
  type Ref,
  type Space,
  type TxResult,
} from '@hcengineering/core'

import { getClient } from '@/client'

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
 * Create a new document via the REST tx endpoint.
 *
 * On success, invalidates all `['huly', _class, ...]` queries.
 */
export function useHulyCreate<T extends Doc> (): UseMutationResult<
  Ref<T>,
  Error,
  HulyCreateParams<T>
> {
  const queryClient = useQueryClient()

  return useMutation<Ref<T>, Error, HulyCreateParams<T>>({
    mutationFn: async (params) => {
      const client = getClient()
      if (client === null) {
        throw new Error('HulyClient not connected')
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
    onSuccess: (_data, variables) => {
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
    onSuccess: (_data, variables) => {
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
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          return key[0] === 'huly' && key[1] === variables._class
        },
      })
    },
  })
}
