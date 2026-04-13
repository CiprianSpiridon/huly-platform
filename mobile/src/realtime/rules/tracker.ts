/**
 * Tracker invalidation rules.
 *
 * Maps tracker-related Tx broadcasts to TanStack Query invalidations:
 * - Issue create -> invalidate issue list for that project
 * - Issue update -> invalidate issue detail + issue list
 * - Issue remove -> invalidate issue list
 * - Project changes -> invalidate project list
 */

import type { QueryClient } from '@tanstack/react-query'

import { registerInvalidationRule, type TxCUDInfo } from '../invalidation'

// ---------------------------------------------------------------------------
// Class refs
// ---------------------------------------------------------------------------

const ISSUE_CLASS = 'tracker:class:Issue'

const PROJECT_CLASSES = [
  'tracker:class:Project',
]

const ISSUE_STATUS_CLASS = 'tracker:class:IssueStatus'

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

function trackerInvalidationRule(tx: TxCUDInfo, queryClient: QueryClient): boolean {
  let handled = false

  // Issue changes
  if (tx.objectClass === ISSUE_CLASS) {
    // Always invalidate the detail query for this specific issue
    void queryClient.invalidateQueries({
      queryKey: ['tracker', 'issue', tx.objectId],
    })

    // Invalidate the issues list for the project
    if (tx.objectSpace !== undefined) {
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issues', tx.objectSpace],
      })
    } else {
      // No space info -- invalidate all issue lists
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'issues'],
      })
    }

    // On create/remove, also refresh project list (issue counts)
    if (tx.type === 'create' || tx.type === 'remove') {
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'projects'],
      })
    }

    handled = true
  }

  // Project changes -> refresh project list
  if (PROJECT_CLASSES.includes(tx.objectClass)) {
    void queryClient.invalidateQueries({
      queryKey: ['tracker', 'projects'],
    })
    handled = true
  }

  // Issue status changes -> refresh issue lists (grouping by status may change)
  if (tx.objectClass === ISSUE_STATUS_CLASS) {
    void queryClient.invalidateQueries({
      queryKey: ['tracker', 'issues'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['tracker', 'statuses'],
    })
    handled = true
  }

  return handled
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerTrackerRules(): void {
  registerInvalidationRule(trackerInvalidationRule)
}
