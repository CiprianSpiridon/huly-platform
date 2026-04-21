/**
 * TanStack Query client singleton.
 *
 * Extracted from _layout.tsx so it can be imported by hooks and test
 * setup without depending on the root layout component.
 *
 * Global query/mutation errors route to the shared toast store so every
 * screen gets consistent, non-blocking feedback without individual wiring.
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'

import { showErrorToast } from '@/store/toast'

function isNoisyError(err: unknown): boolean {
  // Filter out errors that should not surface as a toast:
  //  - AbortError on route transitions
  //  - "not connected" style errors that are already handled by the connection banner
  if (err == null) return true
  const name = (err as { name?: unknown }).name
  if (typeof name === 'string' && name === 'AbortError') return true
  const message = (err as { message?: unknown }).message
  if (typeof message === 'string') {
    if (message.toLowerCase().includes('cancel')) return true
  }
  return false
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s before data is considered stale
      gcTime: 5 * 60_000, // 5 min before inactive data is garbage collected
      retry: 2, // Retry failed queries twice
      refetchOnWindowFocus: false, // RN does not have window focus events
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
  queryCache: new QueryCache({
    onError(err, query) {
      if (isNoisyError(err)) return
      // Only toast queries that explicitly opt in OR lack custom handling.
      const meta = query.meta as { silent?: boolean } | undefined
      if (meta?.silent === true) return
      showErrorToast(err)
    },
  }),
  mutationCache: new MutationCache({
    onError(err, _vars, _ctx, mutation) {
      if (isNoisyError(err)) return
      const meta = mutation.meta as { silent?: boolean } | undefined
      if (meta?.silent === true) return
      showErrorToast(err)
    },
  }),
})
