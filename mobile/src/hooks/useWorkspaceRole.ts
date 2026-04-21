/**
 * useWorkspaceRole hook.
 *
 * Returns the current user's role in the active workspace, persisted in
 * `useWorkspaceStore`. Returns `undefined` when no workspace is selected,
 * the role could not be restored, or the role is not one of the standard
 * gating roles (owner/maintainer/member/guest).
 *
 * Used by settings rows that gate action visibility by role (invite members,
 * change roles, remove members).
 */

import { AccountRole } from '@hcengineering/core'

import { useWorkspaceStore } from '@/store/workspace'

export type WorkspaceRole = 'owner' | 'maintainer' | 'member' | 'guest'

export function useWorkspaceRole(): WorkspaceRole | undefined {
  const role = useWorkspaceStore((s) => s.workspaceRole)
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
