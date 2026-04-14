/**
 * Chat Zustand store.
 *
 * Manages client-side chat state: unread counts, message drafts,
 * active channel tracking, persistent drafts, typing indicators,
 * and muted channels. Persistent drafts are synced to AsyncStorage.
 * Unread counts are used for tab badge and channel row indicators.
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERSISTENT_DRAFTS_KEY = 'chat:persistentDrafts'
const MUTED_CHANNELS_KEY = 'chat:mutedChannels'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatState {
  /** Unread message count per channel/DM. */
  unreadCounts: Record<string, number>

  /** In-memory draft messages per channel/DM. */
  draftMessages: Map<string, string>

  /** Persistent drafts synced to AsyncStorage (Map<channelId, string>). */
  persistentDrafts: Map<string, string>

  /** Currently active (open) channel ID. */
  activeChannelId: string | null

  /** Total unread count across all channels (for tab badge). */
  unreadTotal: number

  /** Typing indicator state: which users are typing in each channel. */
  typingUsers: Map<string, string[]>

  /** Set of muted channel IDs (persisted to AsyncStorage). */
  mutedChannels: Set<string>

  /** Message currently being edited (for inline edit mode). */
  editingMessageId: string | null

  // Actions
  setUnreadCount: (channelId: string, count: number) => void
  clearUnread: (channelId: string) => void
  incrementUnread: (channelId: string) => void
  resetAllUnread: () => void

  saveDraft: (channelId: string, text: string) => void
  getDraft: (channelId: string) => string
  clearDraft: (channelId: string) => void

  savePersistentDraft: (channelId: string, text: string) => void
  clearPersistentDraft: (channelId: string) => void
  loadPersistentDrafts: () => Promise<void>

  setTypingUsers: (channelId: string, userIds: string[]) => void

  muteChannel: (channelId: string) => void
  unmuteChannel: (channelId: string) => void
  isChannelMuted: (channelId: string) => boolean
  loadMutedChannels: () => Promise<void>

  setEditingMessage: (messageId: string | null) => void

  setActiveChannel: (channelId: string | null) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeTotal(counts: Record<string, number>): number {
  let total = 0
  for (const key in counts) {
    total += counts[key]!
  }
  return total
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatState>((set, get) => ({
  unreadCounts: {},
  draftMessages: new Map(),
  persistentDrafts: new Map(),
  activeChannelId: null,
  unreadTotal: 0,
  typingUsers: new Map(),
  mutedChannels: new Set(),
  editingMessageId: null,

  setUnreadCount: (channelId: string, count: number) => {
    set((state) => {
      const next = { ...state.unreadCounts }
      if (count <= 0) {
        delete next[channelId]
      } else {
        next[channelId] = count
      }
      return { unreadCounts: next, unreadTotal: computeTotal(next) }
    })
  },

  clearUnread: (channelId: string) => {
    set((state) => {
      const next = { ...state.unreadCounts }
      delete next[channelId]
      return { unreadCounts: next, unreadTotal: computeTotal(next) }
    })
  },

  incrementUnread: (channelId: string) => {
    set((state) => {
      const next = { ...state.unreadCounts }
      const current = next[channelId] ?? 0
      next[channelId] = current + 1
      return { unreadCounts: next, unreadTotal: computeTotal(next) }
    })
  },

  resetAllUnread: () => {
    set({ unreadCounts: {}, unreadTotal: 0 })
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

  // Persistent drafts (AsyncStorage)
  savePersistentDraft: (channelId: string, text: string) => {
    set((state) => {
      const next = new Map(state.persistentDrafts)
      if (text.length === 0) {
        next.delete(channelId)
      } else {
        next.set(channelId, text)
      }
      // Persist in background
      const serialized = JSON.stringify(Array.from(next.entries()))
      void AsyncStorage.setItem(PERSISTENT_DRAFTS_KEY, serialized)
      return { persistentDrafts: next }
    })
  },

  clearPersistentDraft: (channelId: string) => {
    set((state) => {
      const next = new Map(state.persistentDrafts)
      next.delete(channelId)
      const serialized = JSON.stringify(Array.from(next.entries()))
      void AsyncStorage.setItem(PERSISTENT_DRAFTS_KEY, serialized)
      return { persistentDrafts: next }
    })
  },

  loadPersistentDrafts: async () => {
    try {
      const raw = await AsyncStorage.getItem(PERSISTENT_DRAFTS_KEY)
      if (raw != null) {
        const entries = JSON.parse(raw) as [string, string][]
        set({ persistentDrafts: new Map(entries) })
      }
    } catch {
      // Non-fatal: drafts remain empty
    }
  },

  // Typing indicators
  setTypingUsers: (channelId: string, userIds: string[]) => {
    set((state) => {
      const next = new Map(state.typingUsers)
      if (userIds.length === 0) {
        next.delete(channelId)
      } else {
        next.set(channelId, userIds)
      }
      return { typingUsers: next }
    })
  },

  // Muted channels (AsyncStorage)
  muteChannel: (channelId: string) => {
    set((state) => {
      const next = new Set(state.mutedChannels)
      next.add(channelId)
      const serialized = JSON.stringify(Array.from(next))
      void AsyncStorage.setItem(MUTED_CHANNELS_KEY, serialized)
      return { mutedChannels: next }
    })
  },

  unmuteChannel: (channelId: string) => {
    set((state) => {
      const next = new Set(state.mutedChannels)
      next.delete(channelId)
      const serialized = JSON.stringify(Array.from(next))
      void AsyncStorage.setItem(MUTED_CHANNELS_KEY, serialized)
      return { mutedChannels: next }
    })
  },

  isChannelMuted: (channelId: string) => {
    return get().mutedChannels.has(channelId)
  },

  loadMutedChannels: async () => {
    try {
      const raw = await AsyncStorage.getItem(MUTED_CHANNELS_KEY)
      if (raw != null) {
        const ids = JSON.parse(raw) as string[]
        set({ mutedChannels: new Set(ids) })
      }
    } catch {
      // Non-fatal
    }
  },

  // Editing state
  setEditingMessage: (messageId: string | null) => {
    set({ editingMessageId: messageId })
  },

  setActiveChannel: (channelId: string | null) => {
    set({ activeChannelId: channelId })
  },
}))
