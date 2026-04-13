/**
 * Chat invalidation rules.
 *
 * Maps chat-related Tx broadcasts to TanStack Query invalidations:
 * - ChatMessage create -> invalidate messages for that channel
 * - Channel modify -> invalidate channels list
 * - ChatMessage create for non-active channel -> increment unread
 */

import type { QueryClient } from '@tanstack/react-query'

import { registerInvalidationRule, type TxCUDInfo } from '../invalidation'
import { useChatStore } from '@/store/chat'

// ---------------------------------------------------------------------------
// Class refs (string constants to avoid value imports from plugin packages)
// ---------------------------------------------------------------------------

/** Matches chunter:class:ChatMessage and related message classes */
const MESSAGE_CLASSES = [
  'chunter:class:ChatMessage',
  'chunter:class:ThreadMessage',
  'chunter:class:ChunterMessage',
]

const CHANNEL_CLASSES = [
  'chunter:class:Channel',
  'chunter:class:DirectMessage',
]

/** Activity message classes that also indicate chat activity */
const ACTIVITY_CLASSES = [
  'activity:class:ActivityMessage',
  'chunter:class:ChatMessage',
]

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

function chatInvalidationRule(tx: TxCUDInfo, queryClient: QueryClient): boolean {
  let handled = false

  // Message created/updated/removed -> invalidate messages for that channel
  if (MESSAGE_CLASSES.includes(tx.objectClass) || ACTIVITY_CLASSES.includes(tx.objectClass)) {
    if (tx.objectSpace !== undefined) {
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'messages', tx.objectSpace],
      })
      handled = true

      // Also invalidate thread if this is a reply (has attachedTo)
      if (tx.attachedTo !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: ['chat', 'thread', tx.attachedTo],
        })
      }
    }

    // Increment unread for non-active channels on message create
    if (tx.type === 'create' && tx.objectSpace !== undefined) {
      const activeChannelId = useChatStore.getState().activeChannelId
      if (activeChannelId !== tx.objectSpace) {
        useChatStore.getState().incrementUnread(tx.objectSpace)
      }
    }

    // Always refresh channels (last message preview / order may change)
    void queryClient.invalidateQueries({
      queryKey: ['chat', 'channels'],
    })
    handled = true
  }

  // Channel created/modified -> invalidate channel list
  if (CHANNEL_CLASSES.includes(tx.objectClass)) {
    void queryClient.invalidateQueries({
      queryKey: ['chat', 'channels'],
    })
    handled = true
  }

  // Unread context updates
  if (tx.objectClass === 'notification:class:DocNotifyContext') {
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

export function registerChatRules(): void {
  registerInvalidationRule(chatInvalidationRule)
}
