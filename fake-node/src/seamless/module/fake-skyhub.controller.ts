import { FastifyInstance } from 'fastify'

import { getUserInfo } from '../../common/util'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { authManager, mainSQL } from '../app'

import { skyhubFakeBet, skyhubFakeRefund, skyhubFakeSettle } from './fake-skyhub.service'
import { BalanceRequest, ChangeBalanceRequest, SeamlessMessageCode } from './fake-skyhub.types'

export function registerFakeSkyHubController(fastify: FastifyInstance) {
  fastify.get('/skyh-pl', async (req, reply) => {
    return {
      hello: 'skyhub',
    }
  })

  fastify.post('/skyh-pl/balance', async (req, reply) => {
    const body = req.body as BalanceRequest

    const { username, messageid } = body

    const { agentCode, userId } = getUserInfo(username)

    const balanceRes = await authManager.balance(agentCode, userId)

    if (balanceRes.status !== CommonReturnType.Success) {
      // 크롤링 아이디를 위해서 아이디가 없어도 balance를 0으로 리턴해 준다.

      return {
        result: 0,
        balance: 0,
        message: SeamlessMessageCode.Success,
        messageid,
      }
    }

    console.log(`skyhub_balance_res ${username} ${balanceRes.status} ${balanceRes.balance}`)
    const { user } = balanceRes

    if (user.fakeMode) {
      // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
      let balance = user.fakeBalance
      if (user.fakeBalance < balanceRes.balance && user.fakeBalance < 3_000_000) {
        console.log(`skyhub_balance_update ${username} ${balance} ${balanceRes.balance}`)
        await mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: balanceRes.balance })
        balance = balanceRes.balance
      }

      console.log(`skyhub_fake_balance_success ${username} ${balance}`)

      return {
        result: 0,
        balance: balance,
        message: SeamlessMessageCode.Success,
        messageid,
      }
    }
    return {
      result: 0,
      balance: balanceRes.balance,
      message: SeamlessMessageCode.Success,
      messageid,
    }
  })

  fastify.post('/skyh-pl/bet', async (req, reply) => {
    return skyhubFakeBet(req, req.body as ChangeBalanceRequest)
  })

  fastify.post('/skyh-pl/prize', async (req, reply) => {
    return skyhubFakeSettle(req, req.body as ChangeBalanceRequest)
  })

  fastify.post('/skyh-pl/cancelbet', async (req, reply) => {
    return skyhubFakeRefund(req, req.body as ChangeBalanceRequest)
  })
}
