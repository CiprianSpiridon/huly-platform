/**
 * Notification repository.
 *
 * Domain-specific data access for inbox notifications and notification
 * contexts. Uses `import type` exclusively for notification types to
 * avoid pulling in svelte via the @hcengineering/ui transitive dependency.
 *
 * All class refs are declared as plain strings matching the Huly plugin
 * namespace, avoiding value imports from @hcengineering/notification.
 */

import {
  SortingOrder,
  TxFactory,
  type Class,
  type Doc,
  type DocumentQuery,
  type Ref,
  type Space,
} from '@hcengineering/core'

import { getClient } from '@/client'
import { RepositoryError, wrapRepositoryError } from './base'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Huly class refs for notification types.
 *
 * Declared as plain strings matching the plugin namespace to avoid
 * value imports from @hcengineering/notification which transitively
 * pulls in svelte via @hcengineering/ui.
 */
const NOTIFICATION_CLASS = {
  InboxNotification: 'notification:class:InboxNotification' as Ref<Class<Doc>>,
  ActivityInboxNotification: 'notification:class:ActivityInboxNotification' as Ref<Class<Doc>>,
  MentionInboxNotification: 'notification:class:MentionInboxNotification' as Ref<Class<Doc>>,
  ReactionInboxNotification: 'notification:class:ReactionInboxNotification' as Ref<Class<Doc>>,
  DocNotifyContext: 'notification:class:DocNotifyContext' as Ref<Class<Doc>>,
} as const

const DOMAIN = 'notification'
const DEFAULT_PAGE_SIZE = 30
const BATCH_CHUNK_SIZE = 50

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationFilterType = 'all' | 'mentions' | 'reactions' | 'updates'

export type NotificationReadStatus = 'all' | 'read' | 'unread'

export interface NotificationFilters {
  type?: NotificationFilterType
  readStatus?: NotificationReadStatus
  archived?: boolean
}

export interface NotificationPagination {
  cursor?: string
  limit?: number
}

/**
 * Minimal notification item for the mobile UI.
 * Avoids leaking the full InboxNotification shape into components.
 */
export interface NotificationItem {
  _id: string
  _class: string
  isViewed: boolean
  archived: boolean
  title: string
  body: string
  objectId: string
  objectClass: string
  createdOn: number
  modifiedOn: number
  modifiedBy: string
  /** Notification subtype for filtering */
  notificationType: NotificationFilterType
  /** Ref to DocNotifyContext linking this notification to its source document (for grouping) */
  docNotifyContext: string
}

export interface PaginatedNotifications {
  items: NotificationItem[]
  total: number
  hasMore: boolean
  nextCursor: string | undefined
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classForFilter(
  type: NotificationFilterType | undefined
): Ref<Class<Doc>> {
  switch (type) {
    case 'mentions':
      return NOTIFICATION_CLASS.MentionInboxNotification as Ref<Class<Doc>>
    case 'reactions':
      return NOTIFICATION_CLASS.ReactionInboxNotification as Ref<Class<Doc>>
    case 'updates':
      return NOTIFICATION_CLASS.ActivityInboxNotification as Ref<Class<Doc>>
    default:
      return NOTIFICATION_CLASS.InboxNotification as Ref<Class<Doc>>
  }
}

function inferNotificationType(doc: Record<string, unknown>): NotificationFilterType {
  const cls = String(doc._class ?? '')
  if (cls.includes('Mention')) return 'mentions'
  if (cls.includes('Reaction')) return 'reactions'
  if (cls.includes('Activity')) return 'updates'
  return 'all'
}

function toNotificationItem(doc: Doc): NotificationItem {
  const record = doc as unknown as Record<string, unknown>
  return {
    _id: String(record._id ?? ''),
    _class: String(record._class ?? ''),
    isViewed: Boolean(record.isViewed),
    archived: Boolean(record.archived),
    title: String(record.title ?? ''),
    body: String(record.body ?? record.message ?? record.messageHtml ?? ''),
    objectId: String(record.objectId ?? ''),
    objectClass: String(record.objectClass ?? ''),
    createdOn: Number(record.createdOn ?? record.modifiedOn ?? 0),
    modifiedOn: Number(record.modifiedOn ?? 0),
    modifiedBy: String(record.modifiedBy ?? ''),
    notificationType: inferNotificationType(record),
    docNotifyContext: String(record.docNotifyContext ?? ''),
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch notifications with optional type filter and cursor-based pagination.
 */
export async function getNotifications(
  filters?: NotificationFilters,
  pagination?: NotificationPagination
): Promise<PaginatedNotifications> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getNotifications')
  }

  try {
    const _class = classForFilter(filters?.type)
    const limit = pagination?.limit ?? DEFAULT_PAGE_SIZE

    // Default to non-archived list unless explicitly requested otherwise.
    const archivedFilter = filters?.archived ?? false
    const query: Record<string, unknown> = { archived: archivedFilter }

    // Read/unread filter maps to the server-side isViewed boolean.
    if (filters?.readStatus === 'read') {
      query.isViewed = true
    } else if (filters?.readStatus === 'unread') {
      query.isViewed = false
    }

    // Use cursor as a modifiedOn upper bound for pagination
    if (pagination?.cursor !== undefined) {
      query.modifiedOn = { $lt: Number(pagination.cursor) }
    }

    const result = await client.findAll(
      _class,
      query as Record<string, unknown>,
      {
        sort: { modifiedOn: SortingOrder.Descending } as Record<string, SortingOrder>,
        limit: limit + 1, // Fetch one extra to detect hasMore
        total: true,
      }
    )

    const docs = [...result]
    const hasMore = docs.length > limit
    const items = hasMore ? docs.slice(0, limit) : docs
    const mapped = items.map(toNotificationItem)
    const lastItem = mapped[mapped.length - 1]
    const nextCursor = hasMore && lastItem !== undefined
      ? String(lastItem.modifiedOn)
      : undefined

    return {
      items: mapped,
      total: result.total,
      hasMore,
      nextCursor,
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getNotifications', error)
  }
}

/**
 * Minimal DocNotifyContext info used to build inbox group cards.
 */
export interface NotifyContextInfo {
  _id: string
  objectId: string
  objectClass: string
  title: string | undefined
}

/**
 * Fetch minimal context metadata for a set of DocNotifyContext IDs.
 *
 * Returns a Map keyed by context ref. Unknown IDs are silently omitted so
 * the caller can fall back to a class-based label.
 */
export async function getNotifyContextsByIds(
  ids: string[]
): Promise<Map<string, NotifyContextInfo>> {
  const map = new Map<string, NotifyContextInfo>()
  const uniqueIds = Array.from(new Set(ids.filter((id) => id !== '')))
  if (uniqueIds.length === 0) return map

  const client = getClient()
  if (client === null) return map

  try {
    const result = await client.findAll(
      NOTIFICATION_CLASS.DocNotifyContext,
      { _id: { $in: uniqueIds } as unknown as DocumentQuery<Doc>['_id'] },
      {
        projection: {
          _id: 1,
          objectId: 1,
          objectClass: 1,
          title: 1,
        } as Record<string, number>,
      }
    )
    for (const doc of result) {
      const record = doc as unknown as Record<string, unknown>
      const id = String(record._id ?? '')
      if (id === '') continue
      const titleRaw = record.title
      map.set(id, {
        _id: id,
        objectId: String(record.objectId ?? ''),
        objectClass: String(record.objectClass ?? ''),
        title: typeof titleRaw === 'string' && titleRaw !== '' ? titleRaw : undefined,
      })
    }
  } catch {
    // Missing/unknown contexts are not fatal -- caller falls back to the
    // object class label for grouping display.
  }

  return map
}

/**
 * Humanize a Huly class ref like `tracker:class:Issue` into `Issue`.
 * Used as the group fallback label when no resolved title is available.
 */
export function humanizeObjectClass(classRef: string): string {
  if (classRef === '') return 'Document'
  const parts = classRef.split(':')
  const last = parts[parts.length - 1]
  if (last === undefined || last === '') return 'Document'
  return last
}

/**
 * Fetch notification contexts for the current user.
 *
 * Filters by the authenticated account's UUID. Without this filter, a
 * transactor that returns mixed data would leak other users' contexts into
 * the current user's inbox.
 */
export async function getNotificationContexts(): Promise<Doc[]> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'getNotificationContexts')
  }

  try {
    const account = await client.getAccount()
    const result = await client.findAll(
      NOTIFICATION_CLASS.DocNotifyContext,
      { user: account.uuid, hidden: false } as Record<string, unknown>,
      { sort: { lastUpdateTimestamp: SortingOrder.Descending } as Record<string, SortingOrder> }
    )
    return [...result]
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'getNotificationContexts', error)
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Mark specific notifications as read.
 */
export async function markAsRead(ids: string[]): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'markAsRead')
  }

  try {
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    // Fetch notifications to get their real space (PersonSpace)
    const notifications = await client.findAll(
      NOTIFICATION_CLASS.InboxNotification as Ref<Class<Doc>>,
      { _id: { $in: ids } as unknown as DocumentQuery<Doc>['_id'] }
    )
    const txes = notifications.map((notif) =>
      factory.createTxUpdateDoc(
        notif._class,
        notif.space,
        notif._id,
        { isViewed: true } as Record<string, unknown>
      )
    )
    // Send in chunks of 50 to avoid overwhelming the server
    for (let i = 0; i < txes.length; i += BATCH_CHUNK_SIZE) {
      const chunk = txes.slice(i, i + BATCH_CHUNK_SIZE)
      await Promise.all(chunk.map((tx) => client.tx(tx)))
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'markAsRead', error)
  }
}

/**
 * Mark all non-archived notifications as read.
 */
export async function markAllAsRead(): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'markAllAsRead')
  }

  try {
    // Fetch all unread notifications
    const result = await client.findAll(
      NOTIFICATION_CLASS.InboxNotification as Ref<Class<Doc>>,
      { isViewed: false, archived: false } as Record<string, unknown>,
      { projection: { _id: 1, _class: 1, space: 1 } as Record<string, number> }
    )

    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const txes = [...result].map((doc) =>
      factory.createTxUpdateDoc(
        doc._class,
        doc.space,
        doc._id,
        { isViewed: true } as Record<string, unknown>
      )
    )
    // Send in chunks of 50 to avoid overwhelming the server
    for (let i = 0; i < txes.length; i += BATCH_CHUNK_SIZE) {
      const chunk = txes.slice(i, i + BATCH_CHUNK_SIZE)
      await Promise.all(chunk.map((tx) => client.tx(tx)))
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'markAllAsRead', error)
  }
}

/**
 * Archive specific notifications.
 */
export async function archiveNotifications(ids: string[]): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'archiveNotifications')
  }

  try {
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    // Fetch notifications to get their real space
    const notifications = await client.findAll(
      NOTIFICATION_CLASS.InboxNotification as Ref<Class<Doc>>,
      { _id: { $in: ids } as unknown as DocumentQuery<Doc>['_id'] }
    )
    const txes = notifications.map((notif) =>
      factory.createTxUpdateDoc(
        notif._class,
        notif.space,
        notif._id,
        { archived: true, isViewed: true } as Record<string, unknown>
      )
    )
    // Send in chunks of 50 to avoid overwhelming the server
    for (let i = 0; i < txes.length; i += BATCH_CHUNK_SIZE) {
      const chunk = txes.slice(i, i + BATCH_CHUNK_SIZE)
      await Promise.all(chunk.map((tx) => client.tx(tx)))
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'archiveNotifications', error)
  }
}

/**
 * Archive all non-archived notifications.
 */
export async function archiveAll(): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'archiveAll')
  }

  try {
    const result = await client.findAll(
      NOTIFICATION_CLASS.InboxNotification as Ref<Class<Doc>>,
      { archived: false } as Record<string, unknown>,
      { projection: { _id: 1, _class: 1, space: 1 } as Record<string, number> }
    )

    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    const txes = [...result].map((doc) =>
      factory.createTxUpdateDoc(
        doc._class,
        doc.space,
        doc._id,
        { archived: true, isViewed: true } as Record<string, unknown>
      )
    )
    // Send in chunks of 50 to avoid overwhelming the server
    for (let i = 0; i < txes.length; i += BATCH_CHUNK_SIZE) {
      const chunk = txes.slice(i, i + BATCH_CHUNK_SIZE)
      await Promise.all(chunk.map((tx) => client.tx(tx)))
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'archiveAll', error)
  }
}

/**
 * Restore (unarchive) previously archived notifications.
 */
export async function unarchiveNotifications(ids: string[]): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'unarchiveNotifications')
  }

  if (ids.length === 0) return

  try {
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    // Fetch notifications (including archived) so we can target their real space.
    const notifications = await client.findAll(
      NOTIFICATION_CLASS.InboxNotification as Ref<Class<Doc>>,
      { _id: { $in: ids } as unknown as DocumentQuery<Doc>['_id'] }
    )
    const txes = notifications.map((notif) =>
      factory.createTxUpdateDoc(
        notif._class,
        notif.space,
        notif._id,
        { archived: false } as Record<string, unknown>
      )
    )
    for (let i = 0; i < txes.length; i += BATCH_CHUNK_SIZE) {
      const chunk = txes.slice(i, i + BATCH_CHUNK_SIZE)
      await Promise.all(chunk.map((tx) => client.tx(tx)))
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'unarchiveNotifications', error)
  }
}

/**
 * Permanently delete notifications by ID.
 *
 * Uses TxFactory.createTxRemoveDoc() to issue a hard-delete transaction for
 * each notification. IDs that no longer exist (already removed on the
 * server) are silently skipped rather than raising: we only emit remove
 * transactions for notifications we were able to re-fetch.
 */
export async function deleteNotifications(ids: string[]): Promise<void> {
  const client = getClient()
  if (client === null) {
    throw new RepositoryError('HulyClient not connected', DOMAIN, 'deleteNotifications')
  }

  if (ids.length === 0) return

  try {
    const account = await client.getAccount()
    const factory = new TxFactory(account.primarySocialId)

    // Re-fetch notifications so we have their real class + space. Any IDs
    // missing from the result have already been removed and are dropped.
    const notifications = await client.findAll(
      NOTIFICATION_CLASS.InboxNotification as Ref<Class<Doc>>,
      { _id: { $in: ids } as unknown as DocumentQuery<Doc>['_id'] }
    )

    const txes = notifications.map((notif) =>
      factory.createTxRemoveDoc(notif._class, notif.space, notif._id)
    )
    for (let i = 0; i < txes.length; i += BATCH_CHUNK_SIZE) {
      const chunk = txes.slice(i, i + BATCH_CHUNK_SIZE)
      await Promise.all(chunk.map((tx) => client.tx(tx)))
    }
  } catch (error) {
    throw wrapRepositoryError(DOMAIN, 'deleteNotifications', error)
  }
}

/**
 * Get the count of unread, non-archived notifications.
 */
export async function getUnreadCount(): Promise<number> {
  const client = getClient()
  if (client === null) {
    return 0 // Graceful fallback when disconnected
  }

  try {
    const result = await client.findAll(
      NOTIFICATION_CLASS.InboxNotification as Ref<Class<Doc>>,
      { isViewed: false, archived: false } as Record<string, unknown>,
      {
        limit: 1,
        total: true,
        projection: { _id: 1 } as Record<string, number>,
      }
    )
    return result.total
  } catch {
    return 0 // Return cached/fallback count on error
  }
}
