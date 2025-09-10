import { describe, expect, test } from '@jest/globals'
import { v4 } from 'uuid'

process.env.STAGE_ENV = 'prod'

import { initDb, mainSQL, mongoDB, authManager, casinoManager } from '../src/seamless/app'

import PROD from '../src/seamless/config/prod'
import { vendorCode } from '../src/seamless/module/fake-evolution.service'
import { calcSettleBet, ManualSettleGameData } from '../src/common/settle'
import { ObjectId } from 'mongodb'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { getUserInfo } from '@service/src/lib/common/game/auth-manager'
import { fakeEvolutionDebit } from '../src/seamless/module/fake-evolution.service'
import { DebitRequest } from '@service/src/vendor/evolution/interface'

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
  sid: string,
  tableId: string,
  transId: string,
  orgId: string | null,
  roundId: string,
  amount: number,
) {
  return {
    transaction: {
      id: transId,
      refId: orgId ?? transId,
      amount,
    },
    sid,
    userId: username,
    uuid: v4(),
    currency: 'KRW',
    game: {
      id: roundId + '-qi4xeqphfpoac2sh',
      type: 'baccarat',
      details: {
        table: {
          id: tableId,
          vid: null,
        },
      },
    },
  } as DebitRequest
}

describe('fchev betting test', () => {
  beforeEach(() => {
    return initDatabase()
  })
  afterEach(() => {
    return cleanDatabase()
  })

  test('fake fchev fake lightning bet and twice settle test', async () => {
    const authRes = await authManager.checkAuth(testUsername)

    const { agent } = authRes

    let { user } = authRes

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    const sid = 'testToken'

    const initBalance = 20000
    await mainSQL.repos.user.update({ userId, agentCode }, { balance: initBalance, fakeMode: true, gameToken: sid })
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
    const transId1 = transId + '1'

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
      const betResult1 = await fakeEvolutionDebit(
        authManager,
        casinoManager,
        roundId,
        makeTransferRequest(testUsername, sid, tableId, transId1, null, roundId, 2000),
      )

      expect(betResult1.status).toBe('OK')
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

    const newUser = await mainSQL.repos.user.findOne({
      where: { userId: 'test1', agentCode: 'ttt' },
    })
    expect(newUser?.balance).toBe(68000)
  })
})
