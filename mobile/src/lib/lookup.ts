/**
 * Lookup helpers for reading $lookup data from Huly REST responses.
 *
 * The REST API populates $lookup when FindOptions.lookup is provided.
 * These helpers provide type-safe access without ugly casts in screens.
 */

import type { Doc } from '@hcengineering/core'

/**
 * Get a lookup value from a document's $lookup field.
 * Returns undefined if the lookup is not present.
 */
export function getLookup<T extends Doc>(
  doc: T,
  field: string
): Record<string, unknown> | undefined {
  const lookup = (doc as unknown as Record<string, unknown>).$lookup as
    | Record<string, Record<string, unknown>>
    | undefined
  return lookup?.[field]
}

/**
 * Get a string field from a lookup value.
 */
export function getLookupString<T extends Doc>(
  doc: T,
  field: string,
  subField: string,
  fallback = 'Unknown'
): string {
  const value = getLookup(doc, field)
  if (value == null) return fallback
  const result = value[subField]
  return typeof result === 'string' ? result : fallback
}

/**
 * Get the status name from a document's $lookup.status.
 */
export function getStatusName<T extends Doc>(doc: T, fallback = 'Unknown'): string {
  return getLookupString(doc, 'status', 'name', fallback)
}

/**
 * Get the assignee name from a document's $lookup.assignee.
 */
export function getAssigneeName<T extends Doc>(doc: T): string | undefined {
  const assignee = getLookup(doc, 'assignee')
  if (assignee == null) return undefined
  const name = assignee.name
  return typeof name === 'string' ? name : undefined
}
