/**
 * Tracker Zustand store.
 *
 * Manages client-side tracker preferences: selected project, issue filters,
 * sort, view mode, and issue draft. Filter/sort preferences are persisted
 * to AsyncStorage so they survive app restarts.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Doc, Ref, Space } from '@hcengineering/core'
import type { IssueStatus } from '@hcengineering/tracker'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewMode = 'list' | 'kanban'

export interface TrackerIssueFilters {
  priority: number[]
  status: Array<Ref<IssueStatus>>
  assignee: Array<Ref<Doc>>
  component: Array<Ref<Doc>>
  milestone: Array<Ref<Doc>>
  dueDate: { from?: number; to?: number } | null
}

export interface TrackerIssueSort {
  key: 'modifiedOn' | 'priority' | 'status' | 'dueDate'
  order: 'ascending' | 'descending'
}

export interface IssueDraftState {
  title: string
  description: string
  priority: number
  statusId: Ref<IssueStatus> | null
  assigneeId: Ref<Doc> | null
  projectId: Ref<Space> | null
  componentId: Ref<Doc> | null
  milestoneId: Ref<Doc> | null
  dueDate: number | null
  estimation: number | null
  parentIssueId: Ref<Doc> | null
  labels: string[]
}

const EMPTY_FILTERS: TrackerIssueFilters = {
  priority: [],
  status: [],
  assignee: [],
  component: [],
  milestone: [],
  dueDate: null,
}

const DEFAULT_SORT: TrackerIssueSort = {
  key: 'modifiedOn',
  order: 'descending',
}

const EMPTY_DRAFT: IssueDraftState = {
  title: '',
  description: '',
  priority: 0,
  statusId: null,
  assigneeId: null,
  projectId: null,
  componentId: null,
  milestoneId: null,
  dueDate: null,
  estimation: null,
  parentIssueId: null,
  labels: [],
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface TrackerState {
  // Selected project
  selectedProjectId: Ref<Space> | null
  setSelectedProjectId: (id: Ref<Space> | null) => void

  // Filters (persisted)
  issueFilters: TrackerIssueFilters
  setFilter: <K extends keyof TrackerIssueFilters>(
    key: K,
    value: TrackerIssueFilters[K]
  ) => void
  clearFilters: () => void
  clearProjectSpecificFilters: () => void

  // Sort (persisted)
  issueSort: TrackerIssueSort
  setSort: (sort: TrackerIssueSort) => void

  // View mode (persisted)
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Issue draft (persisted)
  issueDraft: IssueDraftState
  updateDraft: (patch: Partial<IssueDraftState>) => void
  clearDraft: () => void

  // Workspace switch
  clearOnWorkspaceSwitch: () => void
}

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set) => ({
      // Selected project
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),

      // Filters
      issueFilters: EMPTY_FILTERS,
      setFilter: (key, value) =>
        set((state) => ({
          issueFilters: { ...state.issueFilters, [key]: value },
        })),
      clearFilters: () => set({ issueFilters: EMPTY_FILTERS }),
      clearProjectSpecificFilters: () =>
        set((state) => ({
          issueFilters: {
            ...state.issueFilters,
            status: [],
            assignee: [],
            component: [],
            milestone: [],
          },
        })),

      // Sort
      issueSort: DEFAULT_SORT,
      setSort: (sort) => set({ issueSort: sort }),

      // View mode
      viewMode: 'list',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Issue draft
      issueDraft: EMPTY_DRAFT,
      updateDraft: (patch) =>
        set((state) => ({
          issueDraft: { ...state.issueDraft, ...patch },
        })),
      clearDraft: () => set({ issueDraft: EMPTY_DRAFT }),

      // Workspace switch: clear draft and project-specific state
      clearOnWorkspaceSwitch: () =>
        set({
          issueDraft: EMPTY_DRAFT,
          selectedProjectId: null,
          issueFilters: EMPTY_FILTERS,
        }),
    }),
    {
      name: 'tracker-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist preferences, not transient selection state
      partialize: (state) => ({
        issueFilters: state.issueFilters,
        issueSort: state.issueSort,
        viewMode: state.viewMode,
        issueDraft: state.issueDraft,
        selectedProjectId: state.selectedProjectId,
      }),
    }
  )
)
