import { v4 as uuidv4 } from 'uuid'
import { type MongoBet } from '@service/src/lib/interface/mongo'
import { type EvolutionConfigData } from '@service/src/lib/interface/mongo/data-evolution-table'
import { getBaccaratLimits, sleep } from '../../common/util'

import { type SocketData } from './socket-data'
import { UserGameData } from './user-game-data'
import { type Chips } from '../../common/types'

export class TableData {
  uuid: string
  socketData: SocketData
  tableId: string
  config: EvolutionConfigData
  limits: Record<
    string,
    {
      min: number
      max: number
    }
  >

  // lastGameChips 는 게임마다 이어서 되기 때문에 테이블 데이터에 있어야 한다.
  lastGameChips: Chips = {}

  settleResolve?: () => void
  settlePromise: Promise<void>
  // gameStateData?: GameStateData
  // bettingState?: PlayerBettingState
  requestListener?: (request: string) => Promise<void>
  totalWinMoney: number
  totalWinMoneyResolve?: (value: number) => void

  userGameDatas: Record<string, UserGameData> = {}

  currentGameData: UserGameData

  constructor(data: Partial<TableData>) {
    Object.assign(this, data)
    this.uuid = uuidv4()
  }

  init() {
    this.safeResolveSettle()
    this.safeResolveTotalWinMoney(null)
  }

  deleteOldUserGameData() {
    const timestamp = new Date().getTime()
    const userGameDataValues = Object.values(this.userGameDatas)
    if (userGameDataValues.length > 5) {
      const userGameData = userGameDataValues[0]
      if (timestamp - userGameData.createdAt.getTime() > 60_000 * 5) {
        console.log('deleted userGameData', this.socketData.username, this.tableId, userGameData.gameId)
        delete this.userGameDatas[userGameData.gameId]
      }
    }
  }

  getUserGameData(gameId: string) {
    const gameData = (this.userGameDatas[gameId] ??= new UserGameData({
      tableId: this.tableId,
      gameId: gameId.toString(),
    }))

    this.deleteOldUserGameData()

    return gameData
  }

  setCurrentGameData(gameData: UserGameData) {
    this.currentGameData = gameData
  }

  // 패킷으로 마감될때까지 기다린다.
  async waitSettle() {
    if (this.settlePromise == null) {
      this.settlePromise = new Promise<void>(async (resolve) => {
        if (this.currentGameData == null) {
          resolve()
          return
        }
        const { gameId, accepted } = this.currentGameData
        const { user } = this.socketData
        if (!accepted && this.socketData.willUnsubscribe) {
          // 만약 아직 베팅 수락은 되지 않았는데 베팅이 남아있으면 DB에서 추적하다가 마감한다.
          /* if (this.betting) {
            waitSettleByDB({
              mongoDB,
              authManager,
              casinoManager,
              tableId: this.tableId,
              gameId: this.gameId,
              agentCode: user.agentCode,
              userId: user.userId,
            }).catch((err) => console.log(err))
          } */

          // 여기서 해결해서 연결을 끊어줘야 연결이 끊겼는데 베팅되는 경우가 생기지 않는다.
          resolve()
          return
        }

        console.log(`waitSettle ${user.agentCode + user.userId} tableId ${this.tableId} round ${gameId}`)

        this.settleResolve = resolve

        // 유저가 재접속하면서 resolve가 안올 때를 대비해서
        // 최대 1분간 기다렸다가 waitSettleByDB안에서 마감됬는지 확인하고 안됬으면 마감하고 resolve 한다.
        await sleep(60_000)
        /* waitSettleByDB({
          mongoDB,
          authManager,
          casinoManager,
          tableId: this.tableId,
          gameId: this.gameId,
          agentCode: user.agentCode,
          userId: user.userId,
        }).catch((err) => console.log(err)) */
        resolve()
      })
    }
    await this.settlePromise
  }

  safeResolveSettle() {
    this.settleResolve?.()
    this.settleResolve = null
    this.settlePromise = null
  }

  async waitTotalWinMoney() {
    if (this.totalWinMoney != null) {
      return this.totalWinMoney
    }
    return await new Promise<number>((resolve) => {
      this.totalWinMoneyResolve = resolve

      // 최대 3초간 기다린다.
      setTimeout(() => {
        resolve(0)
      }, 3_000)
    })
  }

  safeResolveTotalWinMoney(amount: number) {
    this.totalWinMoney = amount
    this.totalWinMoneyResolve?.(amount)
    this.totalWinMoneyResolve = null
  }

  async updateLimits(mongoDB: MongoBet) {
    if (this.config == null) {
      const { userId, agentCode } = this.socketData.user

      const evolutionTable = await mongoDB.fakeUserTableConfig.findOne({
        where: { userId, agentCode, tableId: this.tableId },
      })

      this.config = evolutionTable?.configData
      this.limits = getBaccaratLimits(this.config)

      console.log('tableData_updateLimits', userId, agentCode, this.tableId, JSON.stringify(this.limits))
    }
  }
}
