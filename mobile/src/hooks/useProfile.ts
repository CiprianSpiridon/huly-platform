/**
 * Profile TanStack Query hook.
 *
 * Wraps the settings repository's getProfile() with caching (5 min staleTime).
 */

import { useQuery } from '@tanstack/react-query'

import { getProfile } from '@/repositories/settings'
import { useAuthStore } from '@/store/auth'

const PROFILE_STALE_TIME = 5 * 60_000 // 5 minutes

export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: isAuthenticated,
    staleTime: PROFILE_STALE_TIME,
  })
}
