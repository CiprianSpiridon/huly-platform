/**
 * useWorkspaceRole hook.
 *
 * Returns the current user's role in the active workspace.
 *
 * Role source:
 * - The persisted `workspaceRole` is captured at workspace selection and
 *   survives restart, so gating UI stays responsive before the network
 *   returns.
 * - A background query refreshes the role from the account service
 *   (`getLoginInfoByToken`) and writes the authoritative value back to the
 *   store. This covers the case where another admin changes the user's
 *   role while they are signed in — without the refresh, gating would
 *   remain stale until the next login.
 *
 * Returns `undefined` when no workspace is selected or the role is not
 * one of the standard gating roles (owner/maintainer/member/guest).
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AccountRole } from '@hcengineering/core'

import { useWorkspaceStore } from '@/store/workspace'
import { getOrCreateAccountClient } from '@/client/account'

export type WorkspaceRole = 'owner' | 'maintainer' | 'member' | 'guest'

const ROLE_REFRESH_STALE_TIME = 60_000 // 1 minute

export function useWorkspaceRole(): WorkspaceRole | undefined {
  const role = useWorkspaceStore((s) => s.workspaceRole)
  const workspaceToken = useWorkspaceStore((s) => s.workspaceToken)
  const selectedWorkspace = useWorkspaceStore((s) => s.selectedWorkspace)
  const setWorkspaceRole = useWorkspaceStore((s) => s.setWorkspaceRole)

  // Background refresh. The query result is written into the store via the
  // effect below so any hook reading `workspaceRole` sees the fresh value.
  const { data: freshRole } = useQuery<AccountRole | null>({
    queryKey: ['account', 'workspaceRole', selectedWorkspace],
    queryFn: async () => {
      if (workspaceToken == null) return null
      const client = await getOrCreateAccountClient(workspaceToken)
      const info = await client.getLoginInfoByToken()
      if (info == null) return null
      const record = info as unknown as Record<string, unknown>
      const candidate = record.role
      if (typeof candidate !== 'string') return null
      const known = (Object.values(AccountRole) as string[]).includes(candidate)
      return known ? (candidate as AccountRole) : null
    },
    enabled: workspaceToken != null && selectedWorkspace != null,
    staleTime: ROLE_REFRESH_STALE_TIME,
  })

  useEffect(() => {
    if (freshRole != null && freshRole !== role) {
      void setWorkspaceRole(freshRole)
    }
  }, [freshRole, role, setWorkspaceRole])

  if (role == null) return undefined

  switch (role) {
    case AccountRole.Owner:
      return 'owner'
    case AccountRole.Admin:
      // Treat Admin (platform admin) as owner for settings gating.
      return 'owner'
    case AccountRole.Maintainer:
      return 'maintainer'
    case AccountRole.User:
      return 'member'
    case AccountRole.Guest:
    case AccountRole.DocGuest:
    case AccountRole.ReadOnlyGuest:
      return 'guest'
    default:
      return undefined
  }
}
