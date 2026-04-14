/**
 * Activity repository.
 *
 * Domain-specific data access for activity messages (comments and system
 * activity) attached to documents such as tracker issues.
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
 * Use ChatMessage class for comments -- excludes system messages like
 * DocUpdateMessage, ActivityInfoMessage, ActivityReference that would
 * pollute the comments feed if we queried the base ActivityMessage class.
 */
const CHAT_MESSAGE_CLASS = 'chunter:class:ChatMessage' as Ref<Class<Doc>>

/**
 * Base ActivityMessage class for system messages (status changes, field
 * updates, etc.).
 */
const ACTIVITY_MESSAGE_CLASS = 'activity:class:ActivityMessage' as Ref<Class<Doc>>

/**
 * DocUpdateMessage class for field-change system messages.
 */
const DOC_UPDATE_MESSAGE_CLASS = 'activity:class:DocUpdateMessage' as Ref<Class<Doc>>

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
  isEdited: boolean
  _class: string
}

/**
 * Activity timeline item: either a user comment or a system message.
 */
export interface ActivityItem {
  _id: string
  type: 'comment' | 'system'
  message: string
  modifiedBy: string
  modifiedOn: number
  createdOn: number
  isEdited: boolean
  _class: string
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
      const createdOn = Number(record.createdOn ?? record.modifiedOn ?? 0)
      const modifiedOn = Number(record.modifiedOn ?? 0)
      return {
        _id: String(record._id ?? ''),
        message: String(record.message ?? record.content ?? ''),
        modifiedBy: String(record.modifiedBy ?? ''),
        modifiedOn,
        createdOn,
        isEdited: modifiedOn > createdOn + 1000, // 1s tolerance
        _class: String(record._class ?? ''),
      }
    })
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getComments', error)
  }
}

/**
 * Fetch full activity timeline: user comments + system messages.
 */
export async function getActivityTimeline(
  attachedTo: string,
  limit: number = DEFAULT_LIMIT
): Promise<ActivityItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getActivityTimeline')
  }

  try {
    // Fetch both chat messages and system messages
    const [comments, systemMessages] = await Promise.all([
      client.findAll<Doc>(
        CHAT_MESSAGE_CLASS,
        { attachedTo: attachedTo as Ref<Doc> } as Record<string, unknown>,
        {
          sort: { createdOn: SortingOrder.Ascending } as Record<string, SortingOrder>,
          limit,
        }
      ),
      client.findAll<Doc>(
        DOC_UPDATE_MESSAGE_CLASS,
        { attachedTo: attachedTo as Ref<Doc> } as Record<string, unknown>,
        {
          sort: { createdOn: SortingOrder.Ascending } as Record<string, SortingOrder>,
          limit: 30,
        }
      ),
    ])

    const items: ActivityItem[] = []

    for (const doc of [...comments]) {
      const r = doc as unknown as Record<string, unknown>
      const createdOn = Number(r.createdOn ?? r.modifiedOn ?? 0)
      const modifiedOn = Number(r.modifiedOn ?? 0)
      items.push({
        _id: String(r._id ?? ''),
        type: 'comment',
        message: String(r.message ?? r.content ?? ''),
        modifiedBy: String(r.modifiedBy ?? ''),
        modifiedOn,
        createdOn,
        isEdited: modifiedOn > createdOn + 1000,
        _class: String(r._class ?? ''),
      })
    }

    for (const doc of [...systemMessages]) {
      const r = doc as unknown as Record<string, unknown>
      // Build system message from the update info
      const attributeUpdates = r.attributeUpdates as Record<string, unknown> | undefined
      let msg = 'Updated issue'
      if (attributeUpdates != null) {
        const attrKeys = attributeUpdates.attrKey as string[] | undefined
        if (attrKeys != null && attrKeys.length > 0) {
          msg = `Updated ${attrKeys.join(', ')}`
        }
      }
      items.push({
        _id: String(r._id ?? ''),
        type: 'system',
        message: msg,
        modifiedBy: String(r.modifiedBy ?? ''),
        modifiedOn: Number(r.modifiedOn ?? 0),
        createdOn: Number(r.createdOn ?? r.modifiedOn ?? 0),
        isEdited: false,
        _class: String(r._class ?? ''),
      })
    }

    // Sort all items by createdOn
    items.sort((a, b) => a.createdOn - b.createdOn)

    return items
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getActivityTimeline', error)
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

/**
 * Update a comment's message.
 */
export async function updateComment(
  commentId: string,
  space: string,
  message: string
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'updateComment')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const tx = factory.createTxUpdateDoc(
      CHAT_MESSAGE_CLASS as unknown as Ref<Class<Doc>>,
      space as Ref<Space>,
      commentId as Ref<Doc>,
      { message }
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'updateComment', error)
  }
}

/**
 * Delete a comment.
 */
export async function deleteComment(
  commentId: string,
  space: string
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'deleteComment')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const tx = factory.createTxRemoveDoc(
      CHAT_MESSAGE_CLASS as unknown as Ref<Class<Doc>>,
      space as Ref<Space>,
      commentId as Ref<Doc>
    )
    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'deleteComment', error)
  }
}
