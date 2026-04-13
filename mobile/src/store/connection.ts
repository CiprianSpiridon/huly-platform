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
    set({ status: 'connecting', error: null })

    try {
      const client = await HulyClient.connect(endpoint, workspaceId, token)

      // Store singleton and credentials
      setClient(client)
      _credentials = { endpoint, workspaceId, token }

      // Get the authenticated user's primarySocialId for reaction/tx authoring
      let socialId: string | null = null
      try {
        const account = await client.getAccount()
        socialId = account.primarySocialId
      } catch {
        // Non-fatal — socialId stays null, reactions won't highlight correctly
      }

      set({ status: 'connected', error: null, currentSocialId: socialId })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      set({ status: 'error', error: message })
      throw err
    }
  },

  disconnect: () => {
    clearClient()
    _credentials = null
    set({ status: 'disconnected', error: null, currentSocialId: null })
  },

  reconnect: async () => {
    const { status, disconnect, connect } = get()

    if (_credentials === null) {
      throw new Error('No stored credentials for reconnect')
    }

    // Tear down existing connection if any
    if (status === 'connected' || status === 'error') {
      disconnect()
    }

    const { endpoint, workspaceId, token } = _credentials
    await connect(endpoint, workspaceId, token)
  },
}))
