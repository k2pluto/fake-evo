import { describe, expect, test } from '@jest/globals'

process.env.STAGE_ENV = 'prod'

import { initDb, mainSQL, mongoDB, authManager, casinoManager } from '../src/seamless/app'

import PROD from '../src/seamless/config/prod'
import { changeBalance } from '../src/seamless/module/fake-honor.controller'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'

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

describe('betting test', () => {
  beforeEach(() => {
    return initDatabase()
  })
  afterEach(() => {
    return cleanDatabase()
  })
  test('bet limit test', async () => {
    const { agent, user } = await authManager.checkAuth(testUsername)

    expect(agent).not.toBeNull()

    expect(user).not.toBeNull()

    if (agent == null || user == null) {
      return
    }

    const { userId, agentCode } = user

    await mainSQL.repos.user.update({ userId: user.userId, agentCode: user.agentCode }, { balance: 500000 })
    user.balance = 500000

    await mongoDB.agentGameSetting.updateOne(
      {
        agentCode,
      },
      {
        $set: {
          'betLimitByGameType.casino': {
            minBet: 1000,
            maxBet: 50000,
            allowBet: true,
          },
          'betLimitByTable.TESTTABLE': {
            minBet: 1000,
            maxBet: 20000,
            allowBet: true,
          },
        },
      },
      {
        upsert: true,
      },
    )

    await mongoDB.userGameSetting.updateOne(
      {
        agentCode,
        userId,
      },
      {
        $set: {
          betLimitByGameType: {},
        },
      },
      {
        upsert: true,
      },
    )

    const testVendor = 'test'

    const gameId = 'TESTGAME'

    const roundId1 = new Date().getTime().toString()

    const transId1 = new Date().getTime().toString() + '1'

    const betResult1 = await casinoManager.singleBet({
      info: {
        agent,
        user,
        vendor: testVendor,
        gameId,
        roundId: roundId1,
      },
      transId: transId1,
      incAmount: -50000,
      packet: {},
    })

    expect(betResult1.status).toBe(CommonReturnType.Success)
    expect(betResult1.balance).toBe(450000)

    const transId2 = new Date().getTime().toString() + '2'

    const betResult2 = await casinoManager.singleBet({
      info: {
        agent,
        user,
        vendor: testVendor,
        gameId,
        roundId: roundId1,
      },
      transId: transId2,
      incAmount: -10000,
      packet: {},
    })

    expect(betResult2.status).toBe(CommonReturnType.InvalidBetMoney)
    const user2 = await mainSQL.repos.user.findOne({
      where: { userId: 'test1', agentCode: 'ttt' },
    })
    if (user2 == null) {
      throw new Error('user can not find')
    }
    expect(user2).not.toBeNull()
    expect(user2.balance).toBe(450000)

    const roundId2 = new Date().getTime().toString()

    const transId3 = new Date().getTime().toString() + '3'

    const betResult3 = await casinoManager.singleBet({
      info: {
        agent,
        user: user2,
        vendor: testVendor,
        gameId,
        roundId: roundId2,
        tableId: 'TESTTABLE',
      },
      transId: transId3,
      incAmount: -30000,
      packet: {},
    })

    expect(betResult3.status).toBe(CommonReturnType.InvalidBetMoney)
    const user3 = await mainSQL.repos.user.findOne({
      where: { userId: 'test1', agentCode: 'ttt' },
    })
    if (user3 == null) {
      throw new Error('user can not find')
    }
    expect(user3).not.toBeNull()
    expect(user3.balance).toBe(450000)

    const transId4 = new Date().getTime().toString() + '3'

    const betResult4 = await casinoManager.singleBet({
      info: {
        agent,
        user: user3,
        vendor: testVendor,
        gameId,
        roundId: roundId2,
        tableId: 'TESTTABLE',
      },
      transId: transId4,
      incAmount: -20000,
      packet: {},
    })

    expect(betResult4.status).toBe(CommonReturnType.Success)
    expect(betResult4.balance).toBe(430000)
  })
})
