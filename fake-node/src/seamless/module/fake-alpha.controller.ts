import { FastifyInstance } from 'fastify'

import { getUserInfo } from '../../common/util'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { authManager, casinoManager, mainSQL, mongoDB } from '../app'
import { ReturnCodes } from '@service/src/vendor/cx/interface'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'

import { GameStatePacket } from '../../common/fake-packet-types'
import { FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'
import { SaveBetType, processBetAction } from '../../common/bet-action'
import { isLightningTable, isPeekTable } from '../../common/fake-util'
import { TransactionResult } from '@service/src/lib/common/game/save-transaction'
import { BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { ChangeBalanceRequest } from '@service/src/vendor/honorlink/interface'

const vendorCode = VendorCode.FakeAlpha_Cider_Evolution

export function registerFakeAlphaController(fastify: FastifyInstance) {
  fastify.get('/alpha', async (req, reply) => {
    return {
      hello: 'swix',
    }
  })

  fastify.get('/alpha/balance', async (req, reply) => {
    const { username } = req.query as { [key: string]: string }

    if (username == null) {
      return {
        balance: 0,
      }
    }

    const { agentCode, userId } = getUserInfo(username)

    const balanceRes = await authManager.balance(agentCode, userId)

    if (balanceRes.status !== CommonReturnType.Success) {
      // 크롤링 아이디를 위해서 아이디가 없어도 balance를 0으로 리턴해 준다.
      return {
        balance: 0,
      }
    }

    console.log(`alpha_balance_res ${username} ${balanceRes.status} ${balanceRes.balance}`)
    const { user } = balanceRes

    if (user.fakeMode) {
      // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
      let balance = user.fakeBalance
      if (user.fakeBalance < balanceRes.balance && user.fakeBalance < 3_000_000) {
        console.log(`fh_balance_update ${username} ${balance} ${balanceRes.balance}`)
        await mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: balanceRes.balance })
        balance = balanceRes.balance
      }

      console.log(`alpha_fake_balance_success ${username} ${balance}`)

      return {
        balance,
      }
    }
    return {
      balance: balanceRes.balance,
    }
  })

  fastify.post('/alpha/changeBalance', async (req, reply) => {
    const body: any = req.body

    return changeBalance(body)
  })
}

export interface FakeHonorResult {
  status?: CommonReturnType
  beforeBalance?: number
  balance?: number
  amount?: number
}

export async function changeBalance(body: any): Promise<FakeHonorResult> {
  const { type } = body?.transaction
  console.log(`alpha_changeBalance ${type} ` + JSON.stringify(body))

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

  const betId = transaction.referer_id.toString()

  const summaryId = vendorCode + '-' + tableId + '-' + roundId

  const authInfo = await authManager.checkAuth(username)

  const { user, agent } = authInfo

  const { userId, agentCode } = getUserInfo(username)

  const amountFakeBet = Number(transaction.amount)

  const trans_id = transaction.id.toString()

  console.log(`alpha_bet_1 ${agentCode + userId} ${summaryId} ${trans_id} ${user.fakeMode}`)

  if (user.fakeMode) {
    let betRes: TransactionResult

    const fakeBet = await mongoDB.fakeBetData.findOne({
      where: {
        vendor: vendorCode,
        userId,
        agentCode,
        tableId,
        roundId,
      },
    })

    if (fakeBet != null) {
      console.log(`alpha_fake_bet_2 ${username} ${JSON.stringify(fakeBet)}`)

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

      let fakeBetSetObj = {}

      if (fakeBet.betOrg == null || unproceedPacket) {
        const setObj: Partial<FakeBetData> = {}

        console.log(`create betOrg ${username} ${summaryId}`)

        const gameData = await mongoDB.fakeGameData.findOne({
          where: {
            gameId: fakeBet.roundId,
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
            console.log(
              `skip after closed bet ${username} ${summaryId} ${packet.args.timestamp} > ${betClosedTimestamp}`,
            )
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
        fakeBetSetObj = {
          calculatedOrg: fakeBet.betOrg,
          calculatedFake: fakeBet.betFake,
        }
      }

      mongoDB.fakeBetData
        .updateOne(
          {
            _id: fakeBet._id,
          } as Partial<FakeBetData>,
          {
            $set: {
              updatedAt: new Date(),
              summaryId,
              ...fakeBetSetObj,
            } as Partial<FakeBetData>,
          },
        )
        .catch((err) => console.log(err))

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
        return {
          result: ReturnCodes.InternalServerError,
        }
      }

      console.log('fc_fake_bet_3')

      betRes = await casinoManager.singleBet({
        info: {
          agent,
          user,
          vendor: vendorCode,
          gameId: tableId,
          roundId: roundId,
          tableId: tableId,
          betTime: fakeBet.betTime,
          additional: {
            betOrg: fakeBet.betOrg,
            betFake: fakeBet.betFake,
            betAccepted,
            fakeAmountBet: -amountFakeBet,
            isFakeVendor: true,
            fakeRoundId: fakeBet.roundId,
            isFakeBet: true,
          },
        },
        transId: trans_id,
        betId: betId,
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
          gameId: tableId,
          roundId: roundId,
          tableId,
          additional: {
            isFakeVendor: true,
          },
        },
        transId: trans_id,
        betId: betId,
        incAmount: amountFakeBet,
        packet: body,
      })
    }

    console.log(`alpha_fake_bet_res : ${betRes.status}`)

    if (betRes.status === CommonReturnType.TransactionExists) {
      betRes.status = CommonReturnType.Success
    }

    if (betRes.status !== CommonReturnType.Success) {
      throw new Error(`betting error ${username} ${betRes.status}`)
    }

    console.log(`alpha_fake_bet_success ${username} : ${betRes.balance}`)

    if (betRes.balance == null) {
      const { agentCode, userId } = user
      const balanceRes = await authManager.balance(agentCode, userId)
      betRes.balance = balanceRes.balance
    }

    let updatedFakeBalance = user.fakeBalance + amountFakeBet

    // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
    if (updatedFakeBalance < betRes.balance && updatedFakeBalance < 3_000_000) {
      mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: betRes.balance }).catch((err) => console.log(err))
      updatedFakeBalance = betRes.balance
    } else {
      // 베팅이 성공했고 페이크 밸런스가 충분히 크면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
      mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountFakeBet).catch((err) => console.log(err))
    }

    betRes.balance = updatedFakeBalance

    return {
      balance: betRes.balance,
    }
  }

  const res = await casinoManager.singleBet({
    info: {
      agent,
      user,
      vendor: vendorCode,
      gameId: tableId,
      roundId: roundId,
      tableId,
      additional: {
        isFakeVendor: true,
      },
    },
    transId: trans_id,
    betId: betId,
    incAmount: amountFakeBet,
    packet: body,
  })

  console.log(`alpha_bet_res : ${JSON.stringify(res)}`)

  if (res.status === CommonReturnType.TransactionExists) {
    res.status = CommonReturnType.Success
  }
  if (res.status !== CommonReturnType.Success) {
    throw new Error(`betting error ${username}`)
  }

  if (res.balance == null) {
    const { agentCode, userId } = user
    const balanceRes = await authManager.balance(agentCode, userId)
    res.balance = balanceRes.balance
  }

  console.log(`alpha_bet_success ${username} : ${res.balance}`)

  return {
    balance: res.balance,
  }
}

async function settle(body: ChangeBalanceRequest) {
  const { transaction } = body
  const { username } = transaction.target
  const { id, round } = transaction.details.game

  //throw new InternalServerErrorException(`settle error ${username}`)
  const rounds = round.split('-')

  const roundId = rounds[0] ?? ''
  const tableId = id ?? ''

  const trans_id = transaction.id.toString()

  const summaryId = vendorCode + '-' + tableId + '-' + roundId

  const { userId, agentCode } = getUserInfo(username)
  throw new Error(`settle error ${username}`)

  const authInfo = await authManager.checkAuth(username)
  const { user, agent } = authInfo

  const amountWin = transaction.amount

  if (user.fakeMode) {
    const fakeBet = await mongoDB.fakeBetData.findOne({
      where: {
        vendor: vendorCode,
        userId,
        agentCode,
        tableId,
        roundId,
      },
    })

    let res: TransactionResult

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
            fakeAmountWin: amountWin,
          } as Partial<BetData>,
        },
      )

      res = {
        status: CommonReturnType.Success,
        summaryId,
      }
    } else {
      //betOrg가 없을때만 일반적인 마감처리를 하고 페이크 베팅은 따로 fake-resolver 서버에 맞긴다.
      res = await casinoManager.betSettlement({
        info: {
          agent,
          user,
          vendor: vendorCode,
          gameId: tableId,
          roundId: roundId,
          tableId,
        },
        transId: trans_id,
        betId: transaction.referer_id.toString(),
        incAmount: amountWin,
        allowAdditionalSettle: true,
        packet: body,
      })
    }

    console.log(`fc_fake_result_res : ${res.status}`)

    if (res.status === CommonReturnType.TransactionExists || res.status === CommonReturnType.AlreadySettle) {
      res.status = CommonReturnType.Success
    }

    if (res.status !== CommonReturnType.Success) {
      throw new Error(`settle error ${username} ${res.status}`)
    }

    const updatedFakeBalance = user.fakeBalance + amountWin

    res.balance = updatedFakeBalance

    // 마감이 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
    mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountWin).catch((err) => console.log(err))

    console.log(`fc_fake_result_success ${username} : ${res.balance}`)
    return {
      balance: res.balance,
    }
  }

  const res = await casinoManager.betSettlement({
    info: {
      agent,
      user,
      vendor: vendorCode,
      gameId: tableId,
      roundId: roundId,
      tableId,
    },
    transId: trans_id,
    betId: roundId,
    incAmount: amountWin,
    allowAdditionalSettle: true,
    packet: body,
  })

  console.log(`fc_result_res : ${res.status}`)

  if (res.status === CommonReturnType.TransactionExists || res.status === CommonReturnType.AlreadySettle) {
    res.status = CommonReturnType.Success
  }

  if (res.status !== CommonReturnType.Success) {
    throw new Error(`settle error ${username} ${res.status}`)
  }

  if (res.balance == null) {
    const { agentCode, userId } = user
    const balanceRes = await authManager.balance(agentCode, userId)
    res.balance = balanceRes.balance
  }

  console.log(`fc_result_success ${username} : ${res.balance}`)
  return {
    balance: res.balance,
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

  let res: TransactionResult
  if (betData?.isFakeBet) {
    res = {
      status: CommonReturnType.Success,
      summaryId,
    }
  } else {
    res = await casinoManager.betCancel({
      info: {
        agent,
        user,
        vendor: vendorCode,
        gameId: tableId,
        roundId: roundId,
        tableId: tableId,
      },
      transId: transaction.id.toString(),
      orgTransId: transaction.referer_id.toString(),
      betId: transaction.referer_id.toString(),
      packet: body,
    })
  }

  const amountCancel = transaction.amount

  console.log(`fc_refund_res ${username} ${res.status}`)

  if (res.status === CommonReturnType.TransactionExists || res.status === CommonReturnType.TransactionAlreadyRollback) {
    res.status = CommonReturnType.Success
  }

  if (user.fakeMode) {
    const updatedFakeBalance = user.fakeBalance + amountCancel

    res.balance = updatedFakeBalance

    // 마감이 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
    mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountCancel).catch((err) => console.log(err))
  }

  return {
    balance: res.balance,
  }
}
