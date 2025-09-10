import { getUserInfo } from '../../common/util'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { mainSQL, mongoDB } from '../app'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'

import { v4 } from 'uuid'
import {
  BalanceRequest,
  CheckRequest,
  CheckResponse,
  CreditRequest,
  DebitRequest,
  PromoRequest,
  StandardResponse,
  convertReturnCode,
} from '@service/src/vendor/evolution/interface'
import { TransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { fakeBet, fakeCancel, fakeSettle } from './fake.service'
import { AuthManager } from '@service/src/lib/common/game/auth-manager'

export const vendorCode = VendorCode.FakeChoi_Evolution

export async function sid(body: CheckRequest): Promise<CheckResponse> {
  const { userId: username } = body
  const { agentCode, userId } = getUserInfo(username)

  const sid = v4()

  const res = await mainSQL.repos.user.update({ agentCode, userId: userId }, { gameToken: sid })

  if (res.affected === 0) {
    return {
      status: 'INVALID_PARAMETER',
    }
  }

  return {
    status: 'OK',
    sid,
  }
}

export async function check(authManager: AuthManager, body: CheckRequest): Promise<CheckResponse> {
  const { userId: username } = body
  const { agentCode, userId } = getUserInfo(username)

  const exist = await authManager.checkExist(username, body.sid)
  if (exist === false) {
    return {
      status: 'INVALID_PARAMETER',
    }
  }
  const sid = v4()

  const res = await mainSQL.repos.user.update({ agentCode, userId }, { gameToken: sid })

  console.log(`evolution_check new sid ${username} ${sid} ${JSON.stringify(res)}`)

  if (res.affected === 0) {
    return {
      status: 'INVALID_PARAMETER',
    }
  }

  return {
    status: 'OK',
    sid,
  }
}

export async function balance(authManager: AuthManager, body: BalanceRequest): Promise<StandardResponse> {
  const { userId: username } = body
  const { agentCode, userId } = getUserInfo(username)

  let balanceRes = await authManager.balance(agentCode, userId, body.sid)
  if (balanceRes == null) {
    return {
      status: convertReturnCode(CommonReturnType.InternalServerError),
    }
  }

  if (balanceRes.status === CommonReturnType.InvalidToken) {
    console.log(`evolution_balance_invalid_token ${username} ${body.sid} ${JSON.stringify(balanceRes)}`)
    const betData = await mongoDB.betDataCasino.findOne({
      where: { vendor: vendorCode, userId, agentCode },
      order: {
        betTime: -1,
      },
    })
    if (betData == null && betData.gameToken !== body.sid) {
      return {
        status: convertReturnCode(CommonReturnType.InvalidToken),
      }
    }

    balanceRes = await authManager.balance(agentCode, userId)
  }

  if (balanceRes.status !== CommonReturnType.Success) {
    return {
      status: convertReturnCode(balanceRes.status),
    }
  }
  const { user } = balanceRes
  if (user.fakeMode) {
    // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
    let balance = user.fakeBalance
    if (user.fakeBalance < balanceRes.balance && user.fakeBalance < 3_000_000) {
      console.log(`evolution_balance_update ${username} ${balance} ${balanceRes.balance}`)
      await mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: balanceRes.balance })
      balance = balanceRes.balance
    }

    console.log(`evolution_fake_balance_success ${username} ${balance}`)

    return {
      status: 'OK',
      balance: balance,
    }
  }

  return {
    status: 'OK',
    balance: balanceRes.balance,
  }
}

export async function debit(
  authManager: AuthManager,
  service: TransactionManager,
  roundId: string,
  body: DebitRequest,
): Promise<StandardResponse> {
  const { userId: username, game, transaction, sid } = body
  // CS 이슈 때문에 베팅시에 다중클라에서 베팅하는 걸 허용
  //const { user, agent } = await authManager.checkAuth(username, sid)
  const authRes = await authManager.checkAuth(username, sid)
  const { user, agent } = authRes

  if (authRes == null || authRes.status !== CommonReturnType.Success) {
    console.log('INVALID SID USERNAME:' + username)
    return {
      status: convertReturnCode(authRes.status),
    }
  }

  /*const firstType = game.type.split('-')

  // gameType이 rng-megaball 등 rng- 로 시작되는 건 베팅을 막는다.
  if (firstType[0] === 'rng') {
    console.log('INVALID GAMETYPE RNG USERNAME:' + username)
    return {
      status: 'INVALID_PARAMETER',
    }
  }*/

  const tableId = game.details?.table?.id

  //베팅입니다.
  const betRes = await service.singleBet({
    info: {
      agent,
      user,
      vendor: vendorCode,
      gameId: tableId,
      roundId,
      tableId: tableId,
      additional: {
        gameToken: body.sid,
      },
    },
    transId: transaction.id,
    betId: transaction.refId,
    incAmount: -transaction.amount,
    packet: body,
  })

  console.log(JSON.stringify(betRes))

  if (betRes.status === CommonReturnType.AlreadySettle) {
    return {
      status: 'FINAL_ERROR_ACTION_FAILED',
    }
  }

  if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionExists) {
    return {
      status: convertReturnCode(betRes.status),
    }
  }

  return {
    status: 'OK',
    balance: betRes.balance,
  }
}

export async function fakeEvolutionDebit(
  authManager: AuthManager,
  service: TransactionManager,
  roundId: string,
  body: DebitRequest,
): Promise<StandardResponse> {
  const { userId: username, game, transaction, sid } = body
  // CS 이슈 때문에 베팅시에 다중클라에서 베팅하는 걸 허용
  //const { user, agent } = await authManager.checkAuth(username, sid)
  const authRes = await authManager.checkAuth(username, sid)
  const { user, agent } = authRes

  if (authRes == null || authRes.status !== CommonReturnType.Success) {
    console.log('INVALID SID USERNAME:' + username)
    return {
      status: convertReturnCode(authRes.status),
    }
  }

  /*const firstType = game.type.split('-')

  // gameType이 rng-megaball 등 rng- 로 시작되는 건 베팅을 막는다.
  if (firstType[0] === 'rng') {
    console.log('INVALID GAMETYPE RNG USERNAME:' + username)
    return {
      status: 'INVALID_PARAMETER',
    }
  }*/

  const tableId = game.details?.table?.id

  //베팅입니다.
  const betRes = await fakeBet({
    mongoDB,
    casinoManager: service,
    authManager,
    agent,
    user,
    vendor: vendorCode,
    gameId: tableId,
    vendorRoundId: roundId,
    transId: transaction.id,
    betId: transaction.refId,
    amountFakeBet: -transaction.amount,
    equalRoundId: true,
    packet: body,
  })

  console.log(JSON.stringify(betRes))

  if (betRes.status === CommonReturnType.AlreadySettle) {
    return {
      status: 'FINAL_ERROR_ACTION_FAILED',
    }
  }

  if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionExists) {
    return {
      status: convertReturnCode(betRes.status),
    }
  }

  return {
    status: 'OK',
    balance: betRes.balance,
  }
}

export async function credit(
  authManager: AuthManager,
  service: TransactionManager,
  roundId: string,
  body: DebitRequest,
): Promise<StandardResponse> {
  const { userId: username, game, transaction } = body
  const { user, agent } = await authManager.checkAuth(username)

  if (user == null || agent == null) {
    console.log('INVALID USERNAME:' + username)
    return {
      status: 'INVALID_PARAMETER',
    }
  }

  const tableId = game.details?.table?.id

  //마감입니다.
  const betRes = await service.betSettlement({
    info: {
      agent,
      user,
      vendor: vendorCode,
      gameId: tableId,
      roundId,
      tableId: tableId,
      additional: {
        gameToken: body.sid,
      },
    },
    transId: transaction.id,
    betId: transaction.refId,
    incAmount: transaction.amount,
    packet: body,
  })
  if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionExists) {
    return {
      status: convertReturnCode(betRes.status),
    }
  }

  return {
    status: 'OK',
    balance: betRes.balance,
  }
}

export async function fakeEvolutionCredit(
  authManager: AuthManager,
  service: TransactionManager,
  roundId: string,
  body: CreditRequest,
): Promise<StandardResponse> {
  const { userId: username, game, transaction } = body
  const { user, agent } = await authManager.checkAuth(username)

  if (user == null || agent == null) {
    console.log('INVALID USERNAME:' + username)
    return {
      status: 'INVALID_PARAMETER',
    }
  }

  const tableId = game.details?.table?.id

  //마감입니다.
  const betRes = await fakeSettle({
    mongoDB,
    casinoManager: service,
    authManager,
    agent,
    user,
    vendor: vendorCode,
    gameId: tableId,
    vendorRoundId: roundId,
    transId: transaction.id,
    betId: transaction.refId,
    amountFakeWin: transaction.amount,
    packet: body,
  })
  if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionExists) {
    return {
      status: convertReturnCode(betRes.status),
    }
  }

  return {
    status: 'OK',
    balance: betRes.balance,
  }
}

export async function cancel(
  authManager: AuthManager,
  service: TransactionManager,
  roundId: string,
  body: CreditRequest,
): Promise<StandardResponse> {
  const { userId: username, game, transaction } = body
  const { user, agent } = await authManager.checkAuth(username)

  if (user == null || agent == null) {
    console.log('INVALID USERNAME:' + username)
    return {
      status: 'INVALID_PARAMETER',
    }
  }

  const { agentCode, userId } = user

  const betTrans = await service.getBetTransactionCol().findOne({
    where: {
      agentCode: agentCode,
      userId: userId,
      betId: transaction.refId,
      $or: [{ type: 'SETTLE' }, { type: 'CANCELBET' }],
    },
  })

  if (betTrans != null) {
    return {
      status: 'BET_ALREADY_SETTLED',
    }
  }

  const tableId = game.details?.table?.id

  //취소입니다.
  const betRes = await service.betCancel({
    info: {
      agent,
      user,
      vendor: vendorCode,
      gameId: tableId,
      roundId,
      tableId: tableId,
    },
    transId: 'c' + transaction.id,
    orgTransId: transaction.id,
    betId: transaction.refId,
    packet: body,
  })
  if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionExists) {
    return {
      status: convertReturnCode(betRes.status),
    }
  }

  return {
    status: 'OK',
    balance: betRes.balance,
  }
}

export async function fakeEvolutionCancel(
  authManager: AuthManager,
  service: TransactionManager,
  roundId: string,
  body: CreditRequest,
): Promise<StandardResponse> {
  const { userId: username, game, transaction } = body
  const { user, agent } = await authManager.checkAuth(username)

  if (user == null || agent == null) {
    console.log('INVALID USERNAME:' + username)
    return {
      status: 'INVALID_PARAMETER',
    }
  }

  const { agentCode, userId } = user

  const betTrans = await service.getBetTransactionCol().findOne({
    where: {
      agentCode: agentCode,
      userId: userId,
      betId: transaction.refId,
      $or: [{ type: 'SETTLE' }, { type: 'CANCELBET' }],
    },
  })

  if (betTrans != null) {
    return {
      status: 'BET_ALREADY_SETTLED',
    }
  }

  const tableId = game.details?.table?.id

  //취소입니다.
  const betRes = await fakeCancel({
    casinoManager: service,
    mongoDB,
    agent,
    user,
    vendor: vendorCode,
    gameId: tableId,
    vendorRoundId: roundId,
    transId: 'c' + transaction.id,
    orgTransId: transaction.id,
    amountFakeCancel: transaction.amount,
    packet: body,
  })
  if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionExists) {
    return {
      status: convertReturnCode(betRes.status),
    }
  }

  return {
    status: 'OK',
    balance: betRes.balance,
  }
}

export async function promoPayout(
  authManager: AuthManager,
  service: TransactionManager,
  body: PromoRequest,
): Promise<StandardResponse> {
  const { userId: username, promoTransaction, sid } = body
  const { user, agent } = await authManager.checkAuth(username, sid)

  if (user == null || agent == null) {
    return {
      status: 'INVALID_PARAMETER',
    }
  }

  //베팅입니다.
  const betRes = await service.give({
    info: {
      agent,
      user,
      vendor: vendorCode,
      roundId: promoTransaction.id,
      gameId: 'promotion',
    },
    incAmount: promoTransaction.amount,
    transactions: [
      {
        id: promoTransaction.id,
        amount: Number(promoTransaction.amount),
      },
    ],
    packet: body,
    betTransactionType: promoTransaction.type === 'JackpotWin' ? 'JACKPOT' : 'BONUS',
  })
  if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionExists) {
    return {
      status: convertReturnCode(betRes.status),
    }
  }

  return {
    status: 'OK',
    balance: betRes.balance,
  }
}
