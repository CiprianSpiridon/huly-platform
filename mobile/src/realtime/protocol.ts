/**
 * Huly transactor protocol types.
 *
 * Inlined from @hcengineering/client and @hcengineering/rpc to avoid
 * build dependencies (those packages need rush build to generate .d.ts)
 * and to avoid pulling in msgpackr via @hcengineering/rpc.
 *
 * These types are stable and match the server protocol exactly.
 */

// ---------------------------------------------------------------------------
// ClientSocket (from @hcengineering/client)
// ---------------------------------------------------------------------------

export type ClientSocketFactory = (url: string) => ClientSocket

export interface ClientSocket {
  onmessage?: ((this: ClientSocket, ev: MessageEvent) => unknown) | null
  onclose?: ((this: ClientSocket, ev: CloseEvent) => unknown) | null
  onopen?: ((this: ClientSocket, ev: Event) => unknown) | null
  onerror?: ((this: ClientSocket, ev: Event) => unknown) | null

  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void
  close: (code?: number) => void
  readyState: ClientSocketReadyState
  bufferedAmount?: number
}

export enum ClientSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

// ---------------------------------------------------------------------------
// Ping / Pong constants (from @hcengineering/client)
// ---------------------------------------------------------------------------

export const pingConst = 'ping'
export const pongConst = 'pong!'

// ---------------------------------------------------------------------------
// JSON serialization helpers (from @hcengineering/rpc, without msgpackr)
// ---------------------------------------------------------------------------

interface TotalArrayLike {
  total?: number
  lookupMap?: Record<string, unknown>
}

function isTotalArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    ((value as TotalArrayLike).total !== undefined ||
      (value as TotalArrayLike).lookupMap !== undefined)
  )
}

/**
 * Custom JSON replacer that handles TotalArray (FindResult) objects
 * used by the Huly RPC protocol.
 */
export function rpcJSONReplacer(_key: string, value: unknown): unknown {
  if (isTotalArray(value)) {
    return {
      dataType: 'TotalArray',
      total: (value as TotalArrayLike).total,
      lookupMap: (value as TotalArrayLike).lookupMap,
      value: [...(value as unknown[])],
    }
  }
  return value ?? null
}

export function rpcJSONReceiver(_key: string, value: unknown): unknown {
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    if (record.dataType === 'TotalArray') {
      const arr = record.value as unknown[]
      return Object.assign(arr, { total: record.total, lookupMap: record.lookupMap })
    }
  }
  return value
}

// ---------------------------------------------------------------------------
// Hello handshake types (from @hcengineering/rpc)
// ---------------------------------------------------------------------------

export interface HelloRequest {
  method: string
  params: unknown[]
  id: number
  binary: boolean
  compression: boolean
}

export interface ServerResponse {
  id?: number | string
  result?: unknown
  error?: unknown
  binary?: boolean
  reconnect?: boolean
  serverVersion?: string
  lastTx?: string
  lastHash?: string
  useCompression?: boolean
  terminate?: boolean
}
