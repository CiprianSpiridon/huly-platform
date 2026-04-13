/**
 * Members repository.
 *
 * Domain-specific data access for workspace members (Persons / Employees).
 * Uses `import type` exclusively for contact types to avoid pulling
 * in svelte via the @hcengineering/ui transitive dependency.
 * Uses string class constants (same pattern as tracker/chat repositories).
 */

import {
  SortingOrder,
  type Class,
  type Doc,
  type Ref,
} from '@hcengineering/core'

import { getClient } from '@/client'
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
  Employee: 'contact:class:Employee' as Ref<Class<Doc>>,
  Member: 'contact:class:Member' as Ref<Class<Doc>>,
} as const

const DOMAIN = 'members'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal member representation for the mobile UI. */
export interface MemberItem {
  _id: string
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
 * Fetch all workspace members. Returns Person documents sorted alphabetically.
 */
export async function getMembers(): Promise<MemberItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getMembers')
  }

  try {
    const result = await client.findAll<Doc>(
      CONTACT_CLASS.Person,
      {},
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
      CONTACT_CLASS.Person,
      { _id: memberId as Ref<Doc> } as Record<string, unknown>
    )

    if (doc == null) return undefined
    return docToMemberItem(doc)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getMember', error)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  return {
    _id: String(record._id ?? ''),
    name,
    email,
    avatarUrl,
    role: String(record.role ?? 'member'),
    isActive: record.active !== false,
    createdOn: Number(record.createdOn ?? 0),
    modifiedOn: Number(record.modifiedOn ?? 0),
  }
}
