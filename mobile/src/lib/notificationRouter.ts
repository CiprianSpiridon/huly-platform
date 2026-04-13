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
 * Resolve a notification's objectClass + objectId into an in-app route.
 *
 * Returns `isKnown: false` for unrecognized object classes, which should
 * show a fallback detail screen instead of navigating.
 */
export function resolveNotificationRoute(
  objectClass: string,
  objectId: string
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
      // Activity/chat messages -- navigate to the parent context
      // For now, show the fallback detail since we don't have the
      // parent channel ID readily available
      return {
        path: `/(app)/inbox/notification/${objectId}`,
        isKnown: false,
      }

    default:
      return {
        path: `/(app)/inbox/notification/${objectId}`,
        isKnown: false,
      }
  }
}

/**
 * Check if an objectClass maps to a known deep-link target.
 */
export function isKnownObjectClass(objectClass: string): boolean {
  return [TRACKER_ISSUE, CHUNTER_CHANNEL, CHUNTER_DIRECT_MESSAGE].includes(objectClass)
}
