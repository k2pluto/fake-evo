import { APIResult, JoinOptions, JoinResult, Vendor, LegacyHistoryOptions, APIEnv, HistoryOptions } from '..'

import { User } from '../../lib/interface/sql/user'
import axios from 'axios'
import { BetDataCasino } from '../../lib/interface/mongo/data-bet-data-casino'
import { makeErrorObj, querystring } from '../util'
import { errorToString } from '../../lib/utility/util'
import { addMinutes } from 'date-fns'
import { BetData } from '../../lib/interface/mongo/data-bet-data'
import { HistoryItem } from './interface'
import { JTDDataType, SomeJTDSchemaType } from 'ajv/dist/core'
import { formatInTimeZone } from 'date-fns-tz'
import { Sleep } from '@service/src/lib/utility/helper'

export interface SkyHubEnv extends APIEnv {
  API_URL: string
  API_TOKEN: string
}

export const HonorLinkConfigSchema = {
  optionalProperties: {
    skin: { type: 'string', enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  },
} satisfies SomeJTDSchemaType

type HonorLinkParam = JTDDataType<typeof HonorLinkConfigSchema>

export interface VendorApiResult<T = unknown> {
  url?: string
  headers?: Record<string, string>
  body?: unknown
  res?: {
    statusCode: number | undefined
    vendorStatus?: string
    data?: T
  }
  error?: string
}

export function formatAsiaSeoul(date: Date) {
  return formatInTimeZone(date, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')
}

export async function callApi<T>(env: SkyHubEnv, path: string, body: any) {
  const apiRes: VendorApiResult<T> = {}
  try {
    apiRes.url = env.API_URL + path + '?' + querystring(body)

    const callRes = await fetch(apiRes.url, {
      headers: {
        Authorization: `Bearer ${env.API_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })

    apiRes.res = {
      statusCode: callRes.status,
    }

    const contentType = callRes.headers.get('content-type')

    if (contentType == null || contentType.includes('application/json') == false) {
      const text = await callRes.text()
      apiRes.error = text === '' ? 'response is empty' : 'content-type is not json'
      return apiRes
    }

    const data = (await callRes.json()) as T & { message?: string; status?: string }
    apiRes.res.data = data
    apiRes.res.vendorStatus = data.status ?? callRes.status.toString()

    if (data.status != null && data.status !== 'SUCCESS') {
      apiRes.error = data.message ?? data.status.toString()
    }
    if (callRes.status !== 200) {
      apiRes.error = 'status code is not 200'
    }
  } catch (err) {
    apiRes.error = errorToString(err)
  }

  return apiRes
}

export async function callHistoryByDateApi(env: SkyHubEnv, startTime: Date, endTime: Date) {
  const start = formatAsiaSeoul(startTime)
  const end = formatAsiaSeoul(endTime)

  const newBets: HistoryItem[] = []
  let skip = 1
  for (;;) {
    try {
      const newUrl = `${env.API_URL}/transactions?start=${start}&end=${end}&perPage=1000&page=${skip}&withDetails=1`
      console.log(`skyhub_call ${newUrl}`)

      const res = await fetch(newUrl, {
        headers: {
          Authorization: `Bearer ${env.API_TOKEN}`,
          Accept: 'application/json',
        },
      })

      const resData = await res.json()

      if (resData.status !== '0') {
        console.log('skyhub_call fail', newUrl, res.status, resData)
        break
      }

      console.log('skyhub_call success', newUrl, res.status, 'length', resData?.data?.length)

      newBets.push(...resData.data)

      if (resData.data.length < 1000) {
        break
      }
      skip += 1

      Sleep(1000) // Prevent rate limit
    } catch (err) {
      console.log('skyhub_call err', errorToString(err))
      break
    }
  }

  return newBets
}

export class ThirdPartySkyHub extends Vendor {
  env: SkyHubEnv
  memHistory: any = []
  async create(user: User, userId: string) {
    const result = new APIResult<unknown>()

    try {
      result.success = true
    } catch (err) {
      result.error = err.toString()
    }

    return result
  }

  async join({ agentCode, userId, vendorSetting }: JoinOptions) {
    const result = new JoinResult<unknown>()

    try {
      const callRes = await callApi<{
        link: string
        user: { username: string; nickname: string; balance: number; token: string }
        userCreate: boolean
      }>(this.env, '/game-launch-link', {
        username: agentCode + userId,
        vendor: 'EVOLUTION',
        //game_id: gamecode ?? vendorParam.default_game_id,
        game_id: '84',
      })

      result.url = callRes.url
      result.body = callRes.body

      const joinResData = callRes.res.data
      result.result = joinResData

      if (callRes.error != null || joinResData.link == null) {
        throw new Error('launch error ' + callRes.error)
      }

      result.gameUrl = joinResData.link
      result.success = true
    } catch (err) {
      result.error = makeErrorObj(err)
    }

    return result
  }

  async processHistoryData({ mongoBet, bets }: HistoryOptions): Promise<BetData[]> {
    const oldestDetails = bets[0]

    if (oldestDetails == null) {
      return []
    }

    const beginDate = oldestDetails.betTime

    //const newestDetails = bets[bets.length - 1]

    //const endDate = newestDetails.betTime

    const beDate = addMinutes(beginDate, 0)

    const newestDetail = bets.at(-1)

    const endBetTime = newestDetail?.betTime ?? new Date()

    const endTime = addMinutes(endBetTime, +1)

    //const rawHistoryArr = await callHistoryApi(this.env, Number(betTrans.betId))
    const rawHistoryRes = await callHistoryByDateApi(this.env, beDate, endTime)
    if (rawHistoryRes == null || rawHistoryRes.length === 0) {
      return []
    }

    const rawHistorys: {
      [searchId: string]: HistoryItem
    } = {}
    for (const rawHistory of rawHistoryRes.filter((s) => s.type === 'win')) {
      const { details, user } = rawHistory
      const [round] = details.game.round.split('-')
      const summaryId = `hlevo-${details?.game?.type}-${round}`
      const userID = user.username
      const searchId = userID + '-' + summaryId
      rawHistorys[searchId] = rawHistory
    }

    const detailInfo: BetDataCasino[] = []
    for (let i = 0; i < bets.length; i++) {
      const betData = bets[i]
      const { agentCode, userId, summaryId } = betData

      const username = agentCode + userId

      const searchId = `${agentCode}${userId}-${summaryId}`

      const rawHistory = rawHistorys[searchId]

      if (rawHistory != null) {
        const { details, external } = rawHistory

        betData.tableId = betData.gameId
        betData.tableName = details?.game.title

        betData.content = {
          result: {
            player: external?.detail?.data?.result?.player,
            banker: external?.detail?.data?.result?.banker,
            result: external?.detail?.data?.result,
          },
          participants: external?.detail?.data?.participants,
        }

        if (betData.amountWin === null) {
          betData.amountWin = 0
        }
      } else {
        if (betData.packet?.[1] !== 'ADMIN_SETTLE' && betData.betStatus !== 'CANCEL') {
          continue
        }
      }

      detailInfo.push(betData)

      console.log(`honorlink history`, i, detailInfo.length, username, summaryId)
    }
    return detailInfo
  }
}
