import { describe, expect, test } from '@jest/globals'

process.env.STAGE_ENV = 'prod'

import { initDb, mainSQL, mongoDB, authManager, casinoManager } from '../src/seamless/app'

import PROD from '../src/seamless/config/prod'
import { changeBalance, vendorCode } from '../src/seamless/module/fake-honor.controller'
import { calcSettleBet, ManualSettleGameData } from '../src/common/settle'
import { ObjectId } from 'mongodb'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { addMinutes } from 'date-fns'
import { FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'
import { FakeGameData } from '@service/src/lib/interface/mongo/fake-game-data'

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

//const fakeHonorController = new EvolutionHonorFakeController(casinoService, authService)

const testUsername = 'ttttest1'

export async function tryTransaction(
  username: string,
  tableId: string,
  transId: number,
  orgId: number | null,
  roundId: string,
  type: 'bet' | 'win' | 'cancel',
  amount: number,
) {
  return changeBalance({
    command: '',
    request_timestamp: new Date().toISOString(),
    hash: '',
    username,
    amount,
    transaction: {
      id: transId,
      type,
      referer_id: orgId,
      amount,
      processed_at: new Date().toISOString(),
      details: {
        game: {
          id: tableId,
          round: roundId + '-' + 'qrdwizfr7jp6bjmh',
          title: 'Korean Speed Baccarat A',
          type: 'baccarat',
          vendor: 'evolution',
        },
      },
      target: {
        id: 1804476,
        username: testUsername,
        balance: 697000,
        point: '0.00',
      },
    },
  })
}

describe('honorlink betting test', () => {
  beforeEach(() => {
    return initDatabase()
  })
  afterEach(() => {
    return cleanDatabase()
  })
  test('fakehonor betting with table betting limit test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    await mainSQL.repos.user.update({ userId: user.userId, agentCode: user.agentCode }, { balance: 20000 })
    user.balance = 0

    const tableId = 'p63cmvmwagteemoy'

    await mongoDB.agentGameSetting.updateOne(
      { agentCode: user.agentCode },
      {
        $set: {
          [`betLimitByTable.${tableId}`]: {
            minBet: 0,
            maxBet: 5000,
            allowBet: true,
          },
        },
      },
    )

    const round = new ObjectId().toString()

    const transId1 = Number(new Date().getTime().toString() + '1')

    let betResult1
    let errObj
    try {
      betResult1 = await tryTransaction(testUsername, tableId, transId1, null, round, 'bet', -10000)
    } catch (err) {
      errObj = err
    }

    console.log(betResult1)
    console.log(errObj)

    expect(errObj).not.toBeNull()

    const newUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
    expect(newUser?.balance).toBe(20000)
  })

  test('fakehonor org cancel and bet test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const initBalance = 20000
    await mainSQL.repos.user.update({ userId: user.userId, agentCode: user.agentCode }, { balance: initBalance })
    user.balance = 0

    const tableId = 'p63cmvmwagteemoy'

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

    const round = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')

    const transId2 = Number(transId + '2')

    let cancelResult1
    let errObj
    try {
      cancelResult1 = await tryTransaction(testUsername, tableId, transId1, transId2, round, 'cancel', 12000)
    } catch (err) {
      errObj = err
    }

    console.log(cancelResult1)
    console.log(errObj)

    expect(errObj).not.toBeNull()

    let betResult1

    try {
      betResult1 = await tryTransaction(testUsername, tableId, transId2, null, round, 'bet', -12000)
    } catch (err) {
      errObj = err
    }

    console.log(betResult1)
    console.log(errObj)

    expect(errObj.status).toBe(500)

    const newUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
    expect(newUser?.balance).toBe(20000)
  })

  test('fakehonor org bet and settle test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const initBalance = 20000
    await mainSQL.repos.user.update({ userId: user.userId, agentCode: user.agentCode }, { balance: initBalance })
    user.balance = 0

    const tableId = 'p63cmvmwagteemoy'

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

    const round = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')

    const transId2 = Number(transId + '2')

    let errObj
    try {
      const res = await tryTransaction(testUsername, tableId, transId1, null, round, 'bet', -12000)

      expect(res.status).toBe(CommonReturnType.Success)
      expect(res.balance).toBe(8000)
    } catch (err) {
      console.log(err)
      throw err
    }

    console.log(errObj)
    expect(errObj).not.toBeNull()

    try {
      const res = await tryTransaction(testUsername, tableId, transId2, transId1, round, 'win', 24000)
      console.log(res)
      expect(res.status).toBe(CommonReturnType.Success)
    } catch (err) {
      console.log(err)
      throw err
    }

    console.log(errObj)

    const newUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
    expect(newUser?.balance).toBe(32000)
  })

  test('fakehonor org bet and cancel test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const initBalance = 20000
    await mainSQL.repos.user.update({ userId: user.userId, agentCode: user.agentCode }, { balance: initBalance })
    user.balance = 0

    const tableId = 'p63cmvmwagteemoy'

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

    const round = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')

    const transId2 = Number(transId + '2')

    let errObj
    try {
      const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, round, 'bet', -12000)

      expect(betResult1.status).toBe(CommonReturnType.Success)
      expect(betResult1.balance).toBe(8000)
    } catch (err) {
      console.log(err)
      throw err
    }

    console.log(errObj)
    expect(errObj).not.toBeNull()

    try {
      const cancelResult1 = await tryTransaction(testUsername, tableId, transId2, transId1, round, 'cancel', 12000)
      expect(cancelResult1.status).toBe(CommonReturnType.Success)
    } catch (err) {
      console.log(err)
      throw err
    }

    console.log(errObj)

    const newUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
    expect(newUser?.balance).toBe(20000)
  })

  test('fakehonor fake bet and settle twice test', async () => {
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
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance })
    user.balance = 0

    const tableId = 'p63cmvmwagteemoy'

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
            Player: 12000,
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
      const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)

      expect(betResult1.status).toBe(CommonReturnType.Success)
      expect(betResult1.balance).toBe(8000)
    } catch (err) {
      console.log(err)
      throw err
    }

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
      dealing: 'Finished',
    } as ManualSettleGameData

    try {
      const res = await calcSettleBet(authManager, casinoManager, betData, gameData)

      if (res == null) {
        throw 'settle res is null'
      }

      expect(res.status).toBe(CommonReturnType.Success)
      expect(res.balance).toBe(32000)
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

    const newUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
    expect(newUser?.balance).toBe(32000)
  })

  test('fakehonor fake bet with betTime test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    const { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 20000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance })
    user.balance = initBalance

    const tableId = 'p63cmvmwagteemoy'

    const roundId = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')

    const summaryId = vendorCode + '-' + tableId + '-' + roundId

    const betTime = addMinutes(new Date(), -5)

    await mongoDB.fakeBetData.updateOne(
      {
        vendor: vendorCode,
        summaryId,
        userId: user.userId,
        agentCode: user.agentCode,
      },
      {
        $setOnInsert: {
          betTime,
        },
        $set: {
          updatedAt: new Date(),
          roundId,
          gameId: tableId,
          tableId,
          saveBet: {},
          betOrg: {
            Player: 12000,
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
      const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)

      expect(betResult1.status).toBe(CommonReturnType.Success)
      expect(betResult1.balance).toBe(8000)
    } catch (err) {
      console.log(err)
      throw err
    }

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
    expect(betData).not.toBeNull()
    expect(betData).not.toBeNull()

    expect(betData.betTime.getTime()).toBe(betTime.getTime())
  })

  test('fakehonor fake bet UndoAll and Banker Bet and Repeat and Double without betOrg', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    const { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 100000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance, fakeBalance: initBalance })
    user.balance = 0

    const tableId = 'p63cmvmwagteemoy'
    {
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
            saveBet: {
              '1674211110060': {
                id: 'v4zmbmpz9a',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211110060,
                  action: {
                    name: 'Chips',
                    chips: {
                      Player: 25000,
                    },
                  },
                },
              },
              '1674211110222': {
                id: 'q39trpcg5k',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211110222,
                  action: {
                    name: 'Chips',
                    chips: {
                      Player: 25000,
                    },
                  },
                },
              },
              '1674211110420': {
                id: 'hd67pixu2e',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211110420,
                  action: {
                    name: 'Chips',
                    chips: {
                      Player: 25000,
                    },
                  },
                },
              },
              '1674211110961': {
                id: '20s407xo4r',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211110961,
                  action: {
                    name: 'Chips',
                    chips: {
                      Player: 25000,
                    },
                  },
                },
              },
              '1674211111354': {
                id: 'w4qwk78020',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211111354,
                  action: {
                    name: 'Chips',
                    chips: {
                      Player: 25000,
                    },
                  },
                },
              },
              '1674211111879': {
                id: 'phl48sqnwm',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211111879,
                  action: {
                    name: 'Undo',
                  },
                },
              },
              '1674211112186': {
                id: 'a8pkczx6b0',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211112186,
                  action: {
                    name: 'Undo',
                  },
                },
              },
              '1674211112487': {
                id: 'qioc1t7r6q',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211112487,
                  action: {
                    name: 'Undo',
                  },
                },
              },
              '1674211112784': {
                id: 'nlvk1o72x0',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211112784,
                  action: {
                    name: 'UndoAll',
                  },
                },
              },
              '1674211113566': {
                id: 'orjq9qv4zo',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211113566,
                  action: {
                    name: 'Chips',
                    chips: {
                      Banker: 25000,
                    },
                  },
                },
              },
            },
          } as Partial<BetData>,
        },
        {
          upsert: true,
        },
      )

      let errObj
      try {
        const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)

        expect(betResult1.status).toBe(CommonReturnType.Success)
        expect(betResult1.balance).toBe(75000)

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
          dealing: 'Finished',
        } as ManualSettleGameData

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
        expect(betData).not.toBeNull()

        const fakeBet = await mongoDB.fakeBetData.findOne({
          where: {
            summaryId,
            userId,
            agentCode,
          },
        })
        if (fakeBet == null) {
          throw 'fakeBet is null'
        }
        expect(betData).not.toBeNull()

        expect(fakeBet.calculatedOrg.Banker).toBe(25000)

        const res = await calcSettleBet(authManager, casinoManager, betData, gameData)

        if (res == null) {
          throw 'settle res is null'
        }

        expect(res.status).toBe(CommonReturnType.Success)
        expect(res.balance).toBe(75000)
      } catch (err) {
        console.log(err)
        throw err
      }

      console.log(errObj)
      expect(errObj).not.toBeNull()

      const user2 = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
      expect(user2?.balance).toBe(75000)
    }

    {
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
            saveBet: {
              '1674211135140': {
                id: 'to1m2ux9st',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211135140.0,
                  action: {
                    name: 'Repeat',
                    mode: 'AllBets',
                  },
                },
              },
              '1674211135350': {
                id: 'w4jsd6crgg',
                type: 'baccarat.playerBetRequest',
                args: {
                  timestamp: 1674211135350.0,
                  action: {
                    name: 'Double',
                  },
                },
              },
            },
          } as Partial<BetData>,
        },
        {
          upsert: true,
        },
      )

      try {
        const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)

        expect(betResult1.status).toBe(CommonReturnType.Success)
        expect(betResult1.balance).toBe(25000)
      } catch (err) {
        console.log(err)
        throw err
      }

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
      expect(betData).not.toBeNull()

      const user2 = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
      expect(user2?.balance).toBe(25000)
    }
  })

  test('fakehonor fake bet small Reject without betOrg', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 30000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance })
    user.balance = initBalance

    const tableId = 'p63cmvmwagteemoy'

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
          betLimits: {
            Player: {
              min: 1000,
              max: 10_000_000,
            },
            PlayerBonus: {
              min: 1000,
              max: 10_000_000,
            },
          },
          saveBet: {
            '1674211163866': {
              id: 'ppucdb5rd7',
              type: 'baccarat.playerBetRequest',
              args: {
                timestamp: 1674211163866.0,
                action: {
                  name: 'Chips',
                  chips: {
                    Player: 1000,
                  },
                },
              },
            },
            '1674211164338': {
              id: '9qyoowzwno',
              type: 'baccarat.playerBetRequest',
              args: {
                timestamp: 1674211164338.0,
                action: {
                  name: 'Chips',
                  chips: {
                    PlayerBonus: 500,
                  },
                },
              },
            },
          },
        } as Partial<FakeBetData>,
      },
      {
        upsert: true,
      },
    )

    try {
      const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -1000)

      expect(betResult1.status).toBe(CommonReturnType.Success)
      expect(betResult1.balance).toBe(29000)
    } catch (err) {
      console.log(err)
      throw err
    }

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
    expect(betData).not.toBeNull()

    const newUser = await mainSQL.repos.user.findOne({ where: { userId: 'test1', agentCode: 'ttt' } })
    expect(newUser?.balance).toBe(29000)
  })

  test('fakehonor fake cancel and bet', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 30000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance })
    user.balance = initBalance

    const tableId = 'p63cmvmwagteemoy'

    const roundId = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')
    const transId2 = Number(transId + '2')

    const summaryId = vendorCode + '-' + tableId + '-' + roundId

    try {
      const betResult1 = await tryTransaction(testUsername, tableId, transId2, transId1, roundId, 'cancel', 2000)

      expect(betResult1.status).toBe(CommonReturnType.Success)
      expect(betResult1.balance).toBeUndefined()
    } catch (err) {
      console.log(err)
      throw err
    }

    const cancelData = await mongoDB.betDataCasino.findOne({
      where: {
        vendor: vendorCode,
        summaryId,
        userId,
        agentCode,
      },
    })
    if (cancelData == null) {
      throw 'betData is null'
    }
    expect(cancelData).not.toBeNull()

    const resUser = await mainSQL.repos.user.findOne({
      where: { userId: 'test1', agentCode: 'ttt' },
    })
    expect(resUser?.balance).toBe(initBalance)
    if (resUser == null) {
      expect(resUser).not.toBeNull()
      return
    }

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
          saveBet: {
            '1674211163866': {
              id: 'ppucdb5rd7',
              type: 'baccarat.playerBetRequest',
              args: {
                timestamp: 1674211163866.0,
                action: {
                  name: 'Chips',
                  chips: {
                    Player: 5000,
                  },
                },
              },
            },
          },
        } as Partial<FakeBetData>,
      },
      {
        upsert: true,
      },
    )

    try {
      await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -2000)
    } catch (err) {
      expect(err.message).toBe('already settle bet ttttest1')
      console.log(err)
    }

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
    expect(betData).not.toBeNull()
    expect(betData.betStatus).toBe('CANCEL')

    const newUser = await mainSQL.repos.user.findOne({
      where: { userId: 'test1', agentCode: 'ttt' },
    })
    expect(newUser?.balance).toBe(30000)
  })

  test('fakehonor fake bet unproceed action', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 400000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance })
    user.balance = initBalance

    const tableId = 'p63cmvmwagteemoy'

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
          saveBet: {
            '1674211163866': {
              id: 'ppucdb5rd7',
              type: 'baccarat.playerBetRequest',
              args: {
                timestamp: 1674211163866.0,
                action: {
                  name: 'Chips',
                  chips: {
                    Player: 100000,
                  },
                },
              },
              proceed: true,
            },
            '1674211164338': {
              id: '9qyoowzwno',
              type: 'baccarat.playerBetRequest',
              args: {
                timestamp: 1674211163866.0,
                action: {
                  name: 'Chips',
                  chips: {
                    Player: 100000,
                  },
                },
              },
              proceed: true,
            },
            '1674211164339': {
              id: '9qyoowzwno',
              type: 'baccarat.playerBetRequest',
              args: {
                timestamp: 1674211163866.0,
                action: {
                  name: 'Chips',
                  chips: {
                    Player: 100000,
                  },
                },
              },
            },
          },
          betOrg: {
            Player: 200000,
          },
          betFake: {
            Player: 20000,
          },
        } as Partial<FakeBetData>,
      },
      {
        upsert: true,
      },
    )

    try {
      const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -1000)

      expect(betResult1.status).toBe(CommonReturnType.Success)
      expect(betResult1.balance).toBe(100000)
    } catch (err) {
      console.log(err)
      throw err
    }

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
    expect(betData).not.toBeNull()

    const newUser = await mainSQL.repos.user.findOne({
      where: { userId: 'test1', agentCode: 'ttt' },
    })
    expect(newUser?.balance).toBe(100000)
  })

  test('fakehonor fake bet action with closed state', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const initBalance = 400000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance })
    user.balance = initBalance

    const tableId = 'p63cmvmwagteemoy'

    const roundId = new ObjectId().toString()

    const transId = new Date().getTime().toString()
    const transId1 = Number(transId + '1')

    const summaryId = vendorCode + '-' + tableId + '-' + roundId

    const closedTime = new Date()

    await mongoDB.fakeGameData.updateOne(
      {
        userId,
        gameId: roundId,
        tableId: tableId,
      } as Partial<FakeGameData>,
      {
        $set: {
          updatedAt: new Date(),
          packet: {
            '000001875a992171009056d17ac9ece5': {
              id: '000001875a992171009056d17ac9ece5',
              type: 'baccarat.gameState',
              args: {
                gameId: roundId,
                gameNumber: '07:23:17',
                betting: 'BetsOpen',
                dealing: 'Idle',
                isBurning: false,
                cuttingCard: false,
                tableId,
              },
              time: closedTime.getTime() - 1000,
            },
            '000001875a995456004556d478ee68c9': {
              id: '000001875a995456004556d478ee68c9',
              type: 'baccarat.gameState',
              args: {
                gameId: roundId,
                gameNumber: '07:23:17',
                betting: 'BetsClosed',
                dealing: 'Idle',
                isBurning: false,
                cuttingCard: false,
                tableId,
              },
              time: closedTime.getTime(),
            },
            '000001875a995655004856d49cd64aec': {
              id: '000001875a995655004856d49cd64aec',
              type: 'baccarat.gameState',
              args: {
                gameId: roundId,
                gameNumber: '07:23:17',
                betting: 'BetsClosed',
                dealing: 'Idle',
                isBurning: false,
                cuttingCard: false,
                tableId,
              },
              time: closedTime.getTime() + 1000,
              //time: 1680852211285.0,
            },
          },
        } as Partial<FakeGameData>,
      },
      {
        upsert: true,
      },
    )

    const chipTime1 = closedTime.getTime() - 500
    const chipTime2 = closedTime.getTime() + 500

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
          saveBet: {
            [chipTime1]: {
              id: 'ppucdb5rd7',
              type: 'baccarat.playerBetRequest',
              args: {
                timestamp: chipTime1,
                action: {
                  name: 'Chips',
                  chips: {
                    Player: 100000,
                  },
                },
              },
              proceed: true,
            },
            [chipTime2]: {
              id: 'ppucdb5rd7',
              type: 'baccarat.playerBetRequest',
              args: {
                timestamp: chipTime2,
                action: {
                  name: 'Chips',
                  chips: {
                    Player: 100000,
                  },
                },
              },
            },
          },
          betOrg: {
            Player: 100000,
          },
          betFake: {
            Player: 20000,
          },
        } as Partial<FakeBetData>,
      },
      {
        upsert: true,
      },
    )

    try {
      const betResult1 = await tryTransaction(testUsername, tableId, transId1, null, roundId, 'bet', -1000)

      expect(betResult1.status).toBe(CommonReturnType.Success)
      expect(betResult1.balance).toBe(300000)
    } catch (err) {
      console.log(err)
      throw err
    }

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
    expect(betData).not.toBeNull()

    const newUser = await mainSQL.repos.user.findOne({
      where: { userId: 'test1', agentCode: 'ttt' },
    })
    expect(newUser?.balance).toBe(300000)
  })
})
