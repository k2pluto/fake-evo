import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { authManager, mongoDB, casinoManager } from '../app'
import { ReturnCodes, TransferRequest, convertReturnCode } from '@service/src/vendor/union-game/interface'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'

import { env } from '@service/src/vendor/env'

import { decimalFloor } from './util'
import { fakeBet } from './fake.service'
import { FastifyRequest } from 'fastify'

export const vendorCode = VendorCode.FakeUnionGame_Cool_Evolution

export const unionToken = env.UNIONGAME_COOL_ENV.API_TOKEN

export async function unionFakeBet(req: FastifyRequest, body: TransferRequest) {
  if (body.apiKey !== unionToken) {
    return {
      code: ReturnCodes.InvalidParameter,
      msg: 'InvalidParameter',
    }
  }

  const { siteUsername: username, gameKey: tableId, siteGameId, key, transactionKey: trans_id, amount } = body.params

  const round_id = (siteGameId != null ? siteGameId : key).split('-')[0]

  const summaryId = vendorCode + '-' + tableId + '-' + round_id

  console.log('uniongame_bet_start', username, tableId, summaryId, req.ip)

  const authInfo = await authManager.checkAuth(username)

  if (authInfo.status !== CommonReturnType.Success) {
    return {
      code: ReturnCodes.UserNotFound,
      msg: 'UserNotFound',
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
    transId: trans_id,
    betId: trans_id,
    amountFakeBet,
    equalRoundId: true,
    packet: body,
  })

  console.log(JSON.stringify(betRes))

  if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionExists) {
    return {
      code: convertReturnCode(betRes.status),
    }
  }

  return {
    code: ReturnCodes.Success,
    data: {
      balance: decimalFloor(betRes.balance, 2),
      beforeBalance: betRes.beforeBalance,
      currency: 'KRW',
    },
  }
}
