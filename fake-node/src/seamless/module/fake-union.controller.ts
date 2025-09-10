import { FastifyInstance } from 'fastify'

import { getUserInfo } from '../../common/util'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { authManager, casinoManager, mainSQL, mongoDB } from '../app'
import {
  AuthRequest,
  BalanceRequest,
  ReturnCodes,
  TransferRequest,
  convertReturnCode,
} from '@service/src/vendor/union-game/interface'

import { TransactionResult } from '@service/src/lib/common/game/save-transaction'
import { BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { decimalFloor } from './util'
import { unionFakeBet, unionToken, vendorCode } from './fake-union.service'

export function registerFakeUnionController(fastify: FastifyInstance) {
  fastify.get('/uniongame', async (req, reply) => {
    return {
      hello: 'uniongame',
    }
  })

  fastify.post('/uniongame/auth', async (req, reply) => {
    const body = req.body as AuthRequest

    console.log('uniongame auth', JSON.stringify(req.body), req.ip)

    const { siteUsername: username } = body.params

    const { agentCode, userId } = getUserInfo(username)

    if (body.apiKey !== unionToken) {
      return {
        code: ReturnCodes.InvalidParameter,
        msg: 'InvalidParameter',
      }
    }
    const balanceRes = await authManager.balance(agentCode, userId)

    if (balanceRes.status !== CommonReturnType.Success) {
      // 크롤링 아이디를 위해서 아이디가 없어도 balance를 0으로 리턴해 준다.
      return {
        code: ReturnCodes.Success,
        data: {
          username: username,
          siteUsername: username,
          groupKey: agentCode,
        },
      }
      /*return {
        code: ReturnCodes.UserNotFound,
        msg: 'UserNotFound',
      }*/
    }

    console.log(`uniongame_authenticate_success ${username} : ${balanceRes.balance}`)
    const { user } = balanceRes

    if (user.fakeMode) {
      // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
      let balance = user.fakeBalance
      if (user.fakeBalance < balanceRes.balance && user.fakeBalance < 3_000_000) {
        console.log(`uniongame_balance_update ${username} ${balance} ${balanceRes.balance}`)
        await mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: balanceRes.balance })
        balance = balanceRes.balance
      }

      console.log(`uniongame_authenticate_result ${username} ${balance}`)

      return {
        code: ReturnCodes.Success,
        data: {
          username: username,
          siteUsername: username,
          groupKey: agentCode,
        },
      }
    }

    return {
      code: ReturnCodes.Success,
      data: {
        username: username,
        siteUsername: username,
        groupKey: agentCode,
      },
    }
  })
  fastify.post('/uniongame/balance', async (req, reply) => {
    const body = req.body as BalanceRequest

    const { siteUsername: username } = body.params

    const { agentCode, userId } = getUserInfo(username)

    if (body.apiKey !== unionToken) {
      return {
        code: ReturnCodes.InvalidParameter,
        msg: 'InvalidParameter',
      }
    }

    const balanceRes = await authManager.balance(agentCode, userId)

    if (balanceRes.status !== CommonReturnType.Success) {
      // 크롤링 아이디를 위해서 아이디가 없어도 balance를 0으로 리턴해 준다.

      return {
        code: ReturnCodes.Success,
        data: {
          balance: 0,
          currency: 'KRW',
        },
      }
      /*return {
        code: ReturnCodes.UserNotFound,
        msg: 'UserNotFound',
      }*/
    }

    console.log(`uniongame_balance_res ${username} ${balanceRes.status} ${balanceRes.balance}`)
    const { user } = balanceRes

    if (user.fakeMode) {
      // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
      let balance = user.fakeBalance
      if (user.fakeBalance < balanceRes.balance && user.fakeBalance < 3_000_000) {
        console.log(`uniongame_balance_update ${username} ${balance} ${balanceRes.balance}`)
        await mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: balanceRes.balance })
        balance = balanceRes.balance
      }

      console.log(`uniongame_fake_balance_success ${username} ${balance}`)

      return {
        code: ReturnCodes.Success,
        data: {
          balance: balance,
          currency: 'KRW',
        },
      }
    }
    return {
      code: ReturnCodes.Success,
      data: {
        balance: balanceRes.balance,
        currency: 'KRW',
      },
    }
  })

  fastify.post('/uniongame/bet', async (req, reply) => {
    return unionFakeBet(req, req.body as TransferRequest)
  })

  fastify.post('/uniongame/settle', async (req, reply) => {
    const body = req.body as TransferRequest

    if (body.apiKey !== unionToken) {
      return {
        code: ReturnCodes.InvalidParameter,
        msg: 'InvalidParameter',
      }
    }

    const {
      siteUsername: username,
      gameKey: tableId,
      siteGameId,
      key,
      parentTransactionKey,
      transactionKey: trans_id,
      amount,
    } = body.params

    const round_id = (siteGameId != null ? siteGameId : key).split('-')[0]

    const summaryId = vendorCode + '-' + tableId + '-' + round_id

    //console.log(`uniongame_result_start ${username} ${tableId} ${summaryId}`)
    console.log('uniongame_result_start', username, tableId, summaryId, req.ip)

    const { userId, agentCode } = getUserInfo(username)

    const authInfo = await authManager.checkAuth(username)

    if (authInfo.status !== CommonReturnType.Success) {
      return {
        code: ReturnCodes.UserNotFound,
        msg: 'UserNotFound',
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
          transId: trans_id,
          betId: parentTransactionKey,
          incAmount: amountWin,
          allowAdditionalSettle: true,
          packet: body,
        })
      }

      console.log(`uniongame_fake_result_res : ${res.status}`)

      const updatedFakeBalance = user.fakeBalance + amountWin

      res.balance = updatedFakeBalance
      res.beforeBalance = user.fakeBalance

      if (res.status === CommonReturnType.Success) {
        // 마감이 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
        mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountWin).catch((err) => console.log(err))
      } else if (res.status === CommonReturnType.TransactionExists || res.status === CommonReturnType.AlreadySettle) {
        res.status = CommonReturnType.Success
      }

      console.log(`uniongame_fake_result_success ${username} : ${res.balance}`)
      return {
        code: convertReturnCode(res.status),
        data: {
          balance: decimalFloor(res.balance, 2),
          beforeBalance: res.beforeBalance,
          currency: 'KRW',
        },
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
      transId: trans_id,
      betId: parentTransactionKey,
      incAmount: amountWin,
      allowAdditionalSettle: true,
      packet: body,
    })

    console.log(`uniongame_result_res : ${res.status}`)

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

    console.log(`uniongame_result_success ${username} : ${res.balance}`)
    return {
      code: convertReturnCode(res.status),
      data: {
        balance: decimalFloor(res.balance, 2),
        beforeBalance: res.beforeBalance,
        currency: 'KRW',
      },
    }
  })

  fastify.post('/uniongame/refund', async (req, reply) => {
    const body = req.body as TransferRequest

    if (body.apiKey !== unionToken) {
      return {
        code: ReturnCodes.InvalidParameter,
        msg: 'InvalidParameter',
      }
    }

    const {
      siteUsername: username,
      gameKey: tableId,
      siteGameId,
      key,
      transactionKey: trans_id,
      parentTransactionKey,
      amount,
    } = body.params

    const round_id = (siteGameId != null ? siteGameId : key).split('-')[0]

    const summaryId = vendorCode + '-' + tableId + '-' + round_id

    console.log(`uniongame_refund_start ${username} ${tableId} ${summaryId}`)

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
        code: ReturnCodes.UserNotFound,
        msg: 'UserNotFound',
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
        transId: trans_id,
        orgTransId: parentTransactionKey,
        incAmount: amountCancel,
        packet: body,
      })
    }

    console.log(`uniongame_refund_res ${username} ${res.status}`)

    if (user.fakeMode) {
      const updatedFakeBalance = user.fakeBalance + amountCancel

      res.balance = updatedFakeBalance
      res.beforeBalance = user.fakeBalance

      // 취소가 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
      if (res.status === CommonReturnType.Success) {
        mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountCancel).catch((err) => console.log(err))
      }
    }

    if (
      res.status === CommonReturnType.TransactionExists ||
      res.status === CommonReturnType.TransactionAlreadyRollback
    ) {
      res.status = CommonReturnType.Success
    }

    console.log(`uniongame_refund_success ${username} ${res.balance}`)

    return {
      code: convertReturnCode(res.status),
      data: {
        balance: decimalFloor(res.balance, 2),
        beforeBalance: res.beforeBalance,
        currency: 'KRW',
      },
    }
  })
}
