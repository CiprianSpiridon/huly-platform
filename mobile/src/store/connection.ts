/**
 * Connection Zustand store.
 *
 * Manages the HulyClient lifecycle: connect, disconnect, reconnect.
 * Stores connection status and the last-used credentials so reconnect
 * can be performed without re-reading secure store.
 */

import { create } from 'zustand'

import { HulyClient } from '@/client/api'
import { setClient, clearClient } from '@/client'
import { useWebSocketStore } from './websocket'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface ConnectionCredentials {
  endpoint: string
  workspaceId: string
  token: string
}

interface ConnectionState {
  status: ConnectionStatus
  error: string | null
  /** The authenticated user's primarySocialId — use for reaction ownership, tx authoring */
  currentSocialId: string | null

  connect: (endpoint: string, workspaceId: string, token: string) => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>
}

/** Stored outside Zustand to avoid serialization -- only used for reconnect. */
let _credentials: ConnectionCredentials | null = null

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'disconnected',
  error: null,
  currentSocialId: null,

  connect: async (endpoint: string, workspaceId: string, token: string) => {
    if (get().status === 'connecting') return

    set({ status: 'connecting', error: null })

    try {
      const client = await HulyClient.connect(endpoint, workspaceId, token)

      // Resolve the authenticated user's primarySocialId BEFORE we mark
      // ourselves connected. Every optimistic mutation in the app gates on
      // currentSocialId — a successful connect with a null socialId
      // silently degrades reactions, sender attribution, member-filtered
      // queries (chat channels/DMs), and unread tracking. Treat a missing
      // social id as a hard connect failure so the UI surfaces the
      // problem and offers a retry path instead of silent breakage.
      const account = await client.getAccount()
      const socialId = account.primarySocialId
      if (socialId == null) {
        throw new Error('Account has no primary social id')
      }

      // Store singleton and credentials only after the account check passed.
      setClient(client)
      _credentials = { endpoint, workspaceId, token }

      set({ status: 'connected', error: null, currentSocialId: socialId })

      // Auto-connect WebSocket sidecar for real-time broadcasts.
      // The endpoint is the WS URL; the token is the workspace JWT.
      useWebSocketStore.getState().connectWs(endpoint, token)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      set({ status: 'error', error: message })
      throw err
    }
  },

  disconnect: () => {
    // Disconnect WebSocket sidecar first
    useWebSocketStore.getState().disconnectWs()

    clearClient()
    _credentials = null
    set({ status: 'disconnected', error: null, currentSocialId: null })
  },

  reconnect: async () => {
    const { status, disconnect, connect } = get()

    if (_credentials === null) {
      throw new Error('No stored credentials for reconnect')
    }

    // Save credentials before disconnect() nulls the module-level reference
    const creds = _credentials

    // Tear down existing connection if any
    if (status === 'connected' || status === 'error') {
      disconnect()
    }

    const { endpoint, workspaceId, token } = creds
    await connect(endpoint, workspaceId, token)
  },
}))
