/**
 * TanStack Query hook for Huly tracker projects.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Project } from '@hcengineering/tracker'

import { getProjects } from '@/repositories/tracker'
import { getClient } from '@/client'

const PROJECTS_STALE_TIME = 5 * 60_000   // 5 minutes
const PROJECTS_GC_TIME = 30 * 60_000     // 30 minutes

export function useProjects(): UseQueryResult<Project[], Error> {
  return useQuery<Project[], Error>({
    queryKey: ['tracker', 'projects'],
    queryFn: getProjects,
    staleTime: PROJECTS_STALE_TIME,
    gcTime: PROJECTS_GC_TIME,
    enabled: getClient() !== null,
  })
}
