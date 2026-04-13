/**
 * React Native WebSocket factory.
 *
 * Implements the ClientSocketFactory interface using the RN global WebSocket.
 * JSON-only mode -- no binary protocol.
 *
 * Types are inlined from @hcengineering/client to avoid build dependency
 * issues (the client package needs rush build to generate .d.ts).
 */

import {
  type ClientSocket,
  type ClientSocketFactory,
  ClientSocketReadyState,
} from './protocol'

/**
 * Creates a ClientSocket backed by the React Native global WebSocket.
 *
 * The RN WebSocket API is similar to the browser's but runs on Hermes.
 * We only use string (JSON) messages -- binary mode is not needed.
 */
function createRNWebSocket(url: string): ClientSocket {
  const ws = new WebSocket(url)

  const socket: ClientSocket = {
    onmessage: null,
    onclose: null,
    onopen: null,
    onerror: null,

    get readyState(): ClientSocketReadyState {
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          return ClientSocketReadyState.CONNECTING
        case WebSocket.OPEN:
          return ClientSocketReadyState.OPEN
        case WebSocket.CLOSING:
          return ClientSocketReadyState.CLOSING
        case WebSocket.CLOSED:
          return ClientSocketReadyState.CLOSED
        default:
          return ClientSocketReadyState.CLOSED
      }
    },

    get bufferedAmount(): number {
      return ws.bufferedAmount ?? 0
    },

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
      ws.send(data as string)
    },

    close(code?: number): void {
      ws.close(code ?? 1000)
    },
  }

  ws.onmessage = (event: WebSocketMessageEvent) => {
    socket.onmessage?.call(socket, event as unknown as MessageEvent)
  }

  ws.onclose = (event: WebSocketCloseEvent) => {
    socket.onclose?.call(socket, event as unknown as CloseEvent)
  }

  ws.onopen = () => {
    socket.onopen?.call(socket, new Event('open'))
  }

  ws.onerror = () => {
    socket.onerror?.call(socket, new Event('error'))
  }

  return socket
}

export const RNWebSocketFactory: ClientSocketFactory = createRNWebSocket
