/**
 * Workspace Zustand store.
 *
 * Manages the currently selected workspace. All five fields (url, id, token,
 * endpoint, role) are persisted to `expo-secure-store` and restored on app
 * launch. State is only populated when ALL five keys are present.
 */

import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { AccountRole, type WorkspaceUuid } from '@hcengineering/core'
import type { WorkspaceLoginInfo } from '@hcengineering/account-client'

interface WorkspaceState {
  selectedWorkspace: WorkspaceUuid | null
  workspaceUrl: string | null
  workspaceEndpoint: string | null
  workspaceToken: string | null
  workspaceRole: AccountRole | null

  setWorkspace: (info: WorkspaceLoginInfo) => Promise<void>
  clearWorkspace: () => Promise<void>
  restoreWorkspace: () => Promise<void>
  /**
   * Replace the persisted workspace role. Used after a server-side role
   * change so subsequent session restores reflect the authoritative value
   * from the account service rather than the role captured at selection.
   */
  setWorkspaceRole: (role: AccountRole) => Promise<void>
}

/**
 * Validates an arbitrary string is an AccountRole enum value.
 * Returns `null` when the input does not match any known role.
 */
function parseRole(value: string | null | undefined): AccountRole | null {
  if (value == null) return null
  const roles = Object.values(AccountRole) as string[]
  return roles.includes(value) ? (value as AccountRole) : null
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedWorkspace: null,
  workspaceUrl: null,
  workspaceEndpoint: null,
  workspaceToken: null,
  workspaceRole: null,

  setWorkspace: async (info: WorkspaceLoginInfo) => {
    await SecureStore.setItemAsync('workspace_url', info.workspaceUrl)
    await SecureStore.setItemAsync('workspace_id', info.workspace)
    await SecureStore.setItemAsync('workspace_token', info.token)
    await SecureStore.setItemAsync('workspace_endpoint', info.endpoint)
    await SecureStore.setItemAsync('workspace_role', String(info.role))

    set({
      selectedWorkspace: info.workspace,
      workspaceUrl: info.workspaceUrl,
      workspaceEndpoint: info.endpoint,
      workspaceToken: info.token,
      workspaceRole: info.role,
    })
  },

  clearWorkspace: async () => {
    await SecureStore.deleteItemAsync('workspace_url')
    await SecureStore.deleteItemAsync('workspace_id')
    await SecureStore.deleteItemAsync('workspace_token')
    await SecureStore.deleteItemAsync('workspace_endpoint')
    await SecureStore.deleteItemAsync('workspace_role')

    set({
      selectedWorkspace: null,
      workspaceUrl: null,
      workspaceEndpoint: null,
      workspaceToken: null,
      workspaceRole: null,
    })
  },

  setWorkspaceRole: async (role: AccountRole) => {
    await SecureStore.setItemAsync('workspace_role', String(role))
    set({ workspaceRole: role })
  },

  restoreWorkspace: async () => {
    const workspaceUrl = await SecureStore.getItemAsync('workspace_url')
    const workspace = await SecureStore.getItemAsync('workspace_id')
    const token = await SecureStore.getItemAsync('workspace_token')
    const endpoint = await SecureStore.getItemAsync('workspace_endpoint')
    const rawRole = await SecureStore.getItemAsync('workspace_role')
    const role = parseRole(rawRole)

    // Only populate state if ALL five keys are present and role is a known value.
    if (
      workspaceUrl != null &&
      workspace != null &&
      token != null &&
      endpoint != null &&
      role != null
    ) {
      set({
        selectedWorkspace: workspace as WorkspaceUuid,
        workspaceUrl,
        workspaceEndpoint: endpoint,
        workspaceToken: token,
        workspaceRole: role,
      })
    }
  },
}))
