import type WebSocket from 'ws'

export class SocketClient {
  ws: WebSocket
  balanceUpdated = false
}
