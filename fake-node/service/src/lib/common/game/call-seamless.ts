import axios from 'axios'

import { BetTransactionType } from '../../interface/mongo/data-bet-transaction'

import { BalanceResult } from './auth-manager'

import { CommonReturnType } from '../types/common-return-type'
import { BetDataTransaction } from '../../interface/mongo/data-bet-data'
import { GameType } from '../../common/types/common'

export interface BaseTransaction {
  id: string
  betId?: string
  amount?: number
}

export interface BetNSettleTransaction {
  id: string
  betId?: string
  amount: number
  amountBet: number
  amountWin: number
}

export interface CancelTransaction {
  id: string
  orgId?: string
  betId?: string
  amount?: number
}

export type CallSeamlessTransaction = BaseTransaction | BetNSettleTransaction | CancelTransaction

interface TransactionBody {
  type: BetTransactionType
  vendor: string
  brand?: string
  gameType: GameType
  roundId?: string
  gameId?: string
  username: string
  transactions: CallSeamlessTransaction[]
}

export async function callSeamlessBalance(seamlessUrl: string, username: string): Promise<BalanceResult> {
  console.log('===== callSeamlessBalance START =====')
  console.log('URL:', seamlessUrl)
  console.log('Username:', username)
  console.log('Request body:', { packet: 'BALANCE', username })

  try {
    const seamlessRes = await axios.post(
      seamlessUrl,
      {
        packet: 'BALANCE',
        username,
      },
      {
        timeout: 3000,
      },
    )

    console.log('Seamless API response status:', seamlessRes.status)
    console.log('Seamless API response data:', JSON.stringify(seamlessRes.data))

    let transRes = seamlessRes.data
    if (transRes?.status === null) {
      console.log('⚠️ transRes.status is null, returning SeamlessInternalError')
      transRes = {
        status: CommonReturnType.SeamlessInternalError,
      }
    }

    console.log('Final transRes:', JSON.stringify(transRes))
    return transRes
  } catch (err) {
    console.log('❌ callSeamlessBalance ERROR')
    console.log('Error code:', err?.code)
    console.log('Error message:', err?.message)
    console.log('Error response status:', err?.response?.status)
    console.log('Error response data:', JSON.stringify(err?.response?.data))

    if (err?.code === 'ECONNABORTED') {
      console.log('Returning SeamlessNoResponse (timeout)')
      return {
        status: CommonReturnType.SeamlessNoResponse,
      }
    }

    console.log('Returning SeamlessInternalError')
    return {
      status: CommonReturnType.SeamlessInternalError,
    }
  }
}

interface CallSeamlessOptions {
  seamlessUrl: string
  agentId: string
  body: TransactionBody
}

interface CallSeamlessResult {
  status: CommonReturnType
  beforeBalance?: number
  balance?: number
  amount?: number
}

export async function callSeamless({ seamlessUrl, agentId, body }: CallSeamlessOptions): Promise<CallSeamlessResult> {
  for (let i = 0; i < 3; i++) {
    let returnObj
    let resData
    let resStatus
    let errCode
    const requestTime = new Date()
    try {
      const seamlessRes = await axios.post(
        seamlessUrl,
        { ...body },
        {
          timeout: 1000,
        },
      )

      resData = seamlessRes.data
      resStatus = seamlessRes.status
      returnObj =
        resData?.status != null
          ? resData
          : {
              status: CommonReturnType.SeamlessInternalError,
            }
    } catch (err) {
      resData = err?.response?.data
      resStatus = err?.response?.status
      errCode = err?.code
      if (err?.code === 'ECONNABORTED' || err?.code === 'ENOTFOUND') {
        returnObj = {
          status: CommonReturnType.SeamlessNoResponse,
        }
      } else {
        returnObj = {
          status: CommonReturnType.SeamlessInternalError,
        }
      }
    }

    const responseMs = new Date().getTime() - requestTime.getTime()
    console.log(
      `callSeamless ${JSON.stringify({
        agentId,
        retry: i,
        url: seamlessUrl,
        req: body,
        res: resData,
        statusCode: resStatus,
        requestTime,
        responseMs,
        errCode,
      })}`,
    )
    if (resStatus !== 200 && resStatus !== 201) {
      continue
    }

    return returnObj
  }
  return {
    status: CommonReturnType.SeamlessNoResponse,
  }
}

export function makePacketTransaction(betTransactionType: BetTransactionType, transactions: BetDataTransaction[]) {
  if (betTransactionType === 'BETNSETTLE') {
    return transactions.map((value) => ({
      id: value.id,
      amount: value.amount,
      ...(value.orgId != null && { orgId: value.orgId }),
      ...(value.betId != null && { orgId: value.betId }),
      amountBet: value.incFields?.amountBet,
      amountWin: value.incFields?.amountWin,
    }))
  } else {
    return transactions.map((value) => ({
      id: value.id,
      amount: value.amount,
      ...(value.orgId != null && { orgId: value.orgId }),
      ...(value.betId != null && { orgId: value.betId }),
    }))
  }
}
