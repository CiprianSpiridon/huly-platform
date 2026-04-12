/**
 * TanStack Query client singleton.
 *
 * Extracted from _layout.tsx so it can be imported by hooks and test
 * setup without depending on the root layout component.
 */

import { QueryClient } from '@tanstack/react-query'

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
})
