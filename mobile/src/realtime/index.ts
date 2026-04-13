/**
 * Realtime module barrel.
 *
 * Exports the WebSocket connection infrastructure and invalidation engine.
 * Rule registration happens in the websocket store module (auto-imported
 * when the store is first accessed).
 */

export { RNWebSocketFactory } from './RNWebSocketFactory'
export {
  TransactorConnection,
  type BroadcastCallback,
  type TransactorConnectionOptions,
  type TransactorStatus,
} from './TransactorConnection'
export {
  type ClientSocket,
  type ClientSocketFactory,
  ClientSocketReadyState,
  pingConst,
  pongConst,
} from './protocol'
export {
  processBroadcast,
  registerInvalidationRule,
  type InvalidationRule,
  type TxCUDInfo,
  type TxCUDType,
} from './invalidation'
