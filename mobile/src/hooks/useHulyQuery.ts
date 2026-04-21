/**
 * Generic Huly query hooks.
 *
 * Wraps TanStack Query with auto-generated query keys derived from the
 * document class, query filter, and options. Screens use these instead
 * of calling repositories directly.
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import type {
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Ref,
  WithLookup,
} from '@hcengineering/core'

import { getClient } from '@/client'
import { useConnectionStore } from '@/store/connection'

// ---------------------------------------------------------------------------
// Query key helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic JSON serialization for objects used as query key segments.
 * Sorts object keys so that `{ a:1, b:2 }` and `{ b:2, a:1 }` produce
 * the same string.
 */
function stableHash (value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'object') return String(value)
  if (Array.isArray(value)) {
    return '[' + value.map(stableHash).join(',') + ']'
  }
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => `${k}:${stableHash((value as Record<string, unknown>)[k])}`)
  return '{' + sorted.join(',') + '}'
}

/**
 * Build a TanStack Query key for a Huly document query.
 *
 * The key shape is: `['huly', _class, stableHash(query), stableHash(options)]`
 *
 * Exported so callers can build keys for manual invalidation.
 */
export function createHulyQueryKey<T extends Doc> (
  _class: Ref<Class<T>>,
  query?: DocumentQuery<T>,
  options?: FindOptions<T>
): readonly [string, string, string, string] {
  return [
    'huly',
    _class,
    stableHash(query),
    stableHash(options),
  ] as const
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface UseHulyQueryOptions<T extends Doc> {
  /** TanStack Query overrides */
  queryOptions?: Omit<
    UseQueryOptions<FindResult<T>, Error>,
    'queryKey' | 'queryFn'
  >
  /** FindOptions passed to findAll */
  findOptions?: FindOptions<T>
}

/**
 * Fetch a list of documents matching `_class` and `query`.
 *
 * Auto-generates deterministic query keys and delegates to the HulyClient
 * singleton via `getClient()`.
 */
export function useHulyQuery<T extends Doc> (
  _class: Ref<Class<T>>,
  query: DocumentQuery<T>,
  options?: UseHulyQueryOptions<T>
): UseQueryResult<FindResult<T>, Error> {
  const queryKey = createHulyQueryKey(_class, query, options?.findOptions)
  const clientReady = useConnectionStore((s) => s.status === 'connected')

  return useQuery<FindResult<T>, Error>({
    queryKey,
    queryFn: async () => {
      const client = getClient()
      if (client === null) {
        throw new Error('HulyClient not connected')
      }
      return await client.findAll(_class, query, options?.findOptions)
    },
    enabled: clientReady,
    ...options?.queryOptions,
  })
}

export interface UseHulyFindOneOptions<T extends Doc> {
  queryOptions?: Omit<
    UseQueryOptions<WithLookup<T> | undefined, Error>,
    'queryKey' | 'queryFn'
  >
  findOptions?: FindOptions<T>
}

/**
 * Fetch a single document matching `_class` and `query`.
 */
export function useHulyFindOne<T extends Doc> (
  _class: Ref<Class<T>>,
  query: DocumentQuery<T>,
  options?: UseHulyFindOneOptions<T>
): UseQueryResult<WithLookup<T> | undefined, Error> {
  const queryKey = [...createHulyQueryKey(_class, query, options?.findOptions), 'one'] as const
  const clientReady = useConnectionStore((s) => s.status === 'connected')

  return useQuery<WithLookup<T> | undefined, Error>({
    queryKey,
    queryFn: async () => {
      const client = getClient()
      if (client === null) {
        throw new Error('HulyClient not connected')
      }
      return await client.findOne(_class, query, options?.findOptions)
    },
    enabled: clientReady,
    ...options?.queryOptions,
  })
}
