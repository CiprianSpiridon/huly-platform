/**
 * Activity repository.
 *
 * Domain-specific data access for activity messages (comments) attached
 * to documents such as tracker issues.
 *
 * Uses `import type` exclusively for activity/chunter types to avoid
 * pulling in svelte via the @hcengineering/ui transitive dependency.
 */

import {
  SortingOrder,
  type Class,
  type Doc,
  type Ref,
  type Space,
} from '@hcengineering/core'

import { getClient } from '@/client'
import { RepositoryError, wrapRepositoryError } from './base'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Use ChatMessage class for comments — excludes system messages like
 * DocUpdateMessage, ActivityInfoMessage, ActivityReference that would
 * pollute the comments feed if we queried the base ActivityMessage class.
 */
const CHAT_MESSAGE_CLASS = 'chunter:class:ChatMessage' as Ref<Class<Doc>>

const DOMAIN = 'activity'
const DEFAULT_LIMIT = 50

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal comment representation for the mobile UI.
 * Avoids leaking the full ActivityMessage shape into components.
 */
export interface CommentItem {
  _id: string
  message: string
  modifiedBy: string
  modifiedOn: number
  createdOn: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch activity messages (comments) attached to a given document.
 *
 * Uses `attachedTo` query to find messages linked to the target doc.
 */
export async function getComments(
  attachedTo: string,
  limit: number = DEFAULT_LIMIT
): Promise<CommentItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getComments')
  }

  try {
    const result = await client.findAll<Doc>(
      CHAT_MESSAGE_CLASS,
      { attachedTo: attachedTo as Ref<Doc> } as Record<string, unknown>,
      {
        sort: { createdOn: SortingOrder.Ascending } as Record<string, SortingOrder>,
        limit,
      }
    )

    return [...result].map((doc) => {
      const record = doc as unknown as Record<string, unknown>
      return {
        _id: String(record._id ?? ''),
        message: String(record.message ?? record.content ?? ''),
        modifiedBy: String(record.modifiedBy ?? ''),
        modifiedOn: Number(record.modifiedOn ?? 0),
        createdOn: Number(record.createdOn ?? record.modifiedOn ?? 0),
      }
    })
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getComments', error)
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new comment (ActivityMessage) attached to a document.
 *
 * Uses the TxFactory to create a TxCreateDoc for the activity message
 * class with the message attached to the target document.
 */
export async function createComment(
  attachedTo: string,
  space: string,
  message: string
): Promise<string> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'createComment')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const CHUNTER_MESSAGE_CLASS = 'chunter:class:ChatMessage' as Ref<Class<Doc>>

    const tx = factory.createTxCreateDoc(
      CHUNTER_MESSAGE_CLASS as unknown as Ref<Class<Doc>>,
      space as Ref<Space>,
      {
        message,
        attachedTo: attachedTo as Ref<Doc>,
        attachedToClass: 'tracker:class:Issue' as Ref<Class<Doc>>,
        collection: 'comments',
      } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
    return tx.objectId as string
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'createComment', error)
  }
}
