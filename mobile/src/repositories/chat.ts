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
  /** Whether this message is pinned. */
  pinned: boolean
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

    // Cursor format: "timestamp:messageId" — use $lte with $nin to avoid
    // skipping messages that share the same timestamp as the cursor message.
    if (pagination?.cursor != null) {
      const [cursorTs, cursorId] = pagination.cursor.split(':')
      query.createdOn = { $lte: Number(cursorTs) }
      if (cursorId != null) {
        query._id = { $nin: [cursorId as Ref<Doc>] }
      }
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
    let nextCursor: string | undefined
    if (hasMore && lastItem != null) {
      const lastRecord = lastItem as unknown as Record<string, unknown>
      const lastTimestamp = Number(lastRecord.createdOn ?? 0)
      const lastId = String(lastRecord._id ?? '')
      nextCursor = `${lastTimestamp}:${lastId}`
    }

    return {
      items: items.map(docToMessageItem),
      nextCursor,
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
      pinned: false,
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

    // Fetch replies attached to this message (ChatMessage excludes system messages)
    const repliesResult = await client.findAll<Doc>(
      CHUNTER_CLASS.ChatMessage,
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
      pinned: false,
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
// Channel detail
// ---------------------------------------------------------------------------

/**
 * Fetch a single channel or DM by ID.
 */
export async function getChannelDetail(channelId: string): Promise<ChannelItem | undefined> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getChannelDetail')
  }

  try {
    // Try Channel first, then DirectMessage
    let doc = await client.findOne<Doc>(
      CHUNTER_CLASS.Channel,
      { _id: channelId as Ref<Doc> } as Record<string, unknown>
    )
    if (doc == null) {
      doc = await client.findOne<Doc>(
        CHUNTER_CLASS.DirectMessage,
        { _id: channelId as Ref<Doc> } as Record<string, unknown>
      )
    }
    if (doc == null) return undefined
    return docToChannelItem(doc)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getChannelDetail', error)
  }
}

// ---------------------------------------------------------------------------
// Channel members
// ---------------------------------------------------------------------------

/** Minimal channel member info. */
export interface ChannelMember {
  memberId: string
  role: string
}

/**
 * Fetch members of a channel by reading its `members` array.
 */
export async function getChannelMembers(channelId: string): Promise<ChannelMember[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getChannelMembers')
  }

  try {
    let doc = await client.findOne<Doc>(
      CHUNTER_CLASS.Channel,
      { _id: channelId as Ref<Doc> } as Record<string, unknown>
    )
    if (doc == null) {
      doc = await client.findOne<Doc>(
        CHUNTER_CLASS.DirectMessage,
        { _id: channelId as Ref<Doc> } as Record<string, unknown>
      )
    }
    if (doc == null) return []

    const record = doc as unknown as Record<string, unknown>
    const members = Array.isArray(record.members) ? record.members : []
    return members.map((m) => ({
      memberId: String(m),
      role: 'member',
    }))
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getChannelMembers', error)
  }
}

// ---------------------------------------------------------------------------
// Pinned messages
// ---------------------------------------------------------------------------

/**
 * Fetch pinned messages in a channel.
 */
export async function getPinnedMessages(channelId: string): Promise<MessageItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getPinnedMessages')
  }

  try {
    const result = await client.findAll<Doc>(
      CHUNTER_CLASS.ChatMessage,
      {
        space: channelId as Ref<Space>,
        pinned: true,
      } as Record<string, unknown>,
      {
        sort: { createdOn: SortingOrder.Descending } as Record<string, SortingOrder>,
        limit: 100,
      }
    )

    return [...result].map(docToMessageItem)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getPinnedMessages', error)
  }
}

// ---------------------------------------------------------------------------
// Channel CRUD
// ---------------------------------------------------------------------------

/** Parameters for creating a new channel. */
export interface CreateChannelParams {
  name: string
  description?: string
  isPrivate?: boolean
  memberIds?: string[]
}

/**
 * Create a new channel.
 */
export async function createChannel(params: CreateChannelParams): Promise<ChannelItem> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'createChannel')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const attrs: Record<string, unknown> = {
      name: params.name,
      description: params.description ?? '',
      private: params.isPrivate ?? false,
      members: params.memberIds ?? [],
    }

    const tx = factory.createTxCreateDoc(
      CHUNTER_CLASS.Channel as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>, // Channels are spaces themselves, space field is set by server
      attrs as unknown as Record<string, unknown>
    )

    await client.tx(tx)

    return {
      _id: tx.objectId as string,
      _class: CHUNTER_CLASS.Channel as string,
      name: params.name,
      description: params.description ?? '',
      members: params.memberIds ?? [],
      lastMessage: '',
      lastMessageTimestamp: 0,
      space: tx.objectId as string,
      private: params.isPrivate ?? false,
      createdOn: Date.now(),
      modifiedOn: Date.now(),
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'createChannel', error)
  }
}

/**
 * Update a channel's metadata.
 */
export async function updateChannel(
  channelId: string,
  updates: { name?: string; description?: string }
): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'updateChannel')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const ops: Record<string, unknown> = {}
    if (updates.name != null) ops.name = updates.name
    if (updates.description != null) ops.description = updates.description

    const tx = factory.createTxUpdateDoc(
      CHUNTER_CLASS.Channel as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      channelId as Ref<Doc>,
      ops
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'updateChannel', error)
  }
}

/**
 * Delete a channel.
 */
export async function deleteChannel(channelId: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'deleteChannel')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const tx = factory.createTxRemoveDoc(
      CHUNTER_CLASS.Channel as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      channelId as Ref<Doc>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'deleteChannel', error)
  }
}

/**
 * Archive a channel (set archived: true).
 */
export async function archiveChannel(channelId: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'archiveChannel')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const tx = factory.createTxUpdateDoc(
      CHUNTER_CLASS.Channel as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      channelId as Ref<Doc>,
      { archived: true } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'archiveChannel', error)
  }
}

/**
 * Join a channel (add current user to members).
 */
export async function joinChannel(channelId: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'joinChannel')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const tx = factory.createTxUpdateDoc(
      CHUNTER_CLASS.Channel as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      channelId as Ref<Doc>,
      { $push: { members: account.primarySocialId } } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'joinChannel', error)
  }
}

/**
 * Leave a channel (remove current user from members).
 */
export async function leaveChannel(channelId: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'leaveChannel')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const tx = factory.createTxUpdateDoc(
      CHUNTER_CLASS.Channel as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      channelId as Ref<Doc>,
      { $pull: { members: account.primarySocialId } } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'leaveChannel', error)
  }
}

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

/**
 * Create a direct message conversation with one user.
 */
export async function createDirectMessage(memberId: string): Promise<ChannelItem> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'createDirectMessage')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const attrs: Record<string, unknown> = {
      members: [account.primarySocialId, memberId],
    }

    const tx = factory.createTxCreateDoc(
      CHUNTER_CLASS.DirectMessage as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      attrs as unknown as Record<string, unknown>
    )

    await client.tx(tx)

    return {
      _id: tx.objectId as string,
      _class: CHUNTER_CLASS.DirectMessage as string,
      name: '',
      description: '',
      members: [account.primarySocialId, memberId],
      lastMessage: '',
      lastMessageTimestamp: 0,
      space: tx.objectId as string,
      private: true,
      createdOn: Date.now(),
      modifiedOn: Date.now(),
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'createDirectMessage', error)
  }
}

/**
 * Create a group direct message conversation.
 */
export async function createGroupDM(memberIds: string[]): Promise<ChannelItem> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'createGroupDM')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const allMembers = [account.primarySocialId, ...memberIds]

    const attrs: Record<string, unknown> = {
      members: allMembers,
    }

    const tx = factory.createTxCreateDoc(
      CHUNTER_CLASS.DirectMessage as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      attrs as unknown as Record<string, unknown>
    )

    await client.tx(tx)

    return {
      _id: tx.objectId as string,
      _class: CHUNTER_CLASS.DirectMessage as string,
      name: '',
      description: '',
      members: allMembers,
      lastMessage: '',
      lastMessageTimestamp: 0,
      space: tx.objectId as string,
      private: true,
      createdOn: Date.now(),
      modifiedOn: Date.now(),
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'createGroupDM', error)
  }
}

// ---------------------------------------------------------------------------
// Edit / Delete / Pin messages
// ---------------------------------------------------------------------------

/**
 * Edit a message's content.
 */
export async function editMessage(messageId: string, content: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'editMessage')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    // Find the message to get its space
    const msgDoc = await client.findOne<Doc>(
      CHUNTER_CLASS.ChatMessage,
      { _id: messageId as Ref<Doc> } as Record<string, unknown>
    )

    const msgSpace = msgDoc != null
      ? String((msgDoc as unknown as Record<string, unknown>).space ?? '')
      : ''

    const tx = factory.createTxUpdateDoc(
      CHUNTER_CLASS.ChatMessage as unknown as Ref<Class<Doc>>,
      msgSpace as Ref<Space>,
      messageId as Ref<Doc>,
      { message: content } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'editMessage', error)
  }
}

/**
 * Delete a message.
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'deleteMessage')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    // Find the message to get its space
    const msgDoc = await client.findOne<Doc>(
      CHUNTER_CLASS.ChatMessage,
      { _id: messageId as Ref<Doc> } as Record<string, unknown>
    )

    const msgSpace = msgDoc != null
      ? String((msgDoc as unknown as Record<string, unknown>).space ?? '')
      : ''

    const tx = factory.createTxRemoveDoc(
      CHUNTER_CLASS.ChatMessage as unknown as Ref<Class<Doc>>,
      msgSpace as Ref<Space>,
      messageId as Ref<Doc>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'deleteMessage', error)
  }
}

/**
 * Pin a message in a channel.
 */
export async function pinMessage(messageId: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'pinMessage')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const msgDoc = await client.findOne<Doc>(
      CHUNTER_CLASS.ChatMessage,
      { _id: messageId as Ref<Doc> } as Record<string, unknown>
    )

    const msgSpace = msgDoc != null
      ? String((msgDoc as unknown as Record<string, unknown>).space ?? '')
      : ''

    const tx = factory.createTxUpdateDoc(
      CHUNTER_CLASS.ChatMessage as unknown as Ref<Class<Doc>>,
      msgSpace as Ref<Space>,
      messageId as Ref<Doc>,
      { pinned: true } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'pinMessage', error)
  }
}

/**
 * Unpin a message in a channel.
 */
export async function unpinMessage(messageId: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'unpinMessage')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const msgDoc = await client.findOne<Doc>(
      CHUNTER_CLASS.ChatMessage,
      { _id: messageId as Ref<Doc> } as Record<string, unknown>
    )

    const msgSpace = msgDoc != null
      ? String((msgDoc as unknown as Record<string, unknown>).space ?? '')
      : ''

    const tx = factory.createTxUpdateDoc(
      CHUNTER_CLASS.ChatMessage as unknown as Ref<Class<Doc>>,
      msgSpace as Ref<Space>,
      messageId as Ref<Doc>,
      { pinned: false } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'unpinMessage', error)
  }
}

// ---------------------------------------------------------------------------
// Search messages
// ---------------------------------------------------------------------------

/**
 * Search messages within a channel by text content.
 */
export async function searchMessages(
  channelId: string,
  query: string
): Promise<MessageItem[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'searchMessages')
  }

  try {
    const result = await client.findAll<Doc>(
      CHUNTER_CLASS.ChatMessage,
      {
        space: channelId as Ref<Space>,
        message: { $like: `%${query}%` },
      } as Record<string, unknown>,
      {
        sort: { createdOn: SortingOrder.Descending } as Record<string, SortingOrder>,
        limit: 50,
      }
    )

    return [...result].map(docToMessageItem)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'searchMessages', error)
  }
}

// ---------------------------------------------------------------------------
// Channel member management
// ---------------------------------------------------------------------------

/**
 * Add a member to a channel.
 */
export async function addChannelMember(channelId: string, memberId: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'addChannelMember')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const tx = factory.createTxUpdateDoc(
      CHUNTER_CLASS.Channel as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      channelId as Ref<Doc>,
      { $push: { members: memberId } } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'addChannelMember', error)
  }
}

/**
 * Remove a member from a channel.
 */
export async function removeChannelMember(channelId: string, memberId: string): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'removeChannelMember')
  }

  try {
    const { TxFactory } = await import('@hcengineering/core')
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const tx = factory.createTxUpdateDoc(
      CHUNTER_CLASS.Channel as unknown as Ref<Class<Doc>>,
      '' as Ref<Space>,
      channelId as Ref<Doc>,
      { $pull: { members: memberId } } as unknown as Record<string, unknown>
    )

    await client.tx(tx)
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'removeChannelMember', error)
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
    pinned: Boolean(record.isPinned ?? record.pinned ?? false),
    attachments,
  }
}
