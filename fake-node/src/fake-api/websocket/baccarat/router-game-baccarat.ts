import { vendorCode } from '../../app'
import { type ReceiveRouterType, type SendRouterType } from '../../module/types'
import { bettingStats, gameWinners, playerBetRequest, resolved } from '../router-game-common'

import {
  type PlayerBetRequest,
  type BaccaratPlayerBetResponse,
  type TableState,
} from '../../../common/fake-packet-types'
import { getFeeInfo } from '../../../common/fake-util'
import { processBetAction, updateBetAction } from '../../../common/bet-action'
import { type SocketData } from '../socket-data'
import { type TableData } from '../table-data'
import { type FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'
import { type BetResponseCallbackType } from '../router-bet-response'
import { config } from '../../config'
import { playerBettingStateFake100 } from './playerBettingStateFake100'
import { playerBettingStateFakeChip } from './playerBettingStateFakeChip'
import { gameState } from './gameState'

// 원래 playerBetRequest 에서 전부 처리했는데 rejected 된 베팅인지 확인할려고 betResponse로 옳김
export const playerBetResponse: ReceiveRouterType<BaccaratPlayerBetResponse> = async (
  packet,
  { socketData, tableData, clientWs },
) => {
  const { user } = socketData
  const { tableId } = tableData
  const { gameId } = packet.args

  console.log(
    `bet response start`,
    user.agentCode + user.userId,
    tableId,
    gameId,
    packet.args.timestamp,
    JSON.stringify(socketData.preProcessBetQueue?.map((x) => x.timestamp)),
    JSON.stringify(packet),
  )

  for (let i = 0; i < socketData.preProcessBetQueue.length; i++) {
    const preProcessBet = socketData.preProcessBetQueue[i]
    if (preProcessBet.timestamp === packet.args.timestamp) {
      preProcessBet.response = packet

      if (i === 0) {
        socketData?.safeBetResponseResolve()
      }

      break
    }
  }

  return null
}

// 원래 playerBetRequest 에서 전부 처리했는데 rejected 된 베팅인지 확인할려고 betResponse로 옳김
export async function processPlayerBetResponse(
  packet: BaccaratPlayerBetResponse,
  { user, mongoDB }: SocketData,
  tableData: TableData,
) {
  const { tableId } = tableData

  const { gameId } = packet.args

  const userGameData = tableData.getUserGameData(packet.args.gameId)

  const username = user.agentCode + user.userId

  const searchId = `${username}-${vendorCode}-${tableId}-${gameId}`

  console.log(`bet response process`, searchId, JSON.stringify(packet))

  const fakeBet = await mongoDB.fakeBetData.findOne({
    where: { searchId },
  })

  // fake 데이터가 없으면 fake로 베팅을 안한거니 그냥 받은 그대로 리턴한다.
  if (fakeBet == null) {
    return packet
  }

  const betOrg = fakeBet.calculatedOrg ?? fakeBet.betOrg ?? {}
  const betFake = fakeBet.calculatedFake ?? fakeBet.betFake ?? {}

  const betRequestPacket = fakeBet.saveBet[packet.args.timestamp] as PlayerBetRequest
  if (betRequestPacket != null) {
    const setObj: Partial<FakeBetData> = {}

    if (tableData.limits == null) {
      await tableData.updateLimits(mongoDB)
    }

    // 심리스에서도 이미 베팅을 받았으면 여기서 더이상 betResponse 를 처리하지 않는다.
    /* if (fakeBet?.betStatus != null) {
      return packet
    } */

    if (userGameData.rejectedBets == null) {
    }

    if (packet.args.errorCode == null) {
      const { incOrgChips, incFakeChips } = await processBetAction({
        mongoDB,
        fakeBet,
        user,
        vendor: vendorCode,
        requestPacket: { ...betRequestPacket, responseChips: packet.args.state.currentChips },
        setObj,
        betOrg,
        betFake,
        limits: tableData.limits ?? {},
      })

      await updateBetAction(mongoDB, fakeBet, incOrgChips, incFakeChips, setObj)
    } else {
      // 에러가 있을 경우에는 proceed 만 체크한다.
      setObj[`saveBet.${betRequestPacket.args.timestamp}.proceed`] = true
      await updateBetAction(mongoDB, fakeBet, {}, {}, setObj)
    }
  }

  const feeInfo = getFeeInfo(tableId)
  for (const spot of Object.keys(betOrg)) {
    if (betOrg[spot] <= 0) {
      delete betOrg[spot]
      delete betFake[spot]
    } else {
      if (feeInfo != null) {
        betOrg[spot + feeInfo.name] = betOrg[spot] * feeInfo.rate
        betFake[spot + feeInfo.name] = betFake[spot] * feeInfo.rate
      }
    }
  }

  const betAmount = Object.values(betOrg).reduce((a, b) => a + b, 0)

  packet.args.state.totalAmount = betAmount

  // packet.args.state.canDoubleTo = Math.min(betAmount * 2,

  packet.args.state.currentChips = betOrg
  userGameData.currentChips = betOrg
  userGameData.currentFakeChips = betFake

  // console.log(JSON.stringify(packet))

  return packet
}

const tableState: ReceiveRouterType = async (packet: TableState, { socketData: { user }, tableData }) => {
  /*console.log(
    `tableState ${user.agentCode + user.userId} tableId ${packet.args.tableId} tableName ${packet.args.tableName} ${
      packet.args.currentGame.betting
    } ${packet.args.currentGame.dealing}`,
  )*/

  const userGameData = tableData.getUserGameData(packet.args.currentGame.gameId)

  userGameData.gameStateData = packet.args.currentGame

  return packet
}

export const BaccaratSendRouter = {
  'baccarat.playerBetRequest': playerBetRequest,
} as Record<string, SendRouterType>

export const BaccaratReceiveRouter = {
  'baccarat.resolved': resolved,
  'baccarat.gameState': gameState,
  'baccarat.tableState': tableState,
  'baccarat.gameWinners': gameWinners,
  'baccarat.bettingStats': bettingStats,
  'baccarat.playerBetResponse': playerBetResponse,
  'baccarat.playerBettingState': config.fake100Percent ? playerBettingStateFake100 : playerBettingStateFakeChip,
} as Record<string, ReceiveRouterType>

export const BaccaratBetResponseRouter = {
  baccarat: processPlayerBetResponse,
  multiwidget: processPlayerBetResponse,
} as Record<string, BetResponseCallbackType>
