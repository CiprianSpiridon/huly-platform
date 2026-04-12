/**
 * Workspace-related hooks for the settings flow.
 *
 * - useWorkspaceInfo: current workspace details (name, url, member count)
 * - useSwitchWorkspace: mutation to switch to a different workspace
 *
 * The workspace list hook (useWorkspaces) lives in use-workspace.ts
 * and is reused as-is.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { router, type Href } from 'expo-router'

import { getWorkspaceInfo, switchWorkspace } from '@/repositories/settings'
import { useWorkspaceStore } from '@/store/workspace'
import { useConnectionStore } from '@/store/connection'

const WORKSPACE_INFO_STALE_TIME = 5 * 60_000 // 5 minutes

export function useWorkspaceInfo() {
  const hasWorkspace = useWorkspaceStore((s) => s.selectedWorkspace)

  return useQuery({
    queryKey: ['workspaceInfo'],
    queryFn: getWorkspaceInfo,
    enabled: hasWorkspace !== null,
    staleTime: WORKSPACE_INFO_STALE_TIME,
  })
}

export function useSwitchWorkspace(): {
  switchTo: (workspaceUrl: string) => Promise<void>
  isSwitching: boolean
  error: string | null
} {
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const disconnect = useConnectionStore((s) => s.disconnect)
  const connect = useConnectionStore((s) => s.connect)
  const queryClient = useQueryClient()

  const switchTo = useCallback(
    async (workspaceUrl: string): Promise<void> => {
      setIsSwitching(true)
      setError(null)
      try {
        // Save old credentials for rollback
        const oldWs = useWorkspaceStore.getState()
        const oldEndpoint = oldWs.workspaceEndpoint
        const oldWsId = oldWs.selectedWorkspace
        const oldToken = oldWs.workspaceToken

        // 1. Call selectWorkspace to get WorkspaceLoginInfo
        const wsInfo = await switchWorkspace(workspaceUrl)

        // 2. Disconnect existing API client
        disconnect()

        // 3. Update workspace Zustand store (all 4 keys)
        await setWorkspace(wsInfo)

        // 4. Reconnect with new workspace credentials
        try {
          await connect(wsInfo.endpoint, wsInfo.workspace, wsInfo.token)
        } catch (connectErr) {
          // Rollback: restore old workspace and reconnect
          if (oldEndpoint != null && oldWsId != null && oldToken != null) {
            await setWorkspace({
              endpoint: oldEndpoint,
              workspace: oldWsId,
              token: oldToken,
              workspaceUrl: oldWs.workspaceUrl ?? '',
            } as import('@hcengineering/account-client').WorkspaceLoginInfo)
            await connect(oldEndpoint, oldWsId, oldToken)
          }
          throw connectErr
        }

        // 5. Clear all cached queries from previous workspace
        queryClient.clear()

        // 6. Navigate to the default tab
        router.replace('/(app)/tracker' as Href)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to switch workspace'
        setError(message)
        throw err
      } finally {
        setIsSwitching(false)
      }
    },
    [setWorkspace, disconnect, connect, queryClient],
  )

  return { switchTo, isSwitching, error }
}
