import { FastifyInstance } from 'fastify'

import { getUserInfo } from '../../common/util'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { ChangeBalanceRequest } from '@service/src/vendor/honorlink/interface'
import { StatusResult, TransactionResult } from '@service/src/lib/common/game/save-transaction'
import { isLightningTable, isPeekTable } from '../../common/fake-util'
import { authManager, casinoManager, mainSQL, mongoDB } from '../app'
import { BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { processBetAction, SaveBetType } from '../../common/bet-action'
import { GameStatePacket } from '../../common/fake-packet-types'
import { FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'

export const vendorCode = VendorCode.FakeHonorSocket_Evolution

const useFakeBalance = false

export function registerFakeHonorController(fastify: FastifyInstance) {
  fastify.get('/hl', async (req, reply) => {
    return {
      hello: 'honor',
    }
  })

  fastify.get('/hl/balance', async (req, reply) => {
    const { username } = req.query as { [key: string]: string }

    if (username == null) {
      return {
        balance: 0,
      }
    }

    const { agentCode, userId } = getUserInfo(username)

    const balanceRes = await authManager.balance(agentCode, userId)
    if (balanceRes.status !== 0) {
      // 크롤링 아이디를 위해서 아이디가 없어도 balance를 0으로 리턴해 준다.
      return {
        balance: 0,
      }
    }

    if (useFakeBalance) {
      const { user } = balanceRes

      // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
      let balance = user.fakeBalance
      if (user.fakeBalance < balanceRes.balance && user.fakeBalance < 3_000_000) {
        console.log(`fh_balance_update ${username} ${balance} ${balanceRes.balance}`)
        await mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: balanceRes.balance })
        balance = balanceRes.balance
      }

      console.log(`fh_balance_result ${username} ${balance}`)

      return {
        balance,
      }
    } else {
      return {
        balance: balanceRes.balance,
      }
    }
  })

  fastify.post('/hl/changeBalance', async (req, reply) => {
    const body: any = req.body

    return changeBalance(body)
  })
}

export interface FakeHonorResult extends StatusResult {
  status: CommonReturnType
  beforeBalance?: number
  balance?: number
  amount?: number
}

export async function changeBalance(body: any): Promise<FakeHonorResult> {
  const { type } = body?.transaction
  console.log(`fh_changeBalance ${type} ` + JSON.stringify(body))

  switch (type) {
    case 'bet':
      return bet(body)
    case 'win': // 베팅에서 마감으로 바꾼다.
      return settle(body)
    case 'cancel': // 베팅을 취소시킨다.
      return cancelBet(body)
  }

  return {
    status: CommonReturnType.Success,
  }
}

async function bet(body: ChangeBalanceRequest) {
  const { transaction } = body
  const { username } = transaction.target
  const { id, round } = transaction.details.game

  const rounds = round.split('-')

  const roundId = rounds[0] ?? ''
  const tableId = id ?? ''

  const summaryId = vendorCode + '-' + tableId + '-' + roundId

  const { userId, agentCode } = getUserInfo(username)

  const [authInfo, fakeBet] = await Promise.all([
    authManager.checkAuth(username),
    mongoDB.fakeBetData.findOne({
      where: {
        vendor: vendorCode,
        userId,
        agentCode,
        tableId,
        roundId,
      },
    }),
  ])

  const { user, agent } = authInfo

  let betRes: TransactionResult
  if (fakeBet != null) {
    const { betLimits } = fakeBet

    // 만약 처리 안된 베팅이 있으면 처음부터 다시 betOrg 를 생성한다.
    // 처음에만 처리되고 중간에 재접속했을 때 중간에 처리안된 패킷들이 있기 때문이다.
    let unproceedPacket = false

    for (const unknownBet of Object.values(fakeBet.saveBet)) {
      const bet: any = unknownBet
      if (bet.proceed !== true) {
        unproceedPacket = true
      }
    }

    if (fakeBet.betOrg == null || unproceedPacket) {
      const setObj: Partial<FakeBetData> = {}

      console.log(`create betOrg ${username} ${summaryId}`)

      const gameData = await mongoDB.fakeGameData.findOne({
        where: {
          gameId: roundId,
          tableId: tableId,
        },
      })

      let betClosedTimestamp: number = null
      for (const id in gameData?.packet ?? {}) {
        const packet = gameData.packet[id] as GameStatePacket
        if (packet == null) {
          continue
        }

        if (packet.args?.betting === 'BetsClosed') {
          betClosedTimestamp = packet.time
          break
        }
      }

      fakeBet.betOrg = {}
      fakeBet.betFake = {}

      const totalIncOrgChips: { [spot: string]: number } = {}
      const totalIncFakeChips: { [spot: string]: number } = {}

      // 중간까지만 처리되었던 결과들을 전부 삭제한다.
      for (const key in fakeBet.saveBet) {
        const packet = fakeBet.saveBet[key] as SaveBetType
        delete packet.Undo
        delete packet.proceed
        delete packet.incOrgChips
        delete packet.incFakeChips
      }

      for (const key in fakeBet.saveBet) {
        const packet = fakeBet.saveBet[key] as SaveBetType

        if (betClosedTimestamp != null && packet.args.timestamp > betClosedTimestamp) {
          console.log(`skip after closed bet ${username} ${summaryId} ${packet.args.timestamp} > ${betClosedTimestamp}`)
          continue
        }

        const { incOrgChips, incFakeChips } = await processBetAction({
          mongoDB,
          fakeBet,
          user,
          vendor: vendorCode,
          requestPacket: packet,
          setObj,
          betOrg: fakeBet.betOrg,
          betFake: fakeBet.betFake,
          limits: betLimits,
        })

        for (const [spot, value] of Object.entries(incOrgChips)) {
          totalIncOrgChips[spot] = (totalIncOrgChips[spot] ?? 0) + value
        }
        for (const [spot, value] of Object.entries(incFakeChips)) {
          totalIncFakeChips[spot] = (totalIncFakeChips[spot] ?? 0) + value
        }
      }

      console.log(`update bet action ${username} ${summaryId} ${JSON.stringify(totalIncOrgChips)}`)

      //await updateBetAction(mongoDB, fakeBet, totalIncOrgChips, totalIncFakeChips, setObj)

      await mongoDB.fakeBetData.updateOne(
        {
          summaryId: summaryId,
          userId: userId,
          agentCode: agentCode,
        } as Partial<FakeBetData>,
        {
          $set: {
            updatedAt: new Date(),
            calculatedOrg: fakeBet.betOrg,
            calculatedFake: fakeBet.betFake,
          } as Partial<FakeBetData>,
        },
      )
    }

    const isLightning = isLightningTable(tableId)
    const isPeek = isPeekTable(tableId)

    const betAccepted: { [spot: string]: number } = {}

    let betAmount = 0
    for (const spot of Object.keys(fakeBet.betOrg)) {
      const orgChip = fakeBet.betOrg[spot]
      if (orgChip < betLimits?.[spot]?.min) {
        delete fakeBet.betOrg[spot]
        delete fakeBet.betFake[spot]
      } else {
        betAmount += orgChip
        betAccepted[spot] = orgChip
        if (isLightning) {
          const lightningFee = fakeBet.betOrg[spot] * 0.2
          betAccepted[spot + 'Lightning'] = lightningFee
          betAmount += lightningFee
        } else if (isPeek) {
          const peekFee = fakeBet.betOrg[spot] * 0.2
          betAccepted[spot + 'Fee'] = peekFee
          betAmount += peekFee
        }
      }
    }

    if (betAmount <= 0) {
      //위에서 칩이 삭제될 수도 있으니깐 여기서 한번 베팅금액이 있는지 확인한다.
      throw new Error(`invalid betting money ${username}`)
    }

    betRes = await casinoManager.singleBet({
      info: {
        agent,
        user,
        vendor: vendorCode,
        roundId,
        gameId: tableId,
        tableId: tableId,
        betTime: fakeBet.betTime,
        additional: {
          betOrg: fakeBet.betOrg,
          betFake: fakeBet.betFake,
          betAccepted,
          fakeAmountBet: -transaction.amount,
          isFakeVendor: true,
          fakeRoundId: fakeBet.roundId,
          isFakeBet: true,
        },
      },
      transId: transaction.id.toString(),
      betId: transaction.id.toString(),
      incAmount: -betAmount,
      packet: body,
    })
  } else {
    //없으면 일반 베팅
    betRes = await casinoManager.singleBet({
      info: {
        agent,
        user,
        vendor: vendorCode,
        roundId,
        gameId: tableId,
        tableId,
      },
      transId: transaction.id.toString(),
      betId: transaction.id.toString(),
      incAmount: transaction.amount,
      packet: body,
    })
  }

  if (betRes.status === CommonReturnType.AlreadySettle) {
    throw new Error(`already settle bet ${username}`)
  }

  if (betRes.status !== CommonReturnType.Success) {
    throw new Error(`betting error ${username} ${betRes.status}`)
  }

  if (useFakeBalance) {
    let updatedFakeBalance = user.fakeBalance + transaction.amount

    // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
    if (updatedFakeBalance < betRes.balance && updatedFakeBalance < 3_000_000) {
      mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: betRes.balance }).catch((err) => console.log(err))
      updatedFakeBalance = betRes.balance
    } else {
      // 베팅이 성공했고 페이크 밸런스가 충분히 크면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
      mainSQL.repos.user
        .increment({ idx: user.idx }, 'fakeBalance', transaction.amount)
        .catch((err) => console.log(err))
    }

    betRes.amount = updatedFakeBalance

    return betRes
  } else {
    return betRes
  }
}

async function settle(body: ChangeBalanceRequest): Promise<StatusResult> {
  const { transaction } = body
  const { username } = transaction.target
  const { id, round } = transaction.details.game

  const rounds = round.split('-')

  const roundId = rounds[0] ?? ''
  const tableId = id ?? ''

  const summaryId = vendorCode + '-' + tableId + '-' + roundId

  const { userId, agentCode } = getUserInfo(username)

  const [authInfo, fakeBet] = await Promise.all([
    authManager.checkAuth(username),
    mongoDB.fakeBetData.findOne({
      where: {
        summaryId,
        userId,
        agentCode,
      },
    }),
  ])
  const { user, agent } = authInfo

  if (fakeBet != null) {
    await mongoDB.betDataCasino.updateOne(
      {
        summaryId,
        agentCode,
        userId,
        vendor: vendorCode,
      },
      {
        $set: {
          fakeAmountWin: transaction.amount,
        } as Partial<BetData>,
      },
    )
  } else {
    //betOrg가 없을때만 일반적인 마감처리를 하고 페이크 베팅은 따로 fake-resolver 서버에 맞긴다.
    const res = await casinoManager.betSettlement({
      info: {
        agent,
        user,
        vendor: vendorCode,
        roundId,
        gameId: tableId,
        tableId,
      },
      transId: transaction.id.toString(),
      betId: transaction.referer_id.toString(),
      incAmount: transaction.amount,
      packet: body,
    })
    if (res.status !== CommonReturnType.Success) {
      throw new Error(`settle error ${username} ${res.status}`)
    }
  }

  if (useFakeBalance) {
    // 마감이 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
    mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', transaction.amount).catch((err) => console.log(err))
  }

  return {
    status: CommonReturnType.Success,
  }
}

async function cancelBet(body: ChangeBalanceRequest) {
  const { transaction } = body
  const { username } = transaction.target
  const { id, round } = transaction.details.game

  const rounds = round.split('-')

  const roundId = rounds[0] ?? ''
  const tableId = id ?? ''

  const summaryId = vendorCode + '-' + tableId + '-' + roundId

  const { userId, agentCode } = getUserInfo(username)

  const [authInfo, betData] = await Promise.all([
    authManager.checkAuth(username),
    mongoDB.betDataCasino.findOne({
      where: {
        summaryId,
        agentCode,
        userId,
        vendor: vendorCode,
      },
    }),
  ])
  const { user, agent } = authInfo

  if (betData?.isFakeBet) {
    return {
      status: CommonReturnType.Success,
    }
  }

  await casinoManager.betCancel({
    info: {
      agent,
      user,
      vendor: vendorCode,
      roundId,
      gameId: tableId,
      tableId,
    },
    transId: transaction.id.toString(),
    orgTransId: transaction.referer_id.toString(),
    betId: transaction.referer_id.toString(),
    packet: body,
  })

  if (useFakeBalance) {
    // 마감이 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
    mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', transaction.amount).catch((err) => console.log(err))
  }

  return {
    status: CommonReturnType.Success,
  }
}
