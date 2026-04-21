/**
 * Members repository.
 *
 * Domain-specific data access for workspace members (Persons / Employees).
 * Uses `import type` exclusively for contact types to avoid pulling
 * in svelte via the @hcengineering/ui transitive dependency.
 * Uses string class constants (same pattern as tracker/chat repositories).
 */

import {
  AccountRole,
  SortingOrder,
  type AccountUuid,
  type Class,
  type Doc,
  type Ref,
} from '@hcengineering/core'

import { getClient } from '@/client'
import { getOrCreateAccountClient } from '@/client/account'
import { useAuthStore } from '@/store/auth'
import { RepositoryError, wrapRepositoryError } from './base'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Huly class refs for contact types.
 *
 * Declared as plain strings so we avoid a value import that would pull
 * in svelte through the @hcengineering/ui transitive dependency.
 */
const CONTACT_CLASS = {
  Person: 'contact:class:Person' as Ref<Class<Doc>>,
  Employee: 'contact:mixin:Employee' as Ref<Class<Doc>>,
  Member: 'contact:class:Member' as Ref<Class<Doc>>,
} as const

const DOMAIN = 'members'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal member representation for the mobile UI. */
export interface MemberItem {
  _id: string
  /**
   * Account UUID (Person.personUuid). Required for workspace role mutations
   * (`updateWorkspaceRole`, `leaveWorkspace`). Falls back to `_id` when the
   * Person doc has no personUuid (legacy accounts) so the field is always
   * present at runtime.
   */
  accountUuid: string
  name: string
  email: string
  avatarUrl: string | undefined
  role: string
  isActive: boolean
  createdOn: number
  modifiedOn: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch all workspace members. Queries the Employee mixin with active: true
 * to get only actual workspace members (not all Person contacts).
 */
export async function getMembers(): Promise<MemberItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getMembers')
  }

  try {
    const result = await client.findAll<Doc>(
      CONTACT_CLASS.Employee,
      { active: true } as Record<string, unknown>,
      {
        sort: { name: SortingOrder.Ascending } as Record<string, SortingOrder>,
        limit: 500,
      }
    )

    return [...result].map(docToMemberItem)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getMembers', error)
  }
}

/**
 * Fetch a single member by ID.
 */
export async function getMember(
  memberId: string
): Promise<MemberItem | undefined> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getMember')
  }

  try {
    const doc = await client.findOne<Doc>(
      CONTACT_CLASS.Employee,
      { _id: memberId as Ref<Doc> } as Record<string, unknown>
    )

    if (doc == null) return undefined
    return docToMemberItem(doc)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getMember', error)
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Sends a workspace invitation to `email` with the given role. Uses the
 * workspace-scoped token so the server attributes the invite to the current
 * workspace.
 */
export async function inviteMember(
  email: string,
  role: AccountRole
): Promise<void> {
  const token = getWorkspaceScopedToken()
  if (token == null) {
    throw new RepositoryError('Not authenticated', DOMAIN, 'inviteMember')
  }

  try {
    const client = await getOrCreateAccountClient(token)
    await client.sendInvite(email, role)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'inviteMember', error)
  }
}

/**
 * Updates a workspace member's role.
 */
export async function updateMemberRole(
  targetAccount: string,
  role: AccountRole
): Promise<void> {
  const token = getWorkspaceScopedToken()
  if (token == null) {
    throw new RepositoryError('Not authenticated', DOMAIN, 'updateMemberRole')
  }

  try {
    const client = await getOrCreateAccountClient(token)
    await client.updateWorkspaceRole(targetAccount, role)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'updateMemberRole', error)
  }
}

/**
 * Removes a member from the current workspace.
 *
 * `AccountClient.leaveWorkspace(account)` is the server-side primitive for
 * both self-leave and admin-removal: the server authorizes based on the
 * caller's role.
 */
export async function removeMember(targetAccount: AccountUuid): Promise<void> {
  const token = getWorkspaceScopedToken()
  if (token == null) {
    throw new RepositoryError('Not authenticated', DOMAIN, 'removeMember')
  }

  try {
    const client = await getOrCreateAccountClient(token)
    await client.leaveWorkspace(targetAccount)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'removeMember', error)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the workspace-scoped token, falling back to the account token when
 * no workspace is selected. Workspace-scoped mutations (sendInvite,
 * updateWorkspaceRole, leaveWorkspace) require the workspace token.
 */
function getWorkspaceScopedToken(): string | null {
  // Local require to avoid a static cycle between members and workspace store.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useWorkspaceStore } = require('@/store/workspace') as typeof import('@/store/workspace')
  const wsToken = useWorkspaceStore.getState().workspaceToken
  if (wsToken != null) return wsToken
  return useAuthStore.getState().token
}

function docToMemberItem(doc: Doc): MemberItem {
  const record = doc as unknown as Record<string, unknown>

  // Build name from name field or firstName+lastName
  const rawName = record.name as string | undefined
  const firstName = record.firstName as string | undefined
  const lastName = record.lastName as string | undefined
  const computedName = [firstName, lastName].filter(Boolean).join(' ')
  const name = rawName ?? (computedName.length > 0 ? computedName : 'Unknown')

  // Extract email from channels array or socialIds
  let email = ''
  const channels = record.channels as Array<Record<string, unknown>> | undefined
  if (Array.isArray(channels) && channels.length > 0) {
    const emailChannel = channels.find((c) => String(c.provider ?? '').includes('email'))
    email = emailChannel != null ? String(emailChannel.value ?? '') : ''
  }
  if (email === '' && typeof record.socialId === 'string') {
    email = record.socialId
  }

  // Avatar URL
  const avatar = record.avatar as string | undefined
  const avatarUrl = typeof avatar === 'string' && avatar.length > 0 ? avatar : undefined

  const personUuid = record.personUuid as string | undefined
  const id = String(record._id ?? '')

  return {
    _id: id,
    accountUuid: typeof personUuid === 'string' && personUuid.length > 0 ? personUuid : id,
    name,
    email,
    avatarUrl,
    role: String(record.role ?? 'member'),
    isActive: record.active !== false,
    createdOn: Number(record.createdOn ?? 0),
    modifiedOn: Number(record.modifiedOn ?? 0),
  }
}
