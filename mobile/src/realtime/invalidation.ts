/**
 * Tx-to-QueryKey invalidation engine.
 *
 * Maps TxCUD broadcasts from the transactor WebSocket to TanStack Query
 * invalidations. Domain modules register class->queryKey mappings via
 * the registry pattern.
 *
 * Handles TxCreateDoc, TxUpdateDoc, TxRemoveDoc by reading tx.objectClass,
 * tx.objectId, and tx.objectSpace.
 */

import type { QueryClient } from '@tanstack/react-query'
import type { Ref, Tx, Doc, Space } from '@hcengineering/core'

// ---------------------------------------------------------------------------
// Tx CUD constants (string refs to avoid importing core's component.ts
// which pulls in the full plugin registration chain)
// ---------------------------------------------------------------------------

const TX_CREATE_DOC = 'core:class:TxCreateDoc'
const TX_UPDATE_DOC = 'core:class:TxUpdateDoc'
const TX_REMOVE_DOC = 'core:class:TxRemoveDoc'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TxCUDType = 'create' | 'update' | 'remove'

/**
 * Parsed fields from a TxCUD broadcast.
 */
export interface TxCUDInfo {
  type: TxCUDType
  objectClass: string
  objectId: string
  objectSpace?: string
  /** For TxUpdateDoc, the operations map */
  operations?: Record<string, unknown>
  /** For attached documents */
  attachedTo?: string
  attachedToClass?: string
  collection?: string
}

/**
 * An invalidation rule receives parsed tx info and the QueryClient,
 * and decides which query keys to invalidate.
 *
 * Return true if the rule handled the tx (for logging/debugging).
 */
export type InvalidationRule = (tx: TxCUDInfo, queryClient: QueryClient) => boolean

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const rules: InvalidationRule[] = []

/**
 * Register an invalidation rule. Called by domain modules (chat, tracker,
 * notification) during app initialization.
 *
 * Rules are evaluated in registration order. Multiple rules can match
 * the same tx.
 */
export function registerInvalidationRule(rule: InvalidationRule): void {
  rules.push(rule)
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

/**
 * Parse a raw Tx into TxCUDInfo, or return null if it's not a CUD tx.
 */
function parseTxCUD(tx: Tx): TxCUDInfo | null {
  const txClass = tx._class as string

  let type: TxCUDType
  if (txClass === TX_CREATE_DOC) {
    type = 'create'
  } else if (txClass === TX_UPDATE_DOC) {
    type = 'update'
  } else if (txClass === TX_REMOVE_DOC) {
    type = 'remove'
  } else {
    return null
  }

  // TxCUD fields are present on the tx object
  const record = tx as unknown as Record<string, unknown>
  const objectClass = record.objectClass as string | undefined
  const objectId = record.objectId as string | undefined

  if (objectClass === undefined || objectId === undefined) {
    return null
  }

  return {
    type,
    objectClass,
    objectId,
    objectSpace: record.objectSpace as string | undefined,
    operations: type === 'update' ? (record.operations as Record<string, unknown> | undefined) : undefined,
    attachedTo: record.attachedTo as string | undefined,
    attachedToClass: record.attachedToClass as string | undefined,
    collection: record.collection as string | undefined,
  }
}

/**
 * Process a batch of Tx[] broadcasts from the transactor.
 * Parses each tx and runs all registered invalidation rules.
 */
export function processBroadcast(txes: Tx[], queryClient: QueryClient): void {
  for (const tx of txes) {
    const info = parseTxCUD(tx)
    if (info === null) continue

    for (const rule of rules) {
      rule(info, queryClient)
    }
  }
}
