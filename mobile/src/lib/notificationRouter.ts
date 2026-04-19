/**
 * Notification deep-link router.
 *
 * Maps a notification's objectClass to the appropriate in-app route.
 * Used by the notification list row press handler and the notification
 * detail screen to navigate to the source document.
 *
 * Uses plain class-ref strings to avoid value imports from plugin
 * packages that transitively depend on svelte.
 */

// ---------------------------------------------------------------------------
// Class ref constants
// ---------------------------------------------------------------------------

const TRACKER_ISSUE = 'tracker:class:Issue'
const CHUNTER_CHANNEL = 'chunter:class:Channel'
const CHUNTER_DIRECT_MESSAGE = 'chunter:class:DirectMessage'
const CHUNTER_CHAT_MESSAGE = 'chunter:class:ChatMessage'
const ACTIVITY_MESSAGE = 'activity:class:ActivityMessage'

// Expanded coverage (TASK-006). These fall back to the inbox detail screen
// because the mobile app does not yet ship dedicated HR/recruit/document/board
// surfaces, but they are still treated as known so we do not log them as
// "unrecognized class" in analytics.
const HR_DEPARTMENT = 'hr:class:Department'
const RECRUIT_APPLICANT = 'recruit:class:Applicant'
const DOCUMENT_DOCUMENT = 'document:class:Document'
const BOARD_CARD = 'board:class:Card'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeepLinkResult {
  /** The expo-router path to navigate to */
  path: string
  /** Whether the target type is known and has a dedicated screen */
  isKnown: boolean
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Build the inbox detail fallback path for a notification, or the inbox root
 * if no notification id is available.
 */
function inboxFallback(notificationId?: string): string {
  if (notificationId != null && notificationId !== '') {
    return `/(app)/inbox/notification/${notificationId}`
  }
  return '/(app)/inbox'
}

/**
 * Resolve a notification's objectClass + objectId into an in-app route.
 *
 * Returns `isKnown: false` for unrecognized object classes, which should
 * show a fallback detail screen instead of navigating.
 */
export function resolveNotificationRoute(
  objectClass: string,
  objectId: string,
  notificationId?: string
): DeepLinkResult {
  switch (objectClass) {
    case TRACKER_ISSUE:
      return {
        path: `/(app)/tracker/issue/${objectId}`,
        isKnown: true,
      }

    case CHUNTER_CHANNEL:
    case CHUNTER_DIRECT_MESSAGE:
      return {
        path: `/(app)/chat/channel/${objectId}`,
        isKnown: true,
      }

    case CHUNTER_CHAT_MESSAGE:
    case ACTIVITY_MESSAGE:
      return {
        path: inboxFallback(notificationId),
        isKnown: false,
      }

    // Known object classes without dedicated mobile surfaces: route to the
    // inbox detail screen so the user can still read the notification body,
    // but report them as known so the default case does not fire.
    case HR_DEPARTMENT:
    case RECRUIT_APPLICANT:
    case DOCUMENT_DOCUMENT:
    case BOARD_CARD:
      return {
        path: inboxFallback(notificationId),
        isKnown: true,
      }

    default:
      return {
        path: inboxFallback(notificationId),
        isKnown: false,
      }
  }
}

/**
 * Check if an objectClass maps to a known deep-link target.
 *
 * Includes classes with dedicated surfaces (tracker, chunter channels) as
 * well as classes whose mobile surface is the inbox detail fallback
 * (hr, recruit, document, board) so that unknown-class analytics do not
 * fire for these.
 */
export function isKnownObjectClass(objectClass: string): boolean {
  return [
    TRACKER_ISSUE,
    CHUNTER_CHANNEL,
    CHUNTER_DIRECT_MESSAGE,
    HR_DEPARTMENT,
    RECRUIT_APPLICANT,
    DOCUMENT_DOCUMENT,
    BOARD_CARD,
  ].includes(objectClass)
}
