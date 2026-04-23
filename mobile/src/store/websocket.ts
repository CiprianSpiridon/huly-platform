/**
 * WebSocket Zustand store.
 *
 * Manages the sidecar WebSocket connection to the Huly transactor.
 * The WebSocket receives Tx[] broadcasts and invalidates TanStack Query
 * caches for instant UI updates. REST remains the primary query/mutation
 * transport.
 *
 * Lifecycle:
 *   idle -> connecting -> connected -> (reconnecting | disconnected)
 *
 * Integrates with:
 *   - AppState: close WS on background, reconnect on foreground
 *   - NetInfo: reconnect on network restored
 *   - Connection store: auto-connect when REST connects
 */

import { AppState, type AppStateStatus } from 'react-native'
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'
import { create } from 'zustand'

import { queryClient } from '@/client/queryClient'
import { useWorkspaceStore } from '@/store/workspace'
import {
  TransactorConnection,
  type TransactorStatus,
} from '@/realtime/TransactorConnection'
import { RNWebSocketFactory } from '@/realtime/RNWebSocketFactory'
import { processBroadcast } from '@/realtime/invalidation'

// Register all invalidation rules on module load
import { registerChatRules } from '@/realtime/rules/chat'
import { registerNotificationRules } from '@/realtime/rules/notification'
import { registerTrackerRules } from '@/realtime/rules/tracker'

registerChatRules()
registerNotificationRules()
registerTrackerRules()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WsStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'

interface WebSocketState {
  status: WsStatus

  connectWs: (wsEndpoint: string, token: string) => void
  disconnectWs: () => void
}

// ---------------------------------------------------------------------------
// Module-level connection instance (not in Zustand to avoid serialization)
// ---------------------------------------------------------------------------

let _connection: TransactorConnection | null = null
let _wsEndpoint: string | null = null
let _wsToken: string | null = null
let _appStateSubscription: { remove: () => void } | null = null
let _netInfoUnsubscribe: (() => void) | null = null
let _wasBackgrounded = false

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  status: 'idle',

  connectWs: (wsEndpoint: string, token: string) => {
    // Tear down any existing connection
    if (_connection !== null) {
      _connection.disconnect()
      _connection = null
    }

    _wsEndpoint = wsEndpoint
    _wsToken = token

    // Create new connection
    _connection = new TransactorConnection({
      socketFactory: RNWebSocketFactory,

      onBroadcast: (txes) => {
        processBroadcast(txes, queryClient)
      },

      onStatusChange: (status: TransactorStatus) => {
        set({ status: status as WsStatus })
      },
    })

    _connection.connect(wsEndpoint, token)
    set({ status: 'connecting' })

    // Set up AppState listener for background/foreground
    setupAppStateListener(set, get)

    // Set up network listener
    setupNetInfoListener(set, get)
  },

  disconnectWs: () => {
    if (_connection !== null) {
      _connection.disconnect()
      _connection = null
    }
    _wsEndpoint = null
    _wsToken = null
    _wasBackgrounded = false

    // Remove listeners
    if (_appStateSubscription !== null) {
      _appStateSubscription.remove()
      _appStateSubscription = null
    }
    if (_netInfoUnsubscribe !== null) {
      _netInfoUnsubscribe()
      _netInfoUnsubscribe = null
    }

    set({ status: 'idle' })
  },
}))

// ---------------------------------------------------------------------------
// AppState lifecycle (TASK-WSR-010)
// ---------------------------------------------------------------------------

function setupAppStateListener(
  set: (state: Partial<WebSocketState>) => void,
  _get: () => WebSocketState
): void {
  // Remove previous subscription if any
  if (_appStateSubscription !== null) {
    _appStateSubscription.remove()
  }

  _appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'background' || nextState === 'inactive') {
      // Close WS on background to save battery
      if (_connection !== null && _connection.isConnected()) {
        _connection.disconnect()
        _connection = null
        _wasBackgrounded = true
        set({ status: 'disconnected' })
      }
    } else if (nextState === 'active' && _wasBackgrounded) {
      // Reconnect on foreground. Reads workspace state inside the helper so
      // a workspace switch that happened while backgrounded picks up the
      // fresh endpoint/token, not the stale module-level values.
      _wasBackgrounded = false
      reconnectFromCurrentWorkspace(set)
    }
  })
}

// ---------------------------------------------------------------------------
// Network lifecycle (TASK-WSR-010)
// ---------------------------------------------------------------------------

function setupNetInfoListener(
  set: (state: Partial<WebSocketState>) => void,
  _get: () => WebSocketState
): void {
  if (_netInfoUnsubscribe !== null) {
    _netInfoUnsubscribe()
  }

  let wasDisconnected = false

  _netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isConnected = state.isConnected === true && state.isInternetReachable !== false

    if (!isConnected) {
      // Network lost -- disconnect WebSocket
      if (_connection !== null && _connection.isConnected()) {
        _connection.disconnect()
        _connection = null
        wasDisconnected = true
        set({ status: 'disconnected' })
      }
    } else if (wasDisconnected) {
      // Network restored — reconnect using the CURRENT workspace endpoint.
      wasDisconnected = false
      reconnectFromCurrentWorkspace(set)
    }
  })
}

// ---------------------------------------------------------------------------
// Reconnect helper (shared by AppState foreground + NetInfo restored paths)
// ---------------------------------------------------------------------------

// Realtime-relevant query roots — narrow invalidation prevents the
// thundering-herd refetch that `queryClient.invalidateQueries()` (no args)
// caused before. Anything outside this list (profile, workspaces, etc.) is
// either static for the session or refreshed by its own focus-side hooks.
const REALTIME_QUERY_ROOTS: Array<readonly string[]> = [
  ['chat'],
  ['tracker'],
  ['attachments'],
  ['activity'],
  ['notifications'],
]

function reconnectFromCurrentWorkspace(
  set: (state: Partial<WebSocketState>) => void
): void {
  const ws = useWorkspaceStore.getState()
  const freshEndpoint = ws.workspaceEndpoint
  const freshToken = ws.workspaceToken
  if (freshEndpoint === null || freshToken === null) return

  // Always tear down before rebuilding — never reuse a stale socket.
  if (_connection !== null) {
    _connection.disconnect()
    _connection = null
  }
  _wsEndpoint = freshEndpoint
  _wsToken = freshToken
  _connection = new TransactorConnection({
    socketFactory: RNWebSocketFactory,
    onBroadcast: (txes) => {
      processBroadcast(txes, queryClient)
    },
    onStatusChange: (status: TransactorStatus) => {
      set({ status: status as WsStatus })
    },
  })
  _connection.connect(freshEndpoint, freshToken)
  set({ status: 'connecting' })

  // Refresh realtime-relevant data only. Per-Tx invalidation rules
  // (mobile/src/realtime/rules/*) handle the steady state once the WS
  // is up; this is just the "we missed messages while disconnected" sweep.
  for (const queryKey of REALTIME_QUERY_ROOTS) {
    void queryClient.invalidateQueries({ queryKey })
  }
}
