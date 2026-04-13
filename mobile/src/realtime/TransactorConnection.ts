/**
 * Lightweight Transactor WebSocket connection for React Native.
 *
 * JSON-only mode -- no binary protocol, no compression, no msgpackr.
 * Does NOT implement RPC request/response. Only receives Tx[] broadcasts.
 *
 * Lifecycle: connect() -> hello handshake -> listening -> onBroadcast callback
 *
 * Reconnects automatically with exponential backoff (0, 1, 2, 3s cap).
 */

import { generateId } from '@hcengineering/core'
import type { Tx } from '@hcengineering/core'

import {
  type ClientSocket,
  type ClientSocketFactory,
  ClientSocketReadyState,
  type HelloRequest,
  type ServerResponse,
  pingConst,
  pongConst,
  rpcJSONReplacer,
  rpcJSONReceiver,
} from './protocol'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PING_INTERVAL_MS = 10_000
const HANG_TIMEOUT_MS = 5 * 60_000
const DIAL_TIMEOUT_MS = 30_000
const MAX_DELAY_SECONDS = 3

// ---------------------------------------------------------------------------
// TransactorConnection
// ---------------------------------------------------------------------------

export type BroadcastCallback = (txes: Tx[]) => void

export interface TransactorConnectionOptions {
  socketFactory: ClientSocketFactory
  onBroadcast: BroadcastCallback
  onStatusChange?: (status: TransactorStatus) => void
}

export type TransactorStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export class TransactorConnection {
  private websocket: ClientSocket | null = null
  private readonly sessionId: string
  private closed = false
  private helloReceived = false
  private pingResponseTime = 0
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private dialTimer: ReturnType<typeof setTimeout> | null = null
  private delay = 0
  private socketGeneration = 0

  private readonly socketFactory: ClientSocketFactory
  private readonly onBroadcast: BroadcastCallback
  private readonly onStatusChange?: (status: TransactorStatus) => void

  private url = ''

  constructor(options: TransactorConnectionOptions) {
    this.sessionId = generateId()
    this.socketFactory = options.socketFactory
    this.onBroadcast = options.onBroadcast
    this.onStatusChange = options.onStatusChange
  }

  /**
   * Connect to the transactor WebSocket endpoint.
   *
   * @param wsEndpoint - The WebSocket URL (wss://...)
   * @param _token - The workspace JWT token (reserved for future auth)
   */
  connect(wsEndpoint: string, _token: string): void {
    this.url = wsEndpoint
    this.closed = false
    this.delay = 0
    this.setStatus('connecting')
    this.openConnection()
  }

  /**
   * Gracefully disconnect. Does not auto-reconnect after this.
   */
  disconnect(): void {
    this.closed = true
    this.clearTimers()
    if (this.websocket !== null) {
      this.websocket.close(1000)
      this.websocket = null
    }
    this.helloReceived = false
    this.setStatus('disconnected')
  }

  /**
   * Whether the connection is fully up (hello received, socket open).
   */
  isConnected(): boolean {
    return (
      this.websocket !== null &&
      this.websocket.readyState === ClientSocketReadyState.OPEN &&
      this.helloReceived
    )
  }

  // -----------------------------------------------------------------------
  // Private: connection lifecycle
  // -----------------------------------------------------------------------

  private setStatus(status: TransactorStatus): void {
    this.onStatusChange?.(status)
  }

  private openConnection(): void {
    if (this.closed) return

    const generation = ++this.socketGeneration
    this.helloReceived = false

    // Build URL with sessionId
    const separator = this.url.includes('?') ? '&' : '?'
    const wsUrl = `${this.url}${separator}sessionId=${this.sessionId}`

    const wsocket = this.socketFactory(wsUrl)

    if (generation !== this.socketGeneration) {
      wsocket.close()
      return
    }

    this.websocket = wsocket

    // Dial timeout -- if we don't get hello within 30s, force reconnect
    this.dialTimer = setTimeout(() => {
      this.dialTimer = null
      if (!this.closed && !this.helloReceived) {
        this.scheduleReconnect()
      }
    }, DIAL_TIMEOUT_MS)

    wsocket.onopen = () => {
      if (this.websocket !== wsocket) return
      this.sendHello()
    }

    wsocket.onmessage = (event: MessageEvent) => {
      if (this.closed || this.websocket !== wsocket) return
      this.handleRawMessage(event.data as string, generation)
    }

    wsocket.onclose = () => {
      if (this.websocket !== wsocket) {
        wsocket.close()
        return
      }
      if (!this.closed) {
        this.scheduleReconnect()
      }
    }

    wsocket.onerror = () => {
      if (this.websocket !== wsocket) return
      if (this.delay < MAX_DELAY_SECONDS) {
        this.delay++
      }
      if (__DEV__) {
        console.log('[TransactorConnection] WebSocket error, will reconnect')
      }
    }
  }

  private sendHello(): void {
    const hello: HelloRequest = {
      method: 'hello',
      params: [],
      id: -1,
      binary: false,
      compression: false,
    }
    this.websocket?.send(JSON.stringify(hello, rpcJSONReplacer))
  }

  private handleRawMessage(data: string, generation: number): void {
    // Handle ping/pong as raw strings
    if (data === pongConst) {
      this.pingResponseTime = Date.now()
      return
    }
    if (data === pingConst) {
      // Server is pinging us -- respond with pong
      this.websocket?.send(pongConst)
      return
    }

    let resp: ServerResponse
    try {
      resp = JSON.parse(data, rpcJSONReceiver) as ServerResponse
    } catch {
      if (__DEV__) {
        console.warn('[TransactorConnection] Failed to parse message')
      }
      return
    }

    this.handleMessage(resp, generation)
  }

  private handleMessage(resp: ServerResponse, generation: number): void {
    if (this.closed) return

    // Handle errors with terminate flag
    if (resp.error !== undefined && resp.terminate === true) {
      this.closed = true
      this.websocket?.close()
      this.setStatus('error')
      return
    }

    // Hello response (id === -1)
    if (resp.id === -1) {
      if (resp.result === 'hello') {
        this.helloReceived = true
        this.delay = 0

        // Clear dial timeout
        if (this.dialTimer !== null) {
          clearTimeout(this.dialTimer)
          this.dialTimer = null
        }

        if (__DEV__) {
          console.log('[TransactorConnection] Connected, server:', resp.serverVersion)
        }

        this.setStatus('connected')
        this.schedulePing(generation)
        return
      }
      // Upgrading state
      if (
        typeof resp.result === 'object' &&
        resp.result !== null &&
        (resp.result as Record<string, unknown>).state === 'upgrading'
      ) {
        this.delay = 3
        return
      }
      return
    }

    // Ping request from server (result === 'ping')
    if (resp.result === pingConst) {
      this.websocket?.send(pongConst)
      return
    }

    // RPC response (has id) -- we don't do RPC, skip
    if (resp.id !== undefined) {
      return
    }

    // Broadcast: no id field, result is Tx or Tx[]
    if (resp.result !== undefined) {
      const txArr = Array.isArray(resp.result)
        ? (resp.result as Tx[])
        : [resp.result as Tx]

      // Filter out model upgrades
      const isTxModelUpgrade = txArr.some(
        (tx) => tx?._class === ('core:class:TxModelUpgrade' as string)
      )
      if (isTxModelUpgrade) return

      this.onBroadcast(txArr)
    }
  }

  // -----------------------------------------------------------------------
  // Ping / Pong
  // -----------------------------------------------------------------------

  private schedulePing(generation: number): void {
    this.pingResponseTime = Date.now()
    this.clearPingInterval()

    this.pingInterval = setInterval(() => {
      if (generation !== this.socketGeneration) {
        this.clearPingInterval()
        return
      }

      // Check for hang (no pong response in 5 minutes)
      if (
        this.pingResponseTime !== 0 &&
        Date.now() - this.pingResponseTime > HANG_TIMEOUT_MS
      ) {
        if (__DEV__) {
          console.log('[TransactorConnection] No ping response, reconnecting')
        }
        this.clearPingInterval()
        this.websocket?.close(1000)
        return
      }

      // Send ping
      if (!this.closed && this.websocket?.readyState === ClientSocketReadyState.OPEN) {
        this.websocket.send(pingConst)
      }
    }, PING_INTERVAL_MS)
  }

  // -----------------------------------------------------------------------
  // Reconnection
  // -----------------------------------------------------------------------

  private scheduleReconnect(): void {
    if (this.closed) return

    this.clearTimers()

    if (this.websocket !== null) {
      this.websocket.close()
      this.websocket = null
    }
    this.helloReceived = false
    this.setStatus('reconnecting')

    if (this.delay === 0) {
      this.openConnection()
    } else {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        if (!this.closed) {
          this.openConnection()
        }
      }, this.delay * 1000)
    }

    if (this.delay < MAX_DELAY_SECONDS) {
      this.delay++
    }
  }

  // -----------------------------------------------------------------------
  // Timer cleanup
  // -----------------------------------------------------------------------

  private clearPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private clearTimers(): void {
    this.clearPingInterval()
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.dialTimer !== null) {
      clearTimeout(this.dialTimer)
      this.dialTimer = null
    }
  }
}
