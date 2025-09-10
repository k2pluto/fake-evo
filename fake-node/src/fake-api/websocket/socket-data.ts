import { type CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { type MongoBet } from '@service/src/lib/interface/mongo'
import { type Agent } from '@service/src/lib/interface/sql/agent'
import { type User } from '@service/src/lib/interface/sql/user'
import { type EvolutionRequest, type PlayerBetRequest } from '../../common/fake-packet-types'
import { type BetResponseCallbackType } from './router-bet-response'
import { TableData } from './table-data'

export class SocketData {
  uuid: string
  user: User
  agent: Agent

  username: string

  mongoDB: MongoBet
  casinoManager: CasinoTransactionManager
  url: string
  evolutionUrl: URL
  ip: string
  connectionTime: Date
  headers: Record<string, string>
  type: string
  tableId: string

  lobbyVmh: string

  betResponseCallback: BetResponseCallbackType

  willUnsubscribe = false

  evolutionPackets: Record<string, EvolutionRequest> = {}

  initRequestQueue: string[] = []
  betRequestQueue?: Array<{ request: PlayerBetRequest; tableId: string; timestamp: number }>
  // betResponseQueue?: (BaccaratPlayerBetResponse | DragonTigerBetResponse)[]

  running = true

  runningBetResponseLoop = false

  packetVersion = 0

  // response 가 순서대로 처리되는지 확인하기 위한 큐
  preProcessBetQueue: Array<{ request: PlayerBetRequest; response?: any; tableId: string; timestamp: number }> = []

  betResponsePromise: Promise<void>
  betResponseResolve?: () => void

  requestListener?: (request: string) => Promise<void>
  // 싱글 게임으로 접속할 때 사용하는 멤버변수
  singleTable: TableData
  // 멀티 게임으로 접속할 때 사용하는 멤버변수
  multiTables: Record<string, TableData> = {}

  selfUrl: string

  constructor(data: Partial<SocketData> & { user: User; agent: Agent }) {
    Object.assign(this, data)
    const { user } = this
    this.username = user.agentCode + user.userId
  }

  terminate() {
    this.running = false
    this.runningBetResponseLoop = false
    this.safeBetResponseResolve()
  }

  async waitAllSettle() {
    const promises = Object.values(this.multiTables).map(async (value) => {
      await value.waitSettle()
    })
    return await Promise.all(promises)
  }

  async waitBetResponse() {
    const { user } = this
    let newPromise = false
    if (this.betResponsePromise == null && this.running && this.runningBetResponseLoop) {
      newPromise = true
      this.betResponsePromise = new Promise<void>((resolve) => {
        this.betResponseResolve = resolve
      })
    }
    console.log(`waitBetResponse new : ${newPromise} ${user.agentCode + user.userId}`)
    await this.betResponsePromise
  }

  safeBetResponseResolve() {
    this.betResponseResolve?.()
    this.betResponsePromise = null
  }

  createSingleTable(tableId: string) {
    this.singleTable = this.multiTables[tableId] ??= new TableData({
      socketData: this,
      tableId,
    })

    return this.singleTable
  }

  getTable(tableId: string) {
    const table = (this.multiTables[tableId] ??= new TableData({
      socketData: this,
      tableId,
    }))

    return table
  }

  getTables() {
    return this.multiTables
  }

  getPacketVersion() {
    return this.packetVersion
  }
}
