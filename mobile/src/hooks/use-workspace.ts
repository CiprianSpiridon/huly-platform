/**
 * Workspace hooks.
 *
 * - `useWorkspaces` -- fetches the user's workspace list with TanStack Query
 * - `useSelectWorkspace` -- selects a workspace and persists to store
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { getOrCreateAccountClient } from '@/client/account'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { useConnectionStore } from '@/store/connection'

export function useWorkspaces() {
  const token = useAuthStore((s) => s.token)

  return useQuery({
    queryKey: ['workspaces', token],
    queryFn: async () => {
      const client = await getOrCreateAccountClient(token ?? undefined)
      return await client.getUserWorkspaces()
    },
    enabled: token !== null,
    staleTime: 5 * 60_000,
  })
}

export function useSelectWorkspace(): {
  selectWorkspace: (workspaceUrl: string) => Promise<void>
  isSelecting: boolean
} {
  const [isSelecting, setIsSelecting] = useState(false)
  const token = useAuthStore((s) => s.token)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const connect = useConnectionStore((s) => s.connect)
  const queryClient = useQueryClient()

  const selectWorkspace = useCallback(
    async (workspaceUrl: string): Promise<void> => {
      setIsSelecting(true)
      try {
        const client = await getOrCreateAccountClient(token ?? undefined)
        const wsInfo = await client.selectWorkspace(workspaceUrl)

        // Clear all cached queries from previous workspace
        queryClient.clear()

        // Connect the data layer FIRST -- if this fails we must not persist
        // workspace credentials that point to a broken connection.
        await connect(wsInfo.endpoint, wsInfo.workspace, wsInfo.token)

        // Only persist after connect succeeds
        await setWorkspace(wsInfo)
      } finally {
        setIsSelecting(false)
      }
    },
    [token, setWorkspace, connect, queryClient],
  )

  return { selectWorkspace, isSelecting }
}
