/**
 * Inbox Zustand store.
 *
 * Manages client-side inbox state: unread badge count, active filter,
 * and bulk selection. Server data (notifications) lives in TanStack Query;
 * this store only holds ephemeral UI state and the derived badge count
 * synced from the useUnreadCount hook.
 */

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InboxFilter = 'all' | 'mentions' | 'reactions' | 'updates'

interface InboxState {
  /** Total unread count displayed on the tab badge. Synced by useUnreadCount hook. */
  unreadTotal: number
  setUnreadTotal: (count: number) => void

  /** Active filter chip in the notification list. */
  activeFilter: InboxFilter
  setFilter: (filter: InboxFilter) => void

  /** Set of selected notification IDs for bulk actions. */
  selectedIds: Set<string>
  /** Whether the user is in selection (bulk) mode. */
  isSelectionMode: boolean

  toggleSelected: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  enterSelectionMode: (id: string) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useInboxStore = create<InboxState>((set) => ({
  unreadTotal: 0,
  setUnreadTotal: (count) => set({ unreadTotal: count }),

  activeFilter: 'all',
  setFilter: (filter) => set({ activeFilter: filter }),

  selectedIds: new Set<string>(),
  isSelectionMode: false,

  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      // Exit selection mode if nothing is selected
      const isSelectionMode = next.size > 0
      return { selectedIds: next, isSelectionMode }
    }),

  selectAll: (ids) =>
    set({
      selectedIds: new Set(ids),
      isSelectionMode: ids.length > 0,
    }),

  clearSelection: () =>
    set({
      selectedIds: new Set<string>(),
      isSelectionMode: false,
    }),

  enterSelectionMode: (id) =>
    set({
      selectedIds: new Set([id]),
      isSelectionMode: true,
    }),
}))
