/**
 * Settings repository.
 *
 * Domain-specific data access for user profile, workspace info, and
 * workspace switching. Uses the AccountClient (pure fetch) exclusively.
 * Uses `import type` for core types to avoid pulling in svelte.
 */

import type {
  Person,
  WorkspaceInfoWithStatus,
  WorkspaceMemberInfo,
} from '@hcengineering/core'
import type { WorkspaceLoginInfo, SocialId } from '@hcengineering/account-client'

import { getOrCreateAccountClient } from '@/client/account'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
import { RepositoryError, wrapRepositoryError } from './base'

const DOMAIN = 'settings'

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface UserProfile {
  firstName: string
  lastName: string
  email: string | null
}

/**
 * Fetches the current user's profile (name + primary email).
 *
 * Uses `getPerson()` for name fields and `getSocialIds()` to find
 * the primary email address.
 */
export async function getProfile(): Promise<UserProfile> {
  const token = useAuthStore.getState().token
  if (token == null) {
    throw new RepositoryError('Not authenticated', DOMAIN, 'getProfile')
  }

  try {
    const client = await getOrCreateAccountClient(token)
    const [person, socialIds] = await Promise.all([
      client.getPerson(),
      client.getSocialIds(),
    ]) as [Person, SocialId[]]

    const emailEntry = socialIds.find((s) => s.type === 'email')
    const email = emailEntry?.value ?? null

    return {
      firstName: person.firstName,
      lastName: person.lastName,
      email,
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getProfile', error)
  }
}

// ---------------------------------------------------------------------------
// Workspace info
// ---------------------------------------------------------------------------

export interface WorkspaceDetails {
  name: string
  url: string
  memberCount: number
}

/**
 * Fetches details for the currently selected workspace.
 * Uses the workspace-scoped token for workspace-scoped API calls.
 */
export async function getWorkspaceInfo(): Promise<WorkspaceDetails> {
  const wsToken = getWorkspaceToken()
  if (wsToken == null) {
    throw new RepositoryError('No workspace token available', DOMAIN, 'getWorkspaceInfo')
  }

  try {
    const client = await getOrCreateAccountClient(wsToken)
    const [info, members] = await Promise.all([
      client.getWorkspaceInfo(),
      client.getWorkspaceMembers(),
    ]) as [WorkspaceInfoWithStatus, WorkspaceMemberInfo[]]

    return {
      name: info.name,
      url: info.url,
      memberCount: members.length,
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getWorkspaceInfo', error)
  }
}

// ---------------------------------------------------------------------------
// Workspace list
// ---------------------------------------------------------------------------

/**
 * Fetches all workspaces the current user belongs to,
 * sorted by lastVisit descending (most recently visited first).
 */
export async function getWorkspaces(): Promise<WorkspaceInfoWithStatus[]> {
  const token = useAuthStore.getState().token
  if (token == null) {
    throw new RepositoryError('Not authenticated', DOMAIN, 'getWorkspaces')
  }

  try {
    const client = await getOrCreateAccountClient(token)
    const workspaces = await client.getUserWorkspaces()

    return [...workspaces].sort((a, b) => {
      const aVisit = a.lastVisit ?? 0
      const bVisit = b.lastVisit ?? 0
      return bVisit - aVisit
    })
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getWorkspaces', error)
  }
}

// ---------------------------------------------------------------------------
// Workspace switch
// ---------------------------------------------------------------------------

/**
 * Selects a workspace and returns the workspace login info (token + endpoint).
 *
 * The caller (useSwitchWorkspace hook) is responsible for:
 * - updating the workspace Zustand store
 * - disconnecting / reconnecting the API client
 * - clearing the query cache
 * - navigating to the default tab
 */
export async function switchWorkspace(workspaceUrl: string): Promise<WorkspaceLoginInfo> {
  const token = useAuthStore.getState().token
  if (token == null) {
    throw new RepositoryError('Not authenticated', DOMAIN, 'switchWorkspace')
  }

  try {
    const client = await getOrCreateAccountClient(token)
    return await client.selectWorkspace(workspaceUrl)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'switchWorkspace', error)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the workspace-scoped token, falling back to the account token.
 * Workspace-scoped endpoints (getWorkspaceInfo, getWorkspaceMembers)
 * require the workspace token.
 */
function getWorkspaceToken(): string | null {
  const wsToken = useWorkspaceStore.getState().workspaceToken
  if (wsToken != null) {
    return wsToken
  }
  return useAuthStore.getState().token
}
