/**
 * Mock for @hcengineering/core.
 *
 * Provides minimal stubs for SortingOrder, TxFactory, and type re-exports
 * so repository and store tests do not need a real backend.
 */

export const SortingOrder = {
  Ascending: 1,
  Descending: -1,
} as const

export class TxFactory {
  constructor(public readonly account: string) {}

  createTxCreateDoc(
    _class: unknown,
    space: unknown,
    attributes: unknown
  ): { objectId: string; _class: unknown; space: unknown; attributes: unknown } {
    return {
      objectId: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      _class,
      space,
      attributes,
    }
  }

  createTxUpdateDoc(
    _class: unknown,
    space: unknown,
    objectId: unknown,
    operations: unknown
  ): { objectId: unknown; _class: unknown; space: unknown; operations: unknown } {
    return { objectId, _class, space, operations }
  }

  createTxRemoveDoc(
    _class: unknown,
    space: unknown,
    objectId: unknown
  ): { objectId: unknown; _class: unknown; space: unknown } {
    return { objectId, _class, space }
  }
}
