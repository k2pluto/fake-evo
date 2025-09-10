import _ from 'lodash'
import {
  EvolutionBettingErrorCode,
  type BettingStats,
  type GameWinner,
  type Resolved,
  type PlayerBetRequest,
} from '../../common/fake-packet-types'
import { type ReceiveRouterType, type SendRouterType } from '../module/types'

import { WebSocket } from 'ws'
import { vendorCode } from '../app'
import { type FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'
import { type TableData } from './table-data'
import { type SocketData } from './socket-data'
import { type SaveBetType, getFakeChip } from '../../common/bet-action'

import { changeAcceptedBet, fakeSettle, makePacketId, needCalcOddsTable, settle, waitGameResult } from './util'
import { playerBetResponse } from './baccarat/router-game-baccarat'
import { config } from '../config'
import { errorToString } from '../../common/util'

export const playerBetRequest: SendRouterType = async (
  packet: PlayerBetRequest,
  { socketData, tableData, evolutionWs, clientWs },
) => {
  processPlayerBetRequestQueue(packet, socketData, tableData, evolutionWs, clientWs).catch((err) => {
    console.log(err)
  })
}

let betLoop = 0

// queue에 넣고 처리하지 않으면 Undo 시에 똑같은 베팅을 Undo 할려고 시도하기 때문에 큐로 처리한다.
export async function processBetLoop(socketData: SocketData, clientWs: WebSocket) {
  const { agentCode, userId } = socketData.user
  const username = agentCode + userId

  betLoop += 1
  console.log('processBetLoop_start', username, socketData.uuid, betLoop)

  socketData.runningBetResponseLoop = true

  while (socketData.running && socketData.runningBetResponseLoop) {
    while (socketData.preProcessBetQueue.length > 0) {
      const preProcessBet = socketData.preProcessBetQueue[0]
      if (preProcessBet?.response == null) {
        break
      }

      const { request, response, tableId } = preProcessBet

      const { timestamp } = request.args

      const tableData = socketData.getTable(tableId)
      try {
        const betResponse = response
        if (betResponse != null) {
          const res = await socketData.betResponseCallback(betResponse, socketData, tableData)
          if (res != null && clientWs.readyState === WebSocket.OPEN) {
            const sendContent = JSON.stringify(res)
            console.log(`bet response send ${username} ${timestamp} ${sendContent}`)
            clientWs.send(sendContent)
          }
        }
      } catch (err) {
        console.log(`bet response loop error ${username} ${timestamp} ${errorToString(err)}`)
      }
      socketData.preProcessBetQueue.shift()
    }
    await socketData.waitBetResponse()
  }
  betLoop -= 1
  console.log('processBetLoop_end', username, socketData.uuid, betLoop)
}

// queue에 넣고 처리하지 않으면 mongodb 에서 동시에 upsert 할 때 E11000 duplicate error 가 발생해서 큐로 처리한다.
async function processPlayerBetRequestQueue(
  packet: PlayerBetRequest,
  socketData: SocketData,
  tableData: TableData,
  evolutionWs: WebSocket,
  clientWs: WebSocket,
) {
  const { user } = socketData
  const { timestamp, gameId } = packet.args
  // const { action, timestamp } = packet.args
  // const actionStr = JSON.stringify(action)

  const username = user.agentCode + user.userId
  const { tableId } = tableData
  console.log(`bet_request_start ${username} ${timestamp} tableId ${tableId} round ${gameId}`)

  if (!socketData.runningBetResponseLoop) {
    // console.log(`bet response loop start ${username} ${timestamp}`)
    processBetLoop(socketData, clientWs).catch((err) => {
      console.log(err)
    })
  }

  socketData.preProcessBetQueue.push({
    request: packet,
    tableId,
    timestamp,
  })

  if (socketData.betRequestQueue == null) {
    // console.log(`bet request loop start ${username} ${timestamp} ${actionStr}`)
    socketData.betRequestQueue = []
    socketData.betRequestQueue.push({
      request: packet,
      tableId,
      timestamp,
    })
    while (socketData.betRequestQueue.length > 0) {
      try {
        const betRequest = socketData.betRequestQueue[0]
        if (betRequest != null) {
          const tableData = socketData.getTable(betRequest.tableId)
          const res = await (config.fake100Percent
            ? processPlayerBetRequestFake100(betRequest.request, socketData, tableData, clientWs)
            : processPlayerBetRequestFakeChip(betRequest.request, socketData, tableData, clientWs))
          if (res != null && evolutionWs.readyState === WebSocket.OPEN) {
            const sendContent = JSON.stringify(res)
            console.log(`bet request send ${username} ${timestamp} ${sendContent}`)
            evolutionWs.send(sendContent)
          }
        }
      } catch (err) {
        console.log(`bet request loop error ${username} ${timestamp} ${errorToString(err)}`)
      }
      socketData.betRequestQueue.shift()
    }
    // console.log(`bet request loop end ${username} ${timestamp} ${actionStr}`)
    socketData.betRequestQueue = null
  } else {
    // console.log(`bet request loop push ${username} ${timestamp} ${actionStr}`)
    socketData.betRequestQueue.push({
      request: packet,
      tableId,
      timestamp,
    })
  }

  console.log(`bet_request_end ${username} ${timestamp} tableId ${tableId} round ${gameId}`)
}

export function convertFakeChip(fakePacket: PlayerBetRequest) {
  const { action } = fakePacket.args

  const { name } = action
  if (name === 'Chips') {
    const fakeChips = {}
    const { chips } = action
    for (const spot in chips) {
      // 에볼루션 베팅시에 페이크 칩을 넣는다.
      fakeChips[spot] = getFakeChip(chips[spot])
    }

    action.chips = fakeChips
  } else if (name === 'Chip') {
    action.chip.amount = getFakeChip(action.chip.amount)
  }
}

export async function processPlayerBetRequestFakeChip(
  orgPacket: PlayerBetRequest,
  socketData: SocketData,
  tableData: TableData,
  clientWs?: WebSocket,
) {
  const { user, mongoDB } = socketData

  const username = user.agentCode + user.userId

  const { tableId } = tableData

  const { gameId, action, timestamp } = orgPacket.args

  const { name } = action

  console.log(
    `bet request process ${username} ${name} ${timestamp} tableId ${tableId} round ${gameId} ${JSON.stringify(action)}`,
  )

  const orgRequest: SaveBetType = orgPacket
  // const fakePacket: PlayerBetRequest = structuredClone(orgPacket)
  const fakePacket: PlayerBetRequest = _.cloneDeep(orgPacket)

  let result = fakePacket

  const userGameData = tableData.getUserGameData(gameId)

  userGameData.betting = true

  orgRequest.receiveTime = new Date()

  userGameData.betOrgRequests[orgRequest.args.timestamp] = orgRequest

  convertFakeChip(fakePacket)

  userGameData.betFakeRequests.push(fakePacket)

  if (tableData.limits == null) {
    await tableData.updateLimits(mongoDB)
  }

  const searchId = `${username}-${vendorCode}-${tableId}-${gameId}`
  await mongoDB.fakeBetData.updateOne(
    {
      searchId,
    } as Partial<FakeBetData>,
    {
      $setOnInsert: {
        betTime: new Date(),
        betLimits: tableData.limits,
      },
      $set: {
        vendor: vendorCode,
        userId: user.userId,
        agentCode: user.agentCode,
        updatedAt: new Date(),
        roundId: gameId,
        gameId: tableId,
        tableId,
        [`saveBet.${orgPacket.args.timestamp}`]: { ...orgPacket, tableId },
      } as Partial<FakeBetData>,
    },
    {
      upsert: true,
    },
  )

  if (config.fakeDoubleBet) {
    // fakeBetData의 saveBet을 업데이트 한 이후에 playerBetResponse를 호출해야
    // saveBet이 생기므로 정확하게 처리가 된다.
    if (name === 'Double') {
      // double 일때는 패킷을 보내지 않는다.
      const time = new Date().getTime()

      const id = makePacketId(time)

      playerBetResponse(
        {
          id,
          type: 'baccarat.playerBetResponse',
          args: {
            gameId,
            // Player Bet Request timestamp와 같음
            state: {
              status: 'Betting',
              totalAmount: 0,
              currency: 'KRW',
              currentChips: {},
              acceptedBets: {},
              rejectedBets: {},
              chipHistory: [],
              timedChipHistory: [],
              lastGameChips: {},
              canUndo: true,
              canRepeat: { AllBets: true, MainOnly: true, MainAndPairs: true },
              canDouble: true,
              lastPlacedOn: timestamp,
              canDoubleTo: 0,
            },
            timestamp,
            tableId,
          },
          time,
        },
        { socketData, tableData, clientWs },
      ).catch((err) => {
        console.log(err)
      })

      result = null
    }

    const { betRequestStack } = userGameData

    if (name === 'Undo') {
      if (betRequestStack.length > 0) {
        const lastRequest = betRequestStack.pop()

        if (lastRequest.args.action.name === 'Double') {
          // 만약에 double을 Undo 할려고 하면 가짜로 메시지를 뿌려준다.
          const time = new Date().getTime()

          const id = makePacketId(time)

          playerBetResponse(
            {
              id,
              type: 'baccarat.playerBetResponse',
              args: {
                gameId,
                // Player Bet Request timestamp와 같음
                state: {
                  status: 'Betting',
                  totalAmount: 0,
                  currency: 'KRW',
                  currentChips: {},
                  acceptedBets: {},
                  rejectedBets: {},
                  chipHistory: [],
                  timedChipHistory: [],
                  lastGameChips: {},
                  canUndo: true,
                  canRepeat: { AllBets: true, MainOnly: true, MainAndPairs: true },
                  canDouble: true,
                  lastPlacedOn: timestamp,
                  canDoubleTo: 0,
                },
                timestamp,
                tableId,
              },
              time,
            },
            { socketData, tableData, clientWs },
          ).catch((err) => {
            console.log(err)
          })

          result = null
        }
      }
    } else if (name === 'UndoAll') {
      userGameData.betRequestStack = []
    } else {
      userGameData.betRequestStack.push(orgPacket)
    }
  }

  return result
}

export async function processPlayerBetRequestFake100(
  orgPacket: PlayerBetRequest,
  socketData: SocketData,
  tableData: TableData,
  clientWs: WebSocket,
): Promise<PlayerBetRequest | undefined> {
  const { user, mongoDB } = socketData

  const username = user.agentCode + user.userId

  const { tableId } = tableData

  const { gameId, action, timestamp } = orgPacket.args

  const userGameData = tableData.getUserGameData(gameId)

  const { name } = action

  console.log(
    `bet request process ${username} ${name} ${timestamp} tableId ${tableId} round ${gameId} ${JSON.stringify(action)}`,
  )

  const orgRequest: SaveBetType = orgPacket
  // const fakePacket: PlayerBetRequest = structuredClone(orgPacket)
  const fakePacket: PlayerBetRequest = _.cloneDeep(orgPacket)
  // 벳오픈이 아니면 여기서 막는다.
  if (userGameData.gameStateData?.betting !== 'BetsOpen' || userGameData.gameStateData.gameId !== gameId) {
    console.log(
      `bet request invalid ${username} ${name} ${timestamp} tableId ${tableId} round ${gameId} ${JSON.stringify(
        action,
      )}`,
    )
    const time = new Date().getTime()
    const id = makePacketId(time)
    playerBetResponse(
      {
        id,
        type: 'baccarat.playerBetResponse',
        args: {
          gameId,
          // Player Bet Request timestamp와 같음
          state: {
            status: 'Betting',
            totalAmount: 0,
            currency: 'KRW',
            currentChips: {},
            acceptedBets: {},
            rejectedBets: {},
            chipHistory: [],
            timedChipHistory: [],
            lastGameChips: {},
            canUndo: true,
            canRepeat: { AllBets: true, MainOnly: true, MainAndPairs: true },
            canDouble: true,
            lastPlacedOn: timestamp,
            canDoubleTo: 0,
          },
          timestamp,
          tableId,
          errorCode: EvolutionBettingErrorCode.TimoutBetError,
        },
        time,
      },
      { socketData, tableData, clientWs },
    ).catch((err) => {
      console.log(err)
    })
    return null
  }

  userGameData.betting = true

  orgRequest.receiveTime = new Date()

  userGameData.betOrgRequests[orgRequest.args.timestamp] = orgRequest

  convertFakeChip(fakePacket)

  userGameData.betFakeRequests.push(fakePacket)

  if (tableData.limits == null) {
    await tableData.updateLimits(mongoDB)
  }

  const searchId = `${username}-${vendorCode}-${tableId}-${gameId}`
  await mongoDB.fakeBetData.updateOne(
    {
      searchId,
    } as Partial<FakeBetData>,
    {
      $setOnInsert: {
        betTime: new Date(),
        betLimits: tableData.limits,
      },
      $set: {
        vendor: vendorCode,
        userId: user.userId,
        agentCode: user.agentCode,
        updatedAt: new Date(),
        roundId: gameId,
        gameId: tableId,
        tableId,
        [`saveBet.${orgPacket.args.timestamp}`]: { ...orgPacket, tableId },
      } as Partial<FakeBetData>,
    },
    {
      upsert: true,
    },
  )

  const time = new Date().getTime()

  const id = makePacketId(time)

  playerBetResponse(
    {
      id,
      type: 'baccarat.playerBetResponse',
      args: {
        gameId,
        // Player Bet Request timestamp와 같음
        state: {
          status: 'Betting',
          totalAmount: 0,
          currency: 'KRW',
          currentChips: {},
          acceptedBets: {},
          rejectedBets: {},
          chipHistory: [],
          timedChipHistory: [],
          lastGameChips: {},
          canUndo: true,
          canRepeat: { AllBets: true, MainOnly: true, MainAndPairs: true },
          canDouble: true,
          lastPlacedOn: timestamp,
          canDoubleTo: 0,
        },
        timestamp,
        tableId,
      },
      time,
    },
    { socketData, tableData, clientWs },
  ).catch((err) => {
    console.log(err)
  })

  return null
}

// 플레이어가 베팅을 했으면 베팅을 한 금액만큼을 bettingStat에 더해서 퍼센티지를 매긴다.
export const bettingStats: ReceiveRouterType<BettingStats> = async (packet, { tableData }) => {
  const userGameData = tableData.getUserGameData(packet.args.gameId)
  if (userGameData.betting) {
    for (const spot in packet.args.stats) {
      packet.args.stats[spot].amount +=
        (userGameData.currentChips[spot] ?? 0) - (userGameData.currentFakeChips[spot] ?? 0)
    }

    let totalAmount = 0
    for (const spot in packet.args.stats) {
      totalAmount += packet.args.stats[spot].amount
    }

    for (const spot in packet.args.stats) {
      const stat = packet.args.stats[spot]
      stat.percentage = Math.floor((stat.amount / totalAmount) * 100)
    }
  }

  return packet
}

export const resolved: ReceiveRouterType<Resolved> = async (packet, { socketData, tableData }) => {
  const { user, mongoDB } = socketData
  const { tableId } = tableData

  const { gameId, bets } = packet.args

  const username = user.agentCode + user.userId

  console.log(`resolve ${username} tableId ${tableId} round ${gameId}`, JSON.stringify(packet))

  const userGameData = tableData.getUserGameData(gameId)

  userGameData.resolved = true

  tableData.safeResolveSettle()

  if (config.fake100Percent) {
    if (Object.values(userGameData.currentChips).length > 0) {
      return null
    }

    return packet
  }

  if (bets == null) {
    return packet
  }

  const betData = await mongoDB.betDataCasino.findOne({
    where: {
      vendor: vendorCode,
      userId: user.userId,
      agentCode: user.agentCode,
      fakeRoundId: gameId,
    },
  })

  // fake 데이터가 없으면 fake로 베팅을 안한거니 그냥 받은 그대로 리턴한다.
  // betStatus가 BET이 아니면 베팅을 받은게 아니니 받은 그대로 리턴
  if (betData?.betOrg == null) {
    return packet
  }

  // 만약 acceptedBets에 betOrg의 모든 내용이 다 있으면 기다릴 필요가 없음
  const gameResult = needCalcOddsTable(bets.acceptedBets, betData.betOrg)
    ? await waitGameResult(username, tableId, gameId)
    : null

  // 가끔 기다렸는데 gameResult가 안나오는 경우가 있다.

  bets.acceptedBets = changeAcceptedBet(tableId, bets.acceptedBets, betData.betOrg, gameResult)

  const betAmount = Object.values(bets.acceptedBets)
    .map((value) => value.amount)
    .reduce((a, b) => a + b, 0)

  bets.totalAmount = betAmount

  if (betData.betStatus === 'BET') {
    // 여기서 마감치면 한 라운드에 동시에 마감이 들어올 때 가끔 중복으로 윈 금액이 올라가는 경우가 생겨서 진짜 마감을 치는 척만 한다.
    await fakeSettle(bets.acceptedBets, betData.roundId, socketData, tableData)
  }

  bets.currentChips = betData.betOrg

  return packet
}

export const gameWinners: ReceiveRouterType<GameWinner> = async (packet, { socketData: { user }, tableData }) => {
  const userGameData = tableData.getUserGameData(packet.args.gameId)
  if (Object.keys(userGameData.currentChips ?? {}).length === 0) {
    // const { userId, agentCode } = user
    // console.log(`gameWinners no betting ${agentCode + userId} `)
    return packet
  }
  const { userId, agentCode } = user

  // 베팅을 했으면 잠시 totalWinMoney가 나올 때 까지 기다린다.
  // console.log('baccarat.gameWinners waitTotalWinMoney')
  const totalWinMoney = await tableData.waitTotalWinMoney()
  console.log(`baccarat.gameWinners ${agentCode + userId} totalWinMoney ${totalWinMoney}`)

  if (totalWinMoney > 0) {
    // 추가를 한다면 기존의 아이디가 있는지 확인하고 삭제한다.

    const currentIndex = packet.args.winners.findIndex((value) => {
      // 옛날에 만들어진 닉네임은 그냥 userId고 새롭게 만들어지는 닉네임은 agentCode + userId 라 두개 다 검색해야 한다.
      return value.screenName === userId || value.screenName === agentCode + userId
    })

    if (currentIndex > 0) {
      packet.args.winners.splice(currentIndex, 1)
    }

    const addIndex = packet.args.winners.findIndex((value) => {
      return totalWinMoney > value.winnings
    })

    if (addIndex >= 0) {
      packet.args.winners.splice(addIndex, 0, {
        playerId: userId,
        screenName: userId,
        winnings: totalWinMoney,
        multiplier: [],
      })
    }
  }

  return packet
}
