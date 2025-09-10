import { describe, expect, test } from '@jest/globals'

process.env.STAGE_ENV = 'prod'

import PROD from '../src/seamless/config/prod'
import { changeAcceptedBet } from '../src/fake-api/websocket/util'
import { SocketData } from '../src/fake-api/websocket/socket-data'

import { initDb, mainSQL, mongoDB, casinoManager, authManager } from '../src/seamless/app'
import { BetActionType, BettingStatusType } from '../src/common/fake-packet-types'
import { tryTransaction } from './seamless.honorlink.test'
import { processPlayerBetRequestFakeChip } from '../src/fake-api/websocket/router-game-common'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { vendorCode } from '../src/fake-api/app'
import { playerBettingStateFakeChip } from '../src/fake-api/websocket/baccarat/playerBettingStateFakeChip'
import { processPlayerBetResponse } from '../src/fake-api/websocket/baccarat/router-game-baccarat'
import { fakeEvolutionDebit } from '../src/seamless/module/fake-evolution.service'
import { makeTransferRequest } from './seamless.fchev.test'

async function initDatabase() {
  console.log('initDatabase')
  await initDb({ rdbOptions: PROD.RDB_OPTIONS, mongoOptions: PROD.MONGO_OPTIONS })
}

async function cleanDatabase() {
  console.log('cleanDatabase')

  await mongoDB.agentGameSetting.updateOne(
    {
      agentCode: 'ttt',
    },
    {
      $set: {
        'betLimitByGameType.casino': {
          minBet: 0,
          maxBet: 10000000,
          allowBet: true,
        },
      },
    },
  )

  await mainSQL.dbConnection.close()
  await mongoDB.dbConnection.close()
}

const testUsername = 'ttttest1'

const sid = 'testToken'

describe('websocket test', () => {
  beforeEach(() => {
    return initDatabase()
  })
  afterEach(() => {
    return cleanDatabase()
  })

  test('changeAcceptedBet lightning test', async () => {
    const acceptedBets = {
      Tie: {
        amount: 2000,
        payoff: 2000,
        limited: false,
      },
      TieLightning: {
        amount: 400,
        payoff: 400,
        limited: false,
      },
      Player: {
        amount: 9000,
        payoff: 9000,
        limited: false,
      },
      PlayerLightning: {
        amount: 1800,
        payoff: 1800,
        limited: false,
      },
    }
    const betOrg = {
      Tie: 5000,
      Player: 150000,
    }
    //const totalWinMoney = changeAcceptedBet('LightningBac0001', acceptedBets, betOrg)

    const newAcceptedBets = changeAcceptedBet('LightningBac0001', acceptedBets, betOrg)

    let totalWinMoney = 0
    for (const spot in newAcceptedBets) {
      totalWinMoney += newAcceptedBets[spot].payoff
    }

    expect(totalWinMoney).toBe(186000)
    expect(newAcceptedBets).toStrictEqual({
      Tie: {
        amount: 5000,
        payoff: 5000,
        limited: false,
      },
      TieLightning: {
        amount: 1000,
        payoff: 1000,
        limited: false,
      },
      Player: {
        amount: 150000,
        payoff: 150000,
        limited: false,
      },
      PlayerLightning: {
        amount: 30000,
        payoff: 30000,
        limited: false,
      },
    })
  })

  test('changeAcceptedBet lightning non payoff test', async () => {
    const acceptedBets = {
      Tie: {
        amount: 2000,
        payoff: 2000,
        limited: false,
      },
      TieLightning: {
        amount: 400,
        payoff: 0,
        limited: false,
      },
      Player: {
        amount: 9000,
        payoff: 9000,
        limited: false,
      },
      PlayerLightning: {
        amount: 1800,
        payoff: 0,
        limited: false,
      },
    }
    const betOrg = {
      Tie: 5000,
      Player: 150000,
    }

    const newAcceptedBets = changeAcceptedBet('LightningBac0001', acceptedBets, betOrg)

    let totalWinMoney = 0
    for (const spot in newAcceptedBets) {
      totalWinMoney += newAcceptedBets[spot].payoff
    }

    expect(totalWinMoney).toBe(155000)
    expect(newAcceptedBets).toStrictEqual({
      Tie: {
        amount: 5000,
        payoff: 5000,
        limited: false,
      },
      TieLightning: {
        amount: 1000,
        payoff: 0,
        limited: false,
      },
      Player: {
        amount: 150000,
        payoff: 150000,
        limited: false,
      },
      PlayerLightning: {
        amount: 30000,
        payoff: 0,
        limited: false,
      },
    })
  })

  test('playerBettingState Cancelled test', async () => {
    const tableId = 'o4kymodby2fa2c7g'
    //const gameId = '1746ab5cc31099f757e395eb'
    const gameId = new Date().getTime().toString()

    const { user, agent } = await authManager.checkAuth(testUsername)
    expect(user).not.toBeNull()
    if (user == null) {
      return
    }
    expect(agent).not.toBeNull()
    if (agent == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 250000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance })
    user.balance = initBalance

    const transId1 = Number(new Date().getTime().toString() + '1')

    const betRequestPacket = {
      id: 'g93h640e7y',
      type: 'baccarat.playerBetRequest',
      args: {
        replyId: 'baccarat.playerBetRequest-443759583-1677216337114',
        gameId,
        timestamp: 1677216337114,
        mwLayout: 8,
        openMwTables: 1,
        orientation: 'landscape',
        appVersion: 4,
        btVideoQuality: 'HD',
        videoProtocol: 'fmp4',
        action: {
          name: 'Chips' as BetActionType,
          chips: {
            Player: 100000,
          },
        },
      },
    }
    const socketData = new SocketData({ user, agent, mongoDB, casinoManager, tableId })
    const tableData = socketData.createSingleTable(tableId)

    const betReceivePacket = await processPlayerBetRequestFakeChip(betRequestPacket, socketData, tableData)
    expect(betReceivePacket?.args.action?.chips?.Player).toBe(5000)

    const betResponsePacket = await processPlayerBetResponse(
      {
        id: '0000018448634ea9006b42f0d234ff52',
        type: 'baccarat.playerBetResponse',
        args: {
          gameId,
          timestamp: 1677216337114,
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
            lastPlacedOn: 1677216337114,
            canDoubleTo: 0,
          },
          tableId,
        },
        time: 1677216337114,
      },
      socketData,
      tableData,
    )
    expect(betResponsePacket?.args.state.currentChips?.Player).toBe(100000)

    const betResult1 = await fakeEvolutionDebit(
      authManager,
      casinoManager,
      gameId,
      makeTransferRequest(testUsername, sid, tableId, transId1.toString(), null, gameId, 100000),
    )

    expect(betResult1.status).toBe('OK')

    const cancelledPacket = {
      id: '0000018681e375b302d645538343e68b',
      type: 'baccarat.playerBettingState',
      args: {
        gameId,
        idleRounds: 0,
        state: {
          status: 'Cancelled' as BettingStatusType,
          totalAmount: 0,
          currency: 'KRW',
          currentChips: {},
          acceptedBets: {
            Player: {
              amount: 17000,
              payoff: 17000,
              limited: false,
            },
          },
          rejectedBets: {},
          chipHistory: [],
          timedChipHistory: [],
          lastGameChips: {
            Player: 17000,
          },
          canUndo: false,
          canRepeat: {},
          canDouble: false,
        },
        restore: false,
        version: 289844341,
        tableId,
      },
      time: 1677216413107,
    }

    const processedPacket = await playerBettingStateFakeChip(cancelledPacket, {
      socketData,
      tableData,
      //clientWs: new WebSocket(null),
    })
    if (processedPacket == null) {
      expect(processedPacket).not.toBeNull()
    }

    expect(processedPacket?.args.state?.acceptedBets?.Player.amount).toBe(100000)
    expect(processedPacket?.args.state?.currentChips).toStrictEqual({})
    expect(processedPacket?.args.state?.totalAmount).toBe(0)

    const betData = await mongoDB.betDataCasino.findOne({
      where: {
        summaryId: `${vendorCode}-${tableId}-${gameId}`,
        vendor: vendorCode,
        userId: user.userId,
        agentCode: user.agentCode,
      },
    })

    expect(betData?.amountBet).toBe(100000)
    expect(betData?.amountWin).toBe(100000)

    const balance = await authManager.balance(agentCode, userId)
    expect(balance.balance).toBe(initBalance)
  })

  test('playerBettingState Lightning Cancelled test', async () => {
    const tableId = 'LightningBac0001'
    //const gameId = '1746ab5cc31099f757e395eb'
    const gameId = new Date().getTime().toString()

    const { user, agent } = await authManager.checkAuth(testUsername)
    expect(user).not.toBeNull()
    if (user == null) {
      return
    }
    expect(agent).not.toBeNull()
    if (agent == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 250000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance })
    user.balance = initBalance

    const transId1 = Number(new Date().getTime().toString() + '1')

    const betRequestPacket = {
      id: 'g93h640e7y',
      type: 'baccarat.playerBetRequest',
      args: {
        replyId: 'baccarat.playerBetRequest-443759583-1677216337114',
        gameId,
        timestamp: 1677216337114,
        mwLayout: 8,
        openMwTables: 1,
        orientation: 'landscape',
        appVersion: 4,
        btVideoQuality: 'HD',
        videoProtocol: 'fmp4',
        action: {
          name: 'Chips' as BetActionType,
          chips: {
            Player: 100000,
          },
        },
      },
    }
    const socketData = new SocketData({ user, agent, mongoDB, casinoManager, tableId })
    const tableData = socketData.createSingleTable(tableId)

    const betReceivePacket = await processPlayerBetRequestFakeChip(betRequestPacket, socketData, tableData)
    expect(betReceivePacket?.args.action?.chips?.Player).toBe(5000)

    const betResponsePacket = await processPlayerBetResponse(
      {
        id: '0000018448634ea9006b42f0d234ff52',
        type: 'baccarat.playerBetResponse',
        args: {
          gameId,
          timestamp: 1677216337114,
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
            lastPlacedOn: 1677216337114,
            canDoubleTo: 0,
          },
          tableId,
        },
        time: 1677216337114,
      },
      socketData,
      tableData,
    )
    expect(betResponsePacket?.args.state.currentChips?.Player).toBe(100000)

    const betResult1 = await fakeEvolutionDebit(
      authManager,
      casinoManager,
      gameId,
      makeTransferRequest(testUsername, sid, tableId, transId1.toString(), null, gameId, 100000),
    )
    expect(betResult1?.status).toBe('OK')

    const balance1 = await authManager.balance(agentCode, userId)
    expect(balance1.balance).toBe(initBalance - 120000)

    const cancelledPacket = {
      id: '0000018681e375b302d645538343e68b',
      type: 'baccarat.playerBettingState',
      args: {
        gameId,
        idleRounds: 0,
        state: {
          status: 'Cancelled' as BettingStatusType,
          totalAmount: 0,
          currency: 'KRW',
          currentChips: {},
          acceptedBets: {
            Player: {
              amount: 17000,
              payoff: 17000,
              limited: false,
            },
          },
          rejectedBets: {},
          chipHistory: [],
          timedChipHistory: [],
          lastGameChips: {
            Player: 17000,
          },
          canUndo: false,
          canRepeat: {},
          canDouble: false,
        },
        restore: false,
        version: 289844341,
        tableId,
      },
      time: 1677216413107,
    }

    const processedPacket = await playerBettingStateFakeChip(cancelledPacket, {
      socketData,
      tableData,
      //clientWs: new WebSocket(null),
    })
    if (processedPacket == null) {
      expect(processedPacket).not.toBeNull()
    }

    expect(processedPacket?.args.state?.acceptedBets?.Player.amount).toBe(100000)
    expect(processedPacket?.args.state?.currentChips).toStrictEqual({})
    expect(processedPacket?.args.state?.totalAmount).toBe(0)

    const betData = await mongoDB.betDataCasino.findOne({
      where: {
        summaryId: `${vendorCode}-${tableId}-${gameId}`,
        vendor: vendorCode,
        userId: user.userId,
        agentCode: user.agentCode,
      },
    })

    expect(betData?.amountBet).toBe(120000)
    expect(betData?.amountWin).toBe(120000)

    const balance = await authManager.balance(agentCode, userId)
    expect(balance.balance).toBe(initBalance)
  })
})
