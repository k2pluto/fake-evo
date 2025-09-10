import { vendorCode } from '../app'
import {
  type DragonTigerBetResponse,
  type DragonTigerBets,
  type DragonTigerBetsClose,
  type DragonTigerBetsOpen,
  type PlayerBetRequest,
} from '../../common/fake-packet-types'
import { isLightningTable } from '../../common/fake-util'
import { type ReceiveRouterType, type SendRouterType } from '../module/types'
import { bettingStats, gameWinners, playerBetRequest, resolved } from './router-game-common'
import { type SocketData } from './socket-data'
import { type TableData } from './table-data'
import { processBetAction, updateBetAction } from '../../common/bet-action'
import { type BetResponseCallbackType } from './router-bet-response'
import { type FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'

// 원래 playerBetRequest 에서 전부 처리했는데 rejected 된 베팅인지 확인할려고 betResponse로 옳김
export const playerBetResponse: ReceiveRouterType<DragonTigerBetResponse> = async (
  packet,
  { socketData, tableData, clientWs },
) => {
  const { user } = socketData
  const { tableId } = tableData
  const { gameId, replyId } = packet.args

  const packetTimestamp = Number(replyId?.split('-')[2])

  console.log(
    `bet response start ${user.agentCode + user.userId} tableId ${tableId} round ${gameId} ${packetTimestamp}`,
  )

  for (let i = 0; i < socketData.preProcessBetQueue.length; i++) {
    const preProcessBet = socketData.preProcessBetQueue[i]
    if (preProcessBet.timestamp === packetTimestamp) {
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
async function processPlayerBetResponse(
  packet: DragonTigerBetResponse,
  { user, mongoDB }: SocketData,
  tableData: TableData,
) {
  const { tableId } = tableData

  const { gameId } = packet.args

  const userGameData = tableData.getUserGameData(gameId)

  const username = user.agentCode + user.userId

  console.log(`bet response process ${username} tableId ${tableId} round ${gameId}`)
  console.log(JSON.stringify(packet))

  const searchId = `${username}-${vendorCode}-${tableId}-${gameId}`

  const fakeBet = await mongoDB.fakeBetData.findOne({ where: { searchId } })

  // fake 데이터가 없으면 fake로 베팅을 안한거니 그냥 받은 그대로 리턴한다.
  if (fakeBet == null) {
    return packet
  }

  const betOrg = fakeBet.betOrg ?? {}
  const betFake = fakeBet.betFake ?? {}

  const packetTimestamp = packet.args.replyId?.split('-')[2]

  if (packetTimestamp == null) {
    return packet
  }

  const betRequestPacket = fakeBet.saveBet[packetTimestamp] as PlayerBetRequest

  if (betRequestPacket != null) {
    const setObj: Partial<FakeBetData> = {}

    if (tableData.limits == null) {
      await tableData.updateLimits(mongoDB)
    }

    // 심리스에서도 이미 베팅을 받았으면 여기서 더이상 betResponse 를 처리하지 않는다.
    /* if (fakeBet?.betStatus != null) {
      return packet
    } */

    if (packet.args.errorCode == null) {
      const { incOrgChips, incFakeChips } = await processBetAction({
        mongoDB,
        fakeBet,
        user,
        vendor: vendorCode,
        requestPacket: { ...betRequestPacket, responseChips: packet.args.bets.chips },
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

  for (const spot of Object.keys(betOrg)) {
    if (betOrg[spot] <= 0) {
      delete betOrg[spot]
      delete betFake[spot]
    }
  }

  const betAmount = Object.values(betOrg).reduce((a, b) => a + b, 0)

  packet.args.bets.totalAmount = betAmount

  // packet.args.state.canDoubleTo = Math.min(betAmount * 2,

  packet.args.bets.chips = betOrg
  userGameData.currentChips = betOrg
  userGameData.currentFakeChips = betFake

  // console.log(JSON.stringify(packet))

  return packet
}

export const betsOpen: ReceiveRouterType<DragonTigerBetsOpen> = async (packet, { socketData, tableData }) => {
  const { tableId } = tableData
  const { user, mongoDB } = socketData
  const { gameId, bets } = packet.args

  const { status, chips } = bets ?? {}

  console.log(`playerBettingState ${user.agentCode + user.userId} tableId ${tableId} round ${gameId} status ${status}`)
  console.log(JSON.stringify(packet))

  const userGameData = tableData.getUserGameData(gameId)
  tableData.setCurrentGameData(userGameData)

  tableData.init()

  if (Object.keys(chips ?? {}).length === 0) {
    /* if (isLightningTable(tableId)) {
      for (const spot in tableData.currentChips) {
        bets.lastGameChips[spot] = tableData.currentChips[spot]
        bets.lastGameChips[spot + 'Lightning'] = tableData.currentChips[spot] * 0.2
      }
    } else {
      bets.lastGameChips = tableData.currentChips
    } */
    return packet
  }

  // 베팅일 때도 currentChips가 있으면 베팅 후에 F5 새로고침을 했을 때 다시 Betting 상태로 오기 때문에 betOrg에서 데이터를 받아서 채워줘야 한다.

  const betData = await mongoDB.betDataCasino.findOne({
    where: {
      summaryId: `${vendorCode}-${tableId}-${gameId}`,
      vendor: vendorCode,
      userId: user.userId,
      agentCode: user.agentCode,
    },
  })

  // fake 데이터가 없으면 fake로 베팅을 안한거니 그냥 받은 그대로 리턴한다.
  if (betData?.betOrg == null) {
    return packet
  }

  // Cancelled 일때는 currentChips가 없다.
  if (Object.keys(chips ?? {}).length > 0) {
    if (isLightningTable(tableId)) {
      for (const spot in betData.betOrg) {
        bets.chips[spot] = betData.betOrg[spot]
        bets.chips[spot + 'Lightning'] = betData.betOrg[spot] * 0.2
      }
      /* for (const spot in tableData.currentChips) {
        bets.lastGameChips[spot] = tableData.currentChips[spot]
        bets.lastGameChips[spot + 'Lightning'] = tableData.currentChips[spot] * 0.2
      } */
    } else {
      bets.chips = betData.betOrg
      // bets.lastGameChips = tableData.currentChips
    }
  }

  const betAmount = Object.values(bets.chips).reduce((a, b) => a + b, 0)

  bets.totalAmount = betAmount

  return packet
}

export const betsClosed: ReceiveRouterType<DragonTigerBetsClose> = async (packet, { socketData, tableData }) => {
  const { tableId } = tableData
  const { user } = socketData
  const { gameId } = packet.args

  console.log(
    `${packet.type} ${user.agentCode + user.userId} tableId ${tableId} round ${gameId}`,
    JSON.stringify(packet),
  )

  return packet
}

export const bets: ReceiveRouterType<DragonTigerBets> = async (packet, { socketData, tableData }) => {
  const { tableId } = tableData
  const { user, mongoDB } = socketData
  const { gameId, bets } = packet.args

  const { status, balances } = bets

  console.log(
    `playerBettingState ${user.agentCode + user.userId} tableId ${tableId} round ${gameId} status ${status}`,
    JSON.stringify(packet),
  )

  const userGameData = tableData.getUserGameData(gameId)
  tableData.setCurrentGameData(userGameData)

  const betData = await mongoDB.betDataCasino.findOne({
    where: {
      summaryId: `${vendorCode}-${tableId}-${gameId}`,
      vendor: vendorCode,
      userId: user.userId,
      agentCode: user.agentCode,
    },
  })

  // fake 데이터가 없으면 fake로 베팅을 안한거니 그냥 받은 그대로 리턴한다.
  if (betData?.betOrg == null) {
    return packet
  }

  if (status === 'BetsAccepted') {
    userGameData.currentChips = betData.betOrg
    userGameData.currentFakeChips = betData.betFake
    console.log(
      `bet accepted ${user.agentCode + user.userId} tableId ${tableId} round ${gameId} balance ${
        balances?.[0]?.amount
      }`,
    )
    userGameData.accepted = true
  }

  // Cancelled 일때는 currentChips가 없다.
  if (Object.keys(bets.chips ?? {}).length > 0) {
    if (isLightningTable(tableId)) {
      for (const spot in betData.betOrg) {
        bets.chips[spot] = betData.betOrg[spot]
        bets.chips[spot + 'Lightning'] = betData.betOrg[spot] * 0.2
      }
      /* for (const spot in tableData.currentChips) {
          bets.lastGameChips[spot] = tableData.currentChips[spot]
          bets.lastGameChips[spot + 'Lightning'] = tableData.currentChips[spot] * 0.2
        } */
    } else {
      bets.chips = betData.betOrg
      // bets.lastGameChips = tableData.currentChips
    }
  }

  const betAmount = Object.values(bets.chips).reduce((a, b) => a + b, 0)

  bets.totalAmount = betAmount

  return packet
}

const tableState: ReceiveRouterType = async (
  packet: {
    args: {
      tableId: string
      tableName: string
    }
  },
  { socketData: { user } },
) => {
  console.log(
    `tableState ${user.agentCode + user.userId} tableId ${packet.args.tableId} tableName ${packet.args.tableName}`,
  )

  return packet
}

export const DragonTigerSendRouter = {
  'dragontiger.bet': playerBetRequest,
} as Record<string, SendRouterType>

export const DragonTigerReceiveRouter = {
  'dragontiger.resolved': resolved,
  'dragontiger.gameWinners': gameWinners,
  'dragontiger.bettingStats': bettingStats,
  // ['dragontiger.cardDealt']: processDragonTigerCardDealt,
  'dragontiger.bet': playerBetResponse,
  'dragontiger.betsOpen': betsOpen,
  'dragontiger.betsClosed': betsClosed,
  'dragontiger.bets': bets,
  'dragontiger.tableState': tableState,
} as Record<string, ReceiveRouterType>

export const DragonTigerBetResponseRouter = {
  dragontiger: processPlayerBetResponse,
} as Record<string, BetResponseCallbackType>
