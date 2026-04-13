/**
 * Notification invalidation rules.
 *
 * Maps notification-related Tx broadcasts to TanStack Query invalidations:
 * - InboxNotification create/update -> invalidate notification queries + unread count
 * - DocNotifyContext changes -> invalidate unread count
 */

import type { QueryClient } from '@tanstack/react-query'

import { registerInvalidationRule, type TxCUDInfo } from '../invalidation'

// ---------------------------------------------------------------------------
// Class refs
// ---------------------------------------------------------------------------

const NOTIFICATION_CLASSES = [
  'notification:class:InboxNotification',
  'notification:class:ActivityInboxNotification',
  'notification:class:MentionInboxNotification',
  'notification:class:CommonInboxNotification',
]

const NOTIFY_CONTEXT_CLASS = 'notification:class:DocNotifyContext'

// ---------------------------------------------------------------------------
// Query key constants (aligned with useNotifications.ts)
// ---------------------------------------------------------------------------

const NOTIFICATIONS_ALL = ['notifications']
const NOTIFICATIONS_UNREAD = ['notifications', 'unreadCount']

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

function notificationInvalidationRule(tx: TxCUDInfo, queryClient: QueryClient): boolean {
  let handled = false

  // InboxNotification create/update/remove -> invalidate all notification queries
  if (NOTIFICATION_CLASSES.includes(tx.objectClass)) {
    void queryClient.invalidateQueries({
      queryKey: NOTIFICATIONS_ALL,
    })
    void queryClient.invalidateQueries({
      queryKey: NOTIFICATIONS_UNREAD,
    })
    handled = true
  }

  // DocNotifyContext changes -> refresh unread count
  if (tx.objectClass === NOTIFY_CONTEXT_CLASS) {
    void queryClient.invalidateQueries({
      queryKey: NOTIFICATIONS_UNREAD,
    })
    // Also invalidate chat unread contexts
    void queryClient.invalidateQueries({
      queryKey: ['chat', 'unread-contexts'],
    })
    handled = true
  }

  return handled
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerNotificationRules(): void {
  registerInvalidationRule(notificationInvalidationRule)
}
