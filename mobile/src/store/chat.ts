/**
 * Chat Zustand store.
 *
 * Manages client-side chat state: unread counts, message drafts, and
 * active channel tracking. In-memory only -- drafts are not persisted.
 * Unread counts are used for tab badge and channel row indicators.
 */

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatState {
  /** Unread message count per channel/DM. */
  unreadCounts: Map<string, number>

  /** In-memory draft messages per channel/DM. */
  draftMessages: Map<string, string>

  /** Currently active (open) channel ID. */
  activeChannelId: string | null

  /** Total unread count across all channels (for tab badge). */
  unreadTotal: number

  // Actions
  setUnreadCount: (channelId: string, count: number) => void
  clearUnread: (channelId: string) => void
  incrementUnread: (channelId: string) => void
  resetAllUnread: () => void

  saveDraft: (channelId: string, text: string) => void
  getDraft: (channelId: string) => string
  clearDraft: (channelId: string) => void

  setActiveChannel: (channelId: string | null) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeTotal(counts: Map<string, number>): number {
  let total = 0
  counts.forEach((count) => {
    total += count
  })
  return total
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatState>((set, get) => ({
  unreadCounts: new Map(),
  draftMessages: new Map(),
  activeChannelId: null,
  unreadTotal: 0,

  setUnreadCount: (channelId: string, count: number) => {
    set((state) => {
      const next = new Map(state.unreadCounts)
      if (count <= 0) {
        next.delete(channelId)
      } else {
        next.set(channelId, count)
      }
      return { unreadCounts: next, unreadTotal: computeTotal(next) }
    })
  },

  clearUnread: (channelId: string) => {
    set((state) => {
      const next = new Map(state.unreadCounts)
      next.delete(channelId)
      return { unreadCounts: next, unreadTotal: computeTotal(next) }
    })
  },

  incrementUnread: (channelId: string) => {
    set((state) => {
      const next = new Map(state.unreadCounts)
      const current = next.get(channelId) ?? 0
      next.set(channelId, current + 1)
      return { unreadCounts: next, unreadTotal: computeTotal(next) }
    })
  },

  resetAllUnread: () => {
    set({ unreadCounts: new Map(), unreadTotal: 0 })
  },

  saveDraft: (channelId: string, text: string) => {
    set((state) => {
      const next = new Map(state.draftMessages)
      if (text.length === 0) {
        next.delete(channelId)
      } else {
        next.set(channelId, text)
      }
      return { draftMessages: next }
    })
  },

  getDraft: (channelId: string) => {
    return get().draftMessages.get(channelId) ?? ''
  },

  clearDraft: (channelId: string) => {
    set((state) => {
      const next = new Map(state.draftMessages)
      next.delete(channelId)
      return { draftMessages: next }
    })
  },

  setActiveChannel: (channelId: string | null) => {
    set({ activeChannelId: channelId })
  },
}))
