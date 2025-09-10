import { FastifyInstance } from 'fastify'
import { authManager, casinoManager } from '../app'

import {
  BalanceRequest,
  CancelRequest,
  CheckRequest,
  CreditRequest,
  DebitRequest,
  PromoRequest,
} from '@service/src/vendor/evolution/interface'
import {
  balance,
  check,
  fakeEvolutionCancel,
  fakeEvolutionCredit,
  fakeEvolutionDebit,
  promoPayout,
  sid,
} from './fake-evolution.service'
import { env } from '@service/src/vendor/env'

export function registerFakeEvolutionChoiController(fastify: FastifyInstance) {
  const ENV_AUTH_TOKEN = env.CHOI_EVOLUTION_ENV.AUTH_TOKEN

  fastify.get('/chev', async (req, reply) => {
    return {
      hello: 'chev',
    }
  })

  fastify.post('/chev/sid', async (req, reply) => {
    const body = req.body as CheckRequest
    const { authToken } = req.query as { [key: string]: string }

    console.log(`${this.vendorCode}_sid ${authToken} ${JSON.stringify(body)}`)

    if (authToken !== ENV_AUTH_TOKEN) {
      return {
        status: 'INVALID_TOKEN_ID',
      }
    }

    return sid(body)
  })

  fastify.post('/chev/check', async (req, reply) => {
    const body = req.body as CheckRequest
    console.log('evolution check ' + JSON.stringify(req.body))

    const { authToken } = req.query as { [key: string]: string }
    if (authToken !== ENV_AUTH_TOKEN) {
      return {
        status: 'INVALID_TOKEN_ID',
      }
    }
    return check(authManager, body)
  })

  fastify.post('/chev/balance', async (req, reply) => {
    const body = req.body as BalanceRequest
    console.log('evolution_balance ' + JSON.stringify(req.body))

    const { authToken } = req.query as { [key: string]: string }
    if (authToken !== ENV_AUTH_TOKEN) {
      return {
        status: 'INVALID_TOKEN_ID',
      }
    }

    return balance(authManager, body)
  })

  fastify.post('/chev/debit', async (req, reply) => {
    const { authToken } = req.query as { [key: string]: string }
    if (authToken !== ENV_AUTH_TOKEN) {
      return {
        status: 'INVALID_TOKEN_ID',
      }
    }

    const body = req.body as DebitRequest

    const roundId = body.game.id.split('-')[0]

    return fakeEvolutionDebit(authManager, casinoManager, roundId, body)
  })

  fastify.post('/chev/credit', async (req, reply) => {
    const { authToken } = req.query as { [key: string]: string }
    if (authToken !== ENV_AUTH_TOKEN) {
      return {
        status: 'INVALID_TOKEN_ID',
      }
    }

    const body = req.body as CreditRequest

    const roundId = body.game.id.split('-')[0]

    return fakeEvolutionCredit(authManager, casinoManager, roundId, body)
  })

  fastify.post('/chev/cancel', async (req, reply) => {
    const { authToken } = req.query as { [key: string]: string }
    if (authToken !== ENV_AUTH_TOKEN) {
      return {
        status: 'INVALID_TOKEN_ID',
      }
    }

    const body = req.body as CancelRequest

    const roundId = body.game.id.split('-')[0]

    return fakeEvolutionCancel(authManager, casinoManager, roundId, body)
  })

  fastify.post('/chev/promo_payout', async (req, reply) => {
    const { authToken } = req.query as { [key: string]: string }
    if (authToken !== ENV_AUTH_TOKEN) {
      return {
        status: 'INVALID_TOKEN_ID',
      }
    }

    const body = req.body as PromoRequest

    return promoPayout(authManager, casinoManager, body)
  })
}
