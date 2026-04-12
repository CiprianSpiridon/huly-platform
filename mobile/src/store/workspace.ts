/**
 * Workspace Zustand store.
 *
 * Manages the currently selected workspace. All four fields are persisted
 * to `expo-secure-store` and restored on app launch. State is only populated
 * when ALL four keys are present.
 */

import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { WorkspaceUuid } from '@hcengineering/core'
import type { WorkspaceLoginInfo } from '@hcengineering/account-client'

interface WorkspaceState {
  selectedWorkspace: WorkspaceUuid | null
  workspaceUrl: string | null
  workspaceEndpoint: string | null
  workspaceToken: string | null

  setWorkspace: (info: WorkspaceLoginInfo) => Promise<void>
  clearWorkspace: () => Promise<void>
  restoreWorkspace: () => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedWorkspace: null,
  workspaceUrl: null,
  workspaceEndpoint: null,
  workspaceToken: null,

  setWorkspace: async (info: WorkspaceLoginInfo) => {
    await SecureStore.setItemAsync('workspace_url', info.workspaceUrl)
    await SecureStore.setItemAsync('workspace_id', info.workspace)
    await SecureStore.setItemAsync('workspace_token', info.token)
    await SecureStore.setItemAsync('workspace_endpoint', info.endpoint)

    set({
      selectedWorkspace: info.workspace,
      workspaceUrl: info.workspaceUrl,
      workspaceEndpoint: info.endpoint,
      workspaceToken: info.token,
    })
  },

  clearWorkspace: async () => {
    await SecureStore.deleteItemAsync('workspace_url')
    await SecureStore.deleteItemAsync('workspace_id')
    await SecureStore.deleteItemAsync('workspace_token')
    await SecureStore.deleteItemAsync('workspace_endpoint')

    set({
      selectedWorkspace: null,
      workspaceUrl: null,
      workspaceEndpoint: null,
      workspaceToken: null,
    })
  },

  restoreWorkspace: async () => {
    const workspaceUrl = await SecureStore.getItemAsync('workspace_url')
    const workspace = await SecureStore.getItemAsync('workspace_id')
    const token = await SecureStore.getItemAsync('workspace_token')
    const endpoint = await SecureStore.getItemAsync('workspace_endpoint')

    // Only populate state if ALL four keys are present
    if (workspaceUrl != null && workspace != null && token != null && endpoint != null) {
      set({
        selectedWorkspace: workspace as WorkspaceUuid,
        workspaceUrl,
        workspaceEndpoint: endpoint,
        workspaceToken: token,
      })
    }
  },
}))
