import { FastifyRequest } from 'fastify'

import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { authManager, mongoDB, mainSQL, casinoManager } from '../app'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'

import { env } from '@service/src/vendor/env'

import { decimalFloor } from './util'
import { fakeBet } from './fake.service'

import { getUserInfo } from '../../common/util'

import { TransactionResult } from '@service/src/lib/common/game/save-transaction'
import { BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { ChangeBalanceRequest, convertReturnCode, SeamlessMessageCode, SeamlessResponse } from './fake-skyhub.types'
import { skyhubTables } from './fake-skyhub.tables'

export const vendorCode = VendorCode.FakeUnionGame_Cool_Evolution

export const unionToken = env.UNIONGAME_COOL_ENV.API_TOKEN

export async function skyhubFakeBet(req: FastifyRequest, body: ChangeBalanceRequest): Promise<SeamlessResponse> {
  const {
    username,
    messageid,
    game_id,
    gameid,
    extra_info: { gameKey },
    transaction_id,
    amount,
  } = body

  const tableId = gameKey ?? skyhubTables[game_id]

  if (tableId == null) {
    console.log(`skyhub_bet_invalid_table ${username} ${game_id} ${gameKey}`)
    return {
      result: 1,
      message: SeamlessMessageCode.InternalServerError,
      messageid,
    }
  }

  const round_id = gameid.split('-')[0]

  const summaryId = vendorCode + '-' + tableId + '-' + round_id

  console.log('uniongame_bet_start', username, tableId, summaryId, req.ip)

  const authInfo = await authManager.checkAuth(username)

  if (authInfo.status !== CommonReturnType.Success) {
    return {
      result: 1,
      message: SeamlessMessageCode.UserNotFound,
      messageid,
    }
  }

  const { user, agent } = authInfo

  const amountFakeBet = -Number(amount)

  //베팅입니다.
  const betRes = await fakeBet({
    mongoDB,
    casinoManager,
    authManager,
    agent,
    user,
    vendor: vendorCode,
    gameId: tableId,
    vendorRoundId: round_id,
    transId: transaction_id,
    betId: transaction_id,
    amountFakeBet,
    equalRoundId: true,
    packet: body,
  })

  console.log(JSON.stringify(betRes))

  if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionExists) {
    return {
      result: 1,
      message: SeamlessMessageCode.InternalServerError,
      messageid,
    }
  }

  return {
    result: 0,
    balance: betRes.balance,
    message: SeamlessMessageCode.Success,
    messageid,
  }
}

export async function skyhubFakeSettle(req: FastifyRequest, body: ChangeBalanceRequest): Promise<SeamlessResponse> {
  const {
    username,
    messageid,
    game_id,
    gameid,
    extra_info: { gameKey },
    transaction_id,
    amount,
  } = body

  const tableId = gameKey ?? skyhubTables[game_id]

  const round_id = gameid.split('-')[0]

  const summaryId = vendorCode + '-' + tableId + '-' + round_id

  //console.log(`skyhub_result_start ${username} ${tableId} ${summaryId}`)
  console.log('skyhub_result_start', username, tableId, summaryId, req.ip)

  const { userId, agentCode } = getUserInfo(username)

  const authInfo = await authManager.checkAuth(username)

  if (authInfo.status !== CommonReturnType.Success) {
    return {
      result: 1,
      message: SeamlessMessageCode.UserNotFound,
      messageid,
    }
  }

  const { user, agent } = authInfo
  const amountWin = Number(amount)

  if (user.fakeMode) {
    const fakeBet = await mongoDB.fakeBetData.findOne({
      where: {
        summaryId,
        userId,
        agentCode,
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
          roundId: round_id,
          tableId,
        },
        transId: 'S' + transaction_id,
        betId: transaction_id,
        incAmount: amountWin,
        allowAdditionalSettle: true,
        packet: body,
      })
    }

    console.log(`skyhub_fake_result_res : ${res.status}`)

    const updatedFakeBalance = user.fakeBalance + amountWin

    res.balance = updatedFakeBalance
    res.beforeBalance = user.fakeBalance

    if (res.status === CommonReturnType.Success) {
      // 마감이 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
      mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountWin).catch((err) => console.log(err))
    } else if (res.status === CommonReturnType.TransactionExists || res.status === CommonReturnType.AlreadySettle) {
      res.status = CommonReturnType.Success
    }

    console.log(`skyhub_fake_result_success ${username} : ${res.balance}`)
    return {
      result: res.status === CommonReturnType.Success ? 0 : 1,
      balance: res.balance,
      message: convertReturnCode(SeamlessMessageCode.Success),
      messageid,
    }
  }

  const res = await casinoManager.betSettlement({
    info: {
      agent,
      user,
      vendor: vendorCode,
      gameId: tableId,
      roundId: round_id,
      tableId,
    },
    transId: 'S' + transaction_id,
    betId: transaction_id,
    incAmount: amountWin,
    allowAdditionalSettle: true,
    packet: body,
  })

  console.log(`skyhub_result_res : ${res.status}`)

  if (res.status === CommonReturnType.TransactionExists || res.status === CommonReturnType.AlreadySettle) {
    res.status = CommonReturnType.Success
  }

  if (res.balance == null) {
    const { agentCode, userId } = user
    const balanceRes = await authManager.balance(agentCode, userId)
    res.balance = balanceRes.balance
    if (res.status === CommonReturnType.Success) {
      res.beforeBalance = balanceRes.balance - amountWin
    }
  }

  console.log(`skyhub_result_success ${username} : ${res.balance}`)
  return {
    result: res.status === CommonReturnType.Success ? 0 : 1,
    balance: res.balance,
    message: convertReturnCode(SeamlessMessageCode.Success),
    messageid,
  }
}

export async function skyhubFakeRefund(req: FastifyRequest, body: ChangeBalanceRequest): Promise<SeamlessResponse> {
  const {
    username,
    messageid,
    game_id,
    gameid,
    extra_info: { gameKey },
    transaction_id,
    amount,
  } = body

  const tableId = gameKey ?? skyhubTables[game_id]

  const round_id = gameid.split('-')[0]

  const summaryId = vendorCode + '-' + tableId + '-' + round_id

  console.log(`skyhub_refund_start ${username} ${tableId} ${summaryId}`)

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

  if (authInfo.status !== CommonReturnType.Success) {
    return {
      result: 1,
      message: SeamlessMessageCode.InternalServerError,
      messageid,
    }
  }

  const { user, agent } = authInfo

  const amountCancel = Number(amount)

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
        roundId: round_id,
        tableId: tableId,
      },
      transId: 'C' + transaction_id,
      orgTransId: transaction_id,
      incAmount: amountCancel,
      packet: body,
    })
  }

  console.log(`skyhub_refund_res ${username} ${res.status}`)

  if (user.fakeMode) {
    const updatedFakeBalance = user.fakeBalance + amountCancel

    res.balance = updatedFakeBalance
    res.beforeBalance = user.fakeBalance

    // 취소가 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
    if (res.status === CommonReturnType.Success) {
      mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountCancel).catch((err) => console.log(err))
    }
  }

  if (res.status === CommonReturnType.TransactionExists || res.status === CommonReturnType.TransactionAlreadyRollback) {
    res.status = CommonReturnType.Success
  }

  console.log(`skyhub_refund_success ${username} ${res.balance}`)

  return {
    result: 0,
    balance: res.balance,
    message: SeamlessMessageCode.Success,
    messageid,
  }
}
