/**
 * Minimal type declarations for @react-native-community/netinfo.
 *
 * These types cover only what the websocket store uses. The full types
 * will be available after `rush update` installs the package.
 */

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null
    isInternetReachable: boolean | null
    type: string
  }

  export type NetInfoChangeHandler = (state: NetInfoState) => void

  interface NetInfoModule {
    addEventListener: (handler: NetInfoChangeHandler) => () => void
    fetch: () => Promise<NetInfoState>
  }

  const NetInfo: NetInfoModule
  export default NetInfo
  export type { NetInfoState as NetInfoStateType }
}
