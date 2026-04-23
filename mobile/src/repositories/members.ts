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
  type WorkspaceMemberInfo,
} from '@hcengineering/core'

import { getClient } from '@/client'
import { getOrCreateAccountClient } from '@/client/account'
import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'
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
 * Fetch all workspace members.
 *
 * Role-source note: the transactor Employee mixin stores a `role` that
 * is NOT kept in sync by `updateWorkspaceRole` — the account service is
 * the authoritative source for workspace roles (see
 * `server/account/src/utils.ts:updateWorkspaceRole`). To avoid stale UI
 * after a role change we fetch `getWorkspaceMembers()` from the account
 * service and overlay those roles onto the transactor employee list,
 * matched by personUuid.
 */
export async function getMembers(): Promise<MemberItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getMembers')
  }

  try {
    const wsToken = getWorkspaceScopedToken()
    const accountClient = wsToken != null ? await getOrCreateAccountClient(wsToken) : null
    const [result, workspaceMembers] = await Promise.all([
      client.findAll<Doc>(
        CONTACT_CLASS.Employee,
        { active: true } as Record<string, unknown>,
        {
          sort: { name: SortingOrder.Ascending } as Record<string, SortingOrder>,
          limit: 500,
        }
      ),
      accountClient != null
        ? accountClient.getWorkspaceMembers().catch(() => [] as WorkspaceMemberInfo[])
        : Promise.resolve([] as WorkspaceMemberInfo[]),
    ])

    const roleByAccount = new Map<string, AccountRole>()
    for (const m of workspaceMembers) {
      roleByAccount.set(String(m.person), m.role)
    }

    return [...result].map((doc) => docToMemberItem(doc, roleByAccount))
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getMembers', error)
  }
}

/**
 * Fetch a single member by ID. Role is overlaid from the account service
 * (same reasoning as `getMembers`).
 */
export async function getMember(
  memberId: string
): Promise<MemberItem | undefined> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getMember')
  }

  try {
    const wsToken = getWorkspaceScopedToken()
    const accountClient = wsToken != null ? await getOrCreateAccountClient(wsToken) : null
    const [doc, workspaceMembers] = await Promise.all([
      client.findOne<Doc>(
        CONTACT_CLASS.Employee,
        { _id: memberId as Ref<Doc> } as Record<string, unknown>
      ),
      accountClient != null
        ? accountClient.getWorkspaceMembers().catch(() => [] as WorkspaceMemberInfo[])
        : Promise.resolve([] as WorkspaceMemberInfo[]),
    ])

    if (doc == null) return undefined

    const roleByAccount = new Map<string, AccountRole>()
    for (const m of workspaceMembers) {
      roleByAccount.set(String(m.person), m.role)
    }
    return docToMemberItem(doc, roleByAccount)
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
  const wsToken = useWorkspaceStore.getState().workspaceToken
  if (wsToken != null) return wsToken
  return useAuthStore.getState().token
}

function docToMemberItem(
  doc: Doc,
  roleByAccount: Map<string, AccountRole>
): MemberItem {
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
  const accountUuid =
    typeof personUuid === 'string' && personUuid.length > 0 ? personUuid : id

  // Prefer the account-service role (authoritative) over the transactor
  // Employee.role which is not updated by `updateWorkspaceRole`.
  const authoritativeRole = roleByAccount.get(accountUuid)
  const role = authoritativeRole != null ? String(authoritativeRole) : String(record.role ?? 'member')

  return {
    _id: id,
    accountUuid,
    name,
    email,
    avatarUrl,
    role,
    // `active !== false` treats undefined as active (legacy employees without
    // the `active` flag are considered active members by default).
    isActive: record.active !== false,
    createdOn: Number(record.createdOn ?? 0),
    modifiedOn: Number(record.modifiedOn ?? 0),
  }
}
