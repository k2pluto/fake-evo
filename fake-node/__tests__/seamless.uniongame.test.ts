import { describe, expect, test } from '@jest/globals'

process.env.STAGE_ENV = 'prod'

import { calcSettleBet, ManualSettleGameData } from '../src/common/settle'
import { ObjectId } from 'mongodb'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { TransferRequest, ReturnCodes } from '@service/src/vendor/union-game/interface'
import { getUserInfo } from '@service/src/lib/common/game/auth-manager'
import { FakeGameData } from '@service/src/lib/interface/mongo/fake-game-data'

import { unionFakeBet } from '../src/seamless/module/fake-union.service'
import { initDb, mainSQL, mongoDB, authManager, casinoManager } from '../src/seamless/app'

import PROD from '../src/seamless/config/prod'
import { vendorCode } from '../src/seamless/module/fake-union.service'

const testUsername = 'ttttest1'

const { agentCode: testAgentCode, userId: testUserId } = getUserInfo(testUsername)

async function initDatabase() {
  console.log('initDatabase')
  await initDb({ rdbOptions: PROD.RDB_OPTIONS, mongoOptions: PROD.MONGO_OPTIONS })
}

async function cleanDatabase() {
  console.log('cleanDatabase')

  await mongoDB.agentGameSetting.updateOne(
    {
      agentCode: testAgentCode,
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

  await mongoDB.userGameSetting.updateOne(
    {
      agentCode: testAgentCode,
      userId: testUserId,
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

//const fakeHonorController = new EvolutionHonorFakeController(casinoService, authService)

export function makeTransferRequest(
  username: string,
  tableId: string,
  transId: number,
  orgId: number | null,
  roundId: string,
  type: 'bet' | 'win' | 'cancel',
  amount: number,
) {
  return {
    apiKey: '7d55acaba1a6b4c846ba0b894c1fa3da',
    params: {
      transactionKey: transId.toString(),
      username: 'cool_' + username,
      siteUsername: username,
      vendorKey: 'pragmatic_slot',
      vendorName: '프라그마틱 슬롯',
      gameCategoryKey: 'casino',
      gameKey: tableId,
      gameName: 'The Dog House',
      gameTypeKey: 'casino',
      type,
      key: `${roundId}-key`,
      siteGameId: `${roundId}-rczb5ran6oifq76c`,
      parentTransactionKey: orgId?.toString(),
      groupKey: '15',
      amount: amount,
      createdAt: new Date().toISOString(),
      requestedAt: new Date().toISOString(),
    },
    requestAt: new Date().toISOString(),
  } as TransferRequest
}

describe('uniongame betting test', () => {
  beforeEach(() => {
    return initDatabase()
  })
  afterEach(() => {
    return cleanDatabase()
  })

  test('fake union fake lightning bet and twice settle test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 20000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance, fakeMode: true })
    user.balance = 0

    const tableId = 'LightningBac0001'

    await mongoDB.agentGameSetting.updateOne(
      { agentCode: user.agentCode },
      {
        $set: {
          [`betLimitByTable.${tableId}`]: {
            minBet: 0,
            maxBet: 1000000,
            allowBet: true,
          },
        },
      },
    )

    const roundId = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')

    const summaryId = vendorCode + '-' + tableId + '-' + roundId
    await mongoDB.fakeBetData.updateOne(
      {
        vendor: vendorCode,
        summaryId,
        userId: user.userId,
        agentCode: user.agentCode,
      },
      {
        $setOnInsert: {
          betTime: new Date(),
        },
        $set: {
          updatedAt: new Date(),
          roundId,
          gameId: tableId,
          tableId,
          saveBet: {},
          betOrg: {
            Player: 10000,
          },
          betFake: {
            Player: 2000,
          },
        } as Partial<BetData>,
      },
      {
        upsert: true,
      },
    )

    let errObj
    try {
      //const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)
      const betResult1 = await unionFakeBet(
        null,
        makeTransferRequest(testUsername, tableId, transId1, null, roundId, 'bet', 2000),
      )

      expect(betResult1.code).toBe(ReturnCodes.Success)
      const newUser = await mainSQL.repos.user.findOne({
        where: { userId: 'test1', agentCode: 'ttt' },
      })
      expect(newUser?.balance).toBe(8000)
    } catch (err) {
      console.log(err)
      throw err
    }

    console.log(errObj)
    expect(errObj).not.toBeNull()

    let betData = await mongoDB.betDataCasino.findOne({
      where: {
        vendor: vendorCode,
        summaryId,
        userId,
        agentCode,
      },
    })
    if (betData == null) {
      throw 'betData is null'
    }
    expect(betData).not.toBeNull()

    const gameData = {
      result: {
        winner: 'Player',
        playerScore: 7,
        bankerScore: 1,
        playerPair: false,
        bankerPair: false,
        natural: false,
      },
      playerHand: { cards: ['4S', 'QC', '3H'], score: 7 },
      bankerHand: { cards: ['AD', 'QC', 'KH'], score: 1 },
      lightningMultipliers: [{ card: '4S', value: 5 }],
      tableId,
      dealing: 'Finished',
    } as ManualSettleGameData

    try {
      const res = await calcSettleBet(authManager, casinoManager, betData, gameData)

      if (res == null) {
        return expect(res).not.toBe(null)
      }

      expect(res.status).toBe(CommonReturnType.Success)
      expect(res.balance).toBe(68000)
    } catch (err) {
      console.log(err)
      throw err
    }

    try {
      const res = await calcSettleBet(authManager, casinoManager, betData, gameData)

      if (res == null) {
        throw 'settle res is null'
      }

      expect(res.status).toBe(CommonReturnType.TransactionExists)
      expect(res.balance).toBeUndefined()
    } catch (err) {
      console.log(err)
      throw err
    }

    betData = await mongoDB.betDataCasino.findOne({
      where: {
        vendor: vendorCode,
        summaryId,
        userId,
        agentCode,
      },
    })
    if (betData == null) {
      throw 'betData is null'
    }
    expect(betData.betAccepted).toStrictEqual({ Player: 10000, PlayerLightning: 2000 })

    const newUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
    expect(newUser?.balance).toBe(68000)
  })
  test('fake union fake PT bet and twice settle test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 20000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance, fakeMode: true })
    user.balance = 0

    const tableId = 'PTBaccarat000001'

    await mongoDB.agentGameSetting.updateOne(
      { agentCode: user.agentCode },
      {
        $set: {
          [`betLimitByTable.${tableId}`]: {
            minBet: 0,
            maxBet: 1000000,
            allowBet: true,
          },
        },
      },
    )

    const roundId = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')

    const summaryId = vendorCode + '-' + tableId + '-' + roundId
    await mongoDB.fakeBetData.updateOne(
      {
        vendor: vendorCode,
        summaryId,
        userId: user.userId,
        agentCode: user.agentCode,
      },
      {
        $setOnInsert: {
          betTime: new Date(),
        },
        $set: {
          updatedAt: new Date(),
          roundId,
          gameId: tableId,
          tableId,
          saveBet: {},
          betOrg: {
            Player: 10000,
          },
          betFake: {
            Player: 2000,
          },
        } as Partial<BetData>,
      },
      {
        upsert: true,
      },
    )

    let errObj
    try {
      //const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)
      const betResult1 = await unionFakeBet(
        null,
        makeTransferRequest(testUsername, tableId, transId1, null, roundId, 'bet', 2000),
      )

      expect(betResult1.code).toBe(ReturnCodes.Success)
      const newUser = await mainSQL.repos.user.findOne({
        where: {
          userId: 'test1',
          agentCode: 'ttt',
        },
      })
      expect(newUser?.balance).toBe(8000)
    } catch (err) {
      console.log(err)
      throw err
    }

    console.log(errObj)
    expect(errObj).not.toBeNull()

    let betData = await mongoDB.betDataCasino.findOne({
      where: {
        vendor: vendorCode,
        summaryId,
        userId,
        agentCode,
      },
    })
    if (betData == null) {
      throw 'betData is null'
    }
    expect(betData).not.toBeNull()

    const gameData = {
      result: {
        winner: 'Player',
        playerScore: 7,
        bankerScore: 1,
        playerPair: false,
        bankerPair: false,
        natural: false,
      },
      playerHand: { cards: ['4S', 'QC', '3H'], score: 7 },
      bankerHand: { cards: ['AD', 'QC', 'KH'], score: 1 },
      lightningMultipliers: [{ card: '4S', value: 5 }],
      tableId,
      dealing: 'Finished',
    } as ManualSettleGameData

    try {
      const res = await calcSettleBet(authManager, casinoManager, betData, gameData)

      if (res == null) {
        return expect(res).not.toBe(null)
      }

      expect(res.status).toBe(CommonReturnType.Success)
      expect(res.balance).toBe(68000)
    } catch (err) {
      console.log(err)
      throw err
    }

    try {
      const res = await calcSettleBet(authManager, casinoManager, betData, gameData)

      if (res == null) {
        throw 'settle res is null'
      }

      expect(res.status).toBe(CommonReturnType.TransactionExists)
      expect(res.balance).toBeUndefined()
    } catch (err) {
      console.log(err)
      throw err
    }

    betData = await mongoDB.betDataCasino.findOne({
      where: {
        vendor: vendorCode,
        summaryId,
        userId,
        agentCode,
      },
    })
    if (betData == null) {
      throw 'betData is null'
    }
    expect(betData.betAccepted).toStrictEqual({ Player: 10000, PlayerFee: 2000 })
    expect(betData.amountBet).toBe(12000)
    expect(betData.fakeAmountBet).toBe(2000)
    expect(betData.amountWin).toBe(60000)

    const newUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
    expect(newUser?.balance).toBe(68000)
  })

  test('fake union fake XXXtremeLB000001 bet and settle test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 20000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance, fakeMode: true })
    user.balance = 0

    await mongoDB.userGameSetting.updateOne(
      {
        agentCode: testAgentCode,
        userId: testUserId,
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
      {
        upsert: true,
      },
    )

    const tableId = 'XXXtremeLB000001'

    await mongoDB.agentGameSetting.updateOne(
      { agentCode: user.agentCode },
      {
        $set: {
          [`betLimitByTable.${tableId}`]: {
            minBet: 0,
            maxBet: 1000000,
            allowBet: true,
          },
        },
      },
    )

    const roundId = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')

    const summaryId = vendorCode + '-' + tableId + '-' + roundId
    await mongoDB.fakeBetData.updateOne(
      {
        vendor: vendorCode,
        summaryId,
        userId: user.userId,
        agentCode: user.agentCode,
      },
      {
        $setOnInsert: {
          betTime: new Date(),
        },
        $set: {
          updatedAt: new Date(),
          roundId,
          gameId: tableId,
          tableId,
          saveBet: {},
          betOrg: {
            Player: 10000,
          },
          betFake: {
            Player: 2000,
          },
        } as Partial<BetData>,
      },
      {
        upsert: true,
      },
    )

    let errObj
    try {
      //const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)
      const betResult1 = await unionFakeBet(
        null,
        makeTransferRequest(testUsername, tableId, transId1, null, roundId, 'bet', 2000),
      )

      expect(betResult1.code).toBe(ReturnCodes.Success)
      const newUser = await mainSQL.repos.user.findOne({
        where: {
          userId: 'test1',
          agentCode: 'ttt',
        },
      })
      expect(newUser?.balance).toBe(5000)
    } catch (err) {
      console.log(err)
      throw err
    }

    console.log(errObj)
    expect(errObj).not.toBeNull()

    let betData = await mongoDB.betDataCasino.findOne({
      where: {
        vendor: vendorCode,
        summaryId,
        userId,
        agentCode,
      },
    })
    if (betData == null) {
      throw 'betData is null'
    }
    expect(betData).not.toBeNull()

    const gameData = {
      result: {
        winner: 'Player',
        playerScore: 7,
        bankerScore: 1,
        playerPair: false,
        bankerPair: false,
        natural: false,
      },
      playerHand: { cards: ['4S', 'QC', '3H'], score: 7 },
      bankerHand: { cards: ['AD', 'QC', 'KH'], score: 1 },
      lightningMultipliers: [{ card: '4S', value: 5 }],
      tableId,
      dealing: 'Finished',
    } as ManualSettleGameData

    try {
      const res = await calcSettleBet(authManager, casinoManager, betData, gameData)

      if (res == null) {
        return expect(res).not.toBe(null)
      }

      expect(res.status).toBe(CommonReturnType.Success)
      expect(res.balance).toBe(65000)
    } catch (err) {
      console.log(err)
      throw err
    }

    betData = await mongoDB.betDataCasino.findOne({
      where: {
        vendor: vendorCode,
        summaryId,
        userId,
        agentCode,
      },
    })
    if (betData == null) {
      throw 'betData is null'
    }
    expect(betData.betAccepted).toStrictEqual({ Player: 10000, PlayerFee: 5000 })
    expect(betData.amountBet).toBe(15000)
    expect(betData.fakeAmountBet).toBe(2000)
    expect(betData.amountWin).toBe(60000)

    const newUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
    expect(newUser?.balance).toBe(65000)
  })

  test('fake union already ended game fake bet test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent, user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 20000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance, fakeMode: true })
    user.balance = 0

    const tableId = 'testTableId'

    const roundId = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')
    const transId2 = Number(transId + '2')

    const summaryId = vendorCode + '-' + tableId + '-' + roundId
    {
      await mongoDB.fakeBetData.updateOne(
        {
          vendor: vendorCode,
          summaryId,
          userId: user.userId,
          agentCode: user.agentCode,
        },
        {
          $setOnInsert: {
            betTime: new Date(),
          },
          $set: {
            updatedAt: new Date(),
            roundId,
            gameId: tableId,
            tableId,
            saveBet: {},
            betOrg: {
              Player: 10000,
            },
            betFake: {
              Player: 2000,
            },
          } as Partial<BetData>,
        },
        {
          upsert: true,
        },
      )

      await mongoDB.fakeGameData.updateOne(
        {
          gameId: roundId,
          tableId,
        },
        {
          $set: {
            resultTime: new Date(),
            updatedAt: new Date(),
            betting: 'BetsClosed',
            dealing: 'Idle',
          } as Partial<FakeGameData>,
        },
        {
          upsert: true,
        },
      )

      let errObj
      //const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)
      const betResult1 = await unionFakeBet(
        null,
        makeTransferRequest(testUsername, tableId, transId1, null, roundId, 'bet', 2000),
      )

      expect(betResult1.code).toBe(ReturnCodes.Success)
      const dbUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
      if (dbUser == null) {
        return expect(dbUser).not.toBe(null)
      }
      expect(dbUser?.balance).toBe(10000)
      user.balance = dbUser?.balance

      console.log(errObj)
      expect(errObj).not.toBeNull()

      const betData = await mongoDB.betDataCasino.findOne({
        where: {
          vendor: vendorCode,
          summaryId,
          userId,
          agentCode,
        },
      })
      if (betData == null) {
        throw 'betData is null'
      }
      expect(betData.betAccepted).toStrictEqual({ Player: 10000 })
    }

    {
      await mongoDB.fakeGameData.updateOne(
        {
          gameId: roundId,
          tableId,
        },
        {
          $set: {
            resultTime: new Date(),
            updatedAt: new Date(),
            betting: 'BetsClosed',
            dealing: 'Finished',
          } as Partial<FakeGameData>,
        },
        {
          upsert: true,
        },
      )

      //const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)
      const betResult1 = await unionFakeBet(
        null,
        makeTransferRequest(testUsername, tableId, transId2, null, roundId, 'bet', 2000),
      )

      expect(betResult1.code).toBe(ReturnCodes.InternalServerError)
      const dbUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
      if (dbUser == null) {
        return expect(dbUser).not.toBe(null)
      }
      expect(dbUser?.balance).toBe(10000)
      user.balance = dbUser?.balance

      const betData = await mongoDB.betDataCasino.findOne({
        where: {
          vendor: vendorCode,
          summaryId,
          userId,
          agentCode,
        },
      })
      if (betData == null) {
        throw 'betData is null'
      }
      expect(betData.betAccepted).toStrictEqual({ Player: 10000 })
    }
  })
})
