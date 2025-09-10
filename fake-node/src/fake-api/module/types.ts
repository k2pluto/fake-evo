import { type TableData } from '../websocket/table-data'
import { type SocketData } from '../websocket/socket-data'
import { type WebSocket } from 'ws'

export enum FakeApiStatus {
  Success = 0,
  DataNotFound = 1,
  InvalidParameter = 2,
  AlreadyBetClosed = 10,
  InternalServerError = 100,
}

export type SendRouterType = (
  packet: unknown,
  params: {
    socketData: SocketData
    tableData: TableData
    evolutionWs: WebSocket
    clientWs: WebSocket
  },
) => Promise<unknown>

export interface ReceiveRouterParams {
  socketData: SocketData
  tableData: TableData
  clientWs?: WebSocket
}

export type ReceiveRouterType<T = unknown> = (packet: T, params: ReceiveRouterParams) => Promise<T | null>
