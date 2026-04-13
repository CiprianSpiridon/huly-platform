/**
 * Chat repository.
 *
 * Domain-specific data access for channels, direct messages, chat messages,
 * threads, and reactions.
 *
 * Uses `import type` exclusively for chunter/activity types to avoid pulling
 * in svelte via the @hcengineering/ui transitive dependency.
 * Uses string class constants (same pattern as tracker repository).
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
 * Huly class refs for chunter types.
 *
 * Declared as plain strings so we avoid a value import that would pull
 * in svelte through the @hcengineering/ui transitive dependency.
 */
const CHUNTER_CLASS = {
  Channel: 'chunter:class:Channel' as Ref<Class<Doc>>,
  DirectMessage: 'chunter:class:DirectMessage' as Ref<Class<Doc>>,
  ChatMessage: 'chunter:class:ChatMessage' as Ref<Class<Doc>>,
  ThreadMessage: 'chunter:class:ThreadMessage' as Ref<Class<Doc>>,
} as const

const ACTIVITY_MESSAGE_CLASS = 'activity:class:ActivityMessage' as Ref<Class<Doc>>

const DOMAIN = 'chat'
const DEFAULT_PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal channel representation for the mobile UI. */
export interface ChannelItem {
  _id: string
  _class: string
  name: string
  description: string
  members: string[]
  lastMessage: string
  lastMessageTimestamp: number
  space: string
  private: boolean
  createdOn: number
  modifiedOn: number
}

/** Inline attachment metadata embedded in a message. */
export interface MessageAttachment {
  blobId: string
  name: string
  size: number
  contentType: string
}

/** Minimal message representation for the mobile UI. */
export interface MessageItem {
  _id: string
  content: string
  sender: string
  senderName: string
  createdOn: number
  modifiedOn: number
  space: string
  reactions: ReactionInfo[]
  replyCount: number
  threadLastReply: number
  attachedTo?: string
  /** Attachments associated with this message (populated from $lookup or embedded). */
  attachments: MessageAttachment[]
}

/** Reaction data for a message. */
export interface ReactionInfo {
  emoji: string
  count: number
  userIds: string[]
}

/** Paginated result with cursor-based pagination. */
export interface CursorPaginatedResult<T> {
  items: T[]
  nextCursor: string | undefined
  hasMore: boolean
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

/**
 * Fetch all channels the current user has access to.
 */
export async function getChannels(): Promise<ChannelItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getChannels')
  }

  try {
    const result = await client.findAll<Doc>(
      CHUNTER_CLASS.Channel,
      {},
      {
        sort: { modifiedOn: SortingOrder.Descending } as Record<string, SortingOrder>,
        limit: 100,
      }
    )

    return [...result].map(docToChannelItem)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getChannels', error)
  }
}

/**
 * Fetch all direct message conversations the current user is part of.
 */
export async function getDirectMessages(): Promise<ChannelItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getDirectMessages')
  }

  try {
    const result = await client.findAll<Doc>(
      CHUNTER_CLASS.DirectMessage,
      {},
      {
        sort: { modifiedOn: SortingOrder.Descending } as Record<string, SortingOrder>,
        limit: 100,
      }
    )

    return [...result].map(docToChannelItem)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getDirectMessages', error)
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Fetch messages for a channel or DM, newest-first for inverted list display.
 *
 * Uses cursor-based pagination. The cursor is the timestamp of the oldest
 * message in the current page.
 */
export async function getMessages(
  spaceId: string,
  pagination?: { cursor?: string; limit?: number }
): Promise<CursorPaginatedResult<MessageItem>> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getMessages')
  }

  const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE

  try {
    const query: Record<string, unknown> = {
      space: spaceId as Ref<Space>,
    }

    // If we have a cursor (timestamp), fetch messages older than that
    if (pagination?.cursor != null) {
      query.createdOn = { $lt: Number(pagination.cursor) }
    }

    // Use ChatMessage class (not ActivityMessage) to exclude ThreadMessage replies
    // from the main timeline. ThreadMessages are fetched separately in getThread().
    const result = await client.findAll<Doc>(
      CHUNTER_CLASS.ChatMessage,
      query as Record<string, unknown>,
      {
        sort: { createdOn: SortingOrder.Descending } as Record<string, SortingOrder>,
        limit: limit + 1, // Fetch one extra to determine hasMore
      }
    )

    const docs = [...result]
    const hasMore = docs.length > limit
    const items = hasMore ? docs.slice(0, limit) : docs

    const lastItem = items[items.length - 1]
    const lastTimestamp = lastItem != null
      ? Number((lastItem as unknown as Record<string, unknown>).createdOn ?? 0)
      : undefined

    return {
      items: items.map(docToMessageItem),
      nextCursor: hasMore && lastTimestamp != null ? String(lastTimestamp) : undefined,
      hasMore,
    }
  } catch (error) {
    // Handle 403 gracefully when user removed from channel
    if (error instanceof Error && error.message.includes('403')) {
      return { items: [], nextCursor: undefined, hasMore: false }
    }
    throw wrapRepositoryError(DOMAIN, 'getMessages', error)
  }
}

// ---------------------------------------------------------------------------
// Send message
// ---------------------------------------------------------------------------

/**
 * Send a new message to a channel or DM.
 * Optionally includes attachment blob IDs that were previously uploaded.
 * Returns the created message DTO for optimistic update.
 */
export async function sendMessage(
  spaceId: string,
  content: string,
  attachmentIds?: string[]
): Promise<MessageItem> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'sendMessage')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const attrs: Record<string, unknown> = {
      message: content,
    }

    // Link uploaded attachment blobs to the message
    if (attachmentIds != null && attachmentIds.length > 0) {
      attrs.attachments = attachmentIds.map((blobId) => ({
        blobId,
        name: blobId,
        contentType: 'application/octet-stream',
        size: 0,
      }))
    }

    const tx = factory.createTxCreateDoc(
      CHUNTER_CLASS.ChatMessage as unknown as Ref<Class<Doc>>,
      spaceId as Ref<Space>,
      attrs as unknown as Record<string, unknown>
    )

    await client.tx(tx)

    // Return a message DTO for optimistic update
    const optimisticAttachments: MessageAttachment[] = (attachmentIds ?? []).map((blobId) => ({
      blobId,
      name: blobId,
      size: 0,
      contentType: 'application/octet-stream',
    }))

    return {
      _id: tx.objectId as string,
      content,
      sender: String(account.primarySocialId),
      senderName: String(account.primarySocialId),
      createdOn: Date.now(),
      modifiedOn: Date.now(),
      space: spaceId,
      reactions: [],
      replyCount: 0,
      threadLastReply: 0,
      attachments: optimisticAttachments,
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'sendMessage', error)
  }
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

/**
 * Get a thread: the parent message and all its replies.
 */
export async function getThread(
  messageId: string
): Promise<{ parent: MessageItem; replies: MessageItem[] }> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getThread')
  }

  try {
    // Fetch the parent message
    const parentDoc = await client.findOne<Doc>(
      ACTIVITY_MESSAGE_CLASS,
      { _id: messageId as Ref<Doc> } as Record<string, unknown>
    )

    if (parentDoc == null) {
      throw new RepositoryError('Message not found', DOMAIN, 'getThread')
    }

    // Fetch replies attached to this message
    const repliesResult = await client.findAll<Doc>(
      ACTIVITY_MESSAGE_CLASS,
      { attachedTo: messageId as Ref<Doc> } as Record<string, unknown>,
      {
        sort: { createdOn: SortingOrder.Ascending } as Record<string, SortingOrder>,
        limit: 200,
      }
    )

    return {
      parent: docToMessageItem(parentDoc),
      replies: [...repliesResult].map(docToMessageItem),
    }
  } catch (error) {
    if (error instanceof RepositoryError) throw error
    throw wrapRepositoryError(DOMAIN, 'getThread', error)
  }
}

/**
 * Send a reply in a thread.
 * Optionally includes attachment blob IDs that were previously uploaded.
 */
export async function sendThreadReply(
  messageId: string,
  content: string,
  attachmentIds?: string[]
): Promise<MessageItem> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'sendThreadReply')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    // Get parent message to determine its space
    const parentDoc = await client.findOne<Doc>(
      ACTIVITY_MESSAGE_CLASS,
      { _id: messageId as Ref<Doc> } as Record<string, unknown>
    )

    const parentSpace = parentDoc != null
      ? String((parentDoc as unknown as Record<string, unknown>).space ?? '')
      : ''

    const attrs: Record<string, unknown> = {
      message: content,
      attachedTo: messageId as Ref<Doc>,
      attachedToClass: ACTIVITY_MESSAGE_CLASS,
      collection: 'replies',
    }

    // Link uploaded attachment blobs to the reply
    if (attachmentIds != null && attachmentIds.length > 0) {
      attrs.attachments = attachmentIds.map((blobId) => ({
        blobId,
        name: blobId,
        contentType: 'application/octet-stream',
        size: 0,
      }))
    }

    const tx = factory.createTxCreateDoc(
      CHUNTER_CLASS.ChatMessage as unknown as Ref<Class<Doc>>,
      parentSpace as Ref<Space>,
      attrs as unknown as Record<string, unknown>
    )

    await client.tx(tx)

    const optimisticAttachments: MessageAttachment[] = (attachmentIds ?? []).map((blobId) => ({
      blobId,
      name: blobId,
      size: 0,
      contentType: 'application/octet-stream',
    }))

    return {
      _id: tx.objectId as string,
      content,
      sender: String(account.primarySocialId),
      senderName: String(account.primarySocialId),
      createdOn: Date.now(),
      modifiedOn: Date.now(),
      space: parentSpace,
      reactions: [],
      replyCount: 0,
      threadLastReply: 0,
      attachedTo: messageId,
      attachments: optimisticAttachments,
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'sendThreadReply', error)
  }
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/**
 * Add a reaction to a message.
 */
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'addReaction')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    // Create a reaction document attached to the message
    const REACTION_CLASS = 'activity:class:Reaction' as Ref<Class<Doc>>

    // Get parent message to determine its space
    const parentDoc = await client.findOne<Doc>(
      ACTIVITY_MESSAGE_CLASS,
      { _id: messageId as Ref<Doc> } as Record<string, unknown>
    )

    const parentSpace = parentDoc != null
      ? String((parentDoc as unknown as Record<string, unknown>).space ?? '')
      : ''

    const tx = factory.createTxCreateDoc(
      REACTION_CLASS as unknown as Ref<Class<Doc>>,
      parentSpace as Ref<Space>,
      {
        emoji,
        attachedTo: messageId as Ref<Doc>,
        attachedToClass: ACTIVITY_MESSAGE_CLASS,
        collection: 'reactions',
      } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'addReaction', error)
  }
}

/**
 * Remove a reaction from a message.
 */
export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'removeReaction')
  }

  try {
    const REACTION_CLASS = 'activity:class:Reaction' as Ref<Class<Doc>>
    const account = await client.getAccount()

    // Find the user's reaction for this emoji on this message
    const reaction = await client.findOne<Doc>(
      REACTION_CLASS,
      {
        attachedTo: messageId as Ref<Doc>,
        emoji,
        createdBy: account.primarySocialId,
      } as Record<string, unknown>
    )

    if (reaction == null) {
      return // Already removed
    }

    const { TxFactory } = await import('@hcengineering/core')
    const factory = new TxFactory(account.primarySocialId)

    const record = reaction as unknown as Record<string, unknown>
    const space = String(record.space ?? '')

    const tx = factory.createTxRemoveDoc(
      REACTION_CLASS as unknown as Ref<Class<Doc>>,
      space as Ref<Space>,
      reaction._id
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'removeReaction', error)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function docToChannelItem(doc: Doc): ChannelItem {
  const record = doc as unknown as Record<string, unknown>
  return {
    _id: String(record._id ?? ''),
    _class: String(record._class ?? ''),
    name: String(record.name ?? record.title ?? 'Unnamed'),
    description: String(record.description ?? ''),
    members: Array.isArray(record.members) ? record.members.map(String) : [],
    lastMessage: String(record.lastMessage ?? ''),
    lastMessageTimestamp: Number(record.lastMessageDate ?? record.modifiedOn ?? 0),
    space: String(record._id ?? ''), // Channels are spaces themselves
    private: Boolean(record.private ?? false),
    createdOn: Number(record.createdOn ?? 0),
    modifiedOn: Number(record.modifiedOn ?? 0),
  }
}

function docToMessageItem(doc: Doc): MessageItem {
  const record = doc as unknown as Record<string, unknown>
  const reactions = Array.isArray(record.reactions)
    ? (record.reactions as Array<Record<string, unknown>>).map((r) => ({
        emoji: String(r.emoji ?? ''),
        count: Number(r.count ?? 1),
        userIds: Array.isArray(r.userIds) ? r.userIds.map(String) : [],
      }))
    : []

  // Extract attachments from $lookup or embedded array
  const rawAttachments = Array.isArray(record.attachments)
    ? (record.attachments as Array<Record<string, unknown>>)
    : []
  const attachments: MessageAttachment[] = rawAttachments
    .filter((a) => typeof a.blobId === 'string' || typeof a.uuid === 'string' || typeof a.file === 'string')
    .map((a) => ({
      blobId: String(a.blobId ?? a.uuid ?? a.file ?? ''),
      name: String(a.name ?? a.filename ?? 'file'),
      size: Number(a.size ?? 0),
      contentType: String(a.contentType ?? a.type ?? 'application/octet-stream'),
    }))

  return {
    _id: String(record._id ?? ''),
    content: String(record.message ?? record.content ?? ''),
    sender: String(record.createdBy ?? record.modifiedBy ?? ''),
    senderName: String(record.createdBy ?? record.modifiedBy ?? ''),
    createdOn: Number(record.createdOn ?? record.modifiedOn ?? 0),
    modifiedOn: Number(record.modifiedOn ?? 0),
    space: String(record.space ?? ''),
    reactions,
    replyCount: Number(record.replies ?? 0),
    threadLastReply: Number(record.lastReply ?? 0),
    attachedTo: record.attachedTo != null ? String(record.attachedTo) : undefined,
    attachments,
  }
}
