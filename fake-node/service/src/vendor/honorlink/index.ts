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

const API_URL = 'https://api.honorlink.org/api'

export interface HonorLinkEnv extends APIEnv {
  API_TOKEN: string
}

export const HonorLinkConfigSchema = {
  optionalProperties: {
    skin: { type: 'string', enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  },
} satisfies SomeJTDSchemaType

type HonorLinkParam = JTDDataType<typeof HonorLinkConfigSchema>

export async function callHistoryByDateApi(env: HonorLinkEnv, startDate: Date) {
  const now = new Date()
  const beDate = startDate
  const enDate = new Date(now)

  const newBets: HistoryItem[] = []
  let skip = 1
  for (;;) {
    try {
      const newUrl = `${API_URL}/transactions?start=${beDate
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19)}&end=${enDate
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19)}&perPage=1000&page=${skip}&withDetails=1`
      console.log(`${newUrl}`)

      const result = await axios
        .get(newUrl, {
          headers: {
            Authorization: `Bearer ${env.API_TOKEN}`,
            Accept: 'application/json',
          },
        })
        .then((response: any) => response.data.data)

      newBets.push(...result)

      if (result.length < 100) {
        break
      }
      skip += 1
    } catch (err) {
      console.log(errorToString(err))
      break
    }
  }

  return newBets
}

export class ThirdPartyHonorLink extends Vendor {
  env: HonorLinkEnv
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
  async createD(agentCode: string, userId: string) {
    const result = new APIResult<unknown>()

    try {
      result.url = `${API_URL}/user/create`
      result.body = `username=${agentCode + userId}&nickname=${userId}`

      const createResData = await axios.post(result.url, result.body, {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
          //'Content-Type': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      })
      result.result = createResData.data

      result.success = true
    } catch (err) {
      if (err.response?.status === 422) {
        result.success = true
      } else {
        result.error = makeErrorObj(err)
      }
    }

    return result
  }
  async ip() {
    const result = new APIResult<unknown>()

    try {
      result.url = `${API_URL}/ip`

      const ipRes = await axios.post(result.url, '', {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
          //'Content-Type': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      })
      result.result = ipRes.data

      result.success = true
    } catch (err) {
      if (err.response?.status === 422) {
        result.success = true
      } else {
        result.error = makeErrorObj(err)
      }
    }

    return result
  }
  async ping() {
    const result = new APIResult<unknown>()

    try {
      result.url = `${API_URL}/ping`

      const pingRes = await axios.post(result.url, '', {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
          //'Content-Type': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      })
      result.result = pingRes.data

      result.success = true
    } catch (err) {
      if (err.response?.status === 422) {
        result.success = true
      } else {
        result.error = makeErrorObj(err)
      }
    }

    return result
  }

  async join({ agentCode, userId, vendorSetting }: JoinOptions) {
    const result = new JoinResult<unknown>()

    try {
      result.url = `${API_URL}/game-launch-link`
      result.body = querystring({
        username: agentCode + userId,
        vendor: 'evolution',
        game_id: 'evolution_top_games',
        ...(vendorSetting?.config as HonorLinkParam),
      })
      const joinRes = await axios.get(result.url + '?' + result.body, {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
          //'Content-Type': 'application/json',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })

      const joinResData = joinRes.data
      result.result = joinResData

      if (joinResData.link == null || joinResData.link === '') {
        throw new Error('error is ' + joinResData.token)
      }

      result.gameUrl = joinResData.link
      result.success = true
    } catch (err) {
      result.error = makeErrorObj(err)
    }

    return result
  }

  async token({ agentCode, userId }: { agentCode: string; userId: string }) {
    const result = new JoinResult<unknown>()

    try {
      result.url = `${API_URL}/user/refresh-token?username=${agentCode + userId}`
      result.body = `username=${agentCode + userId}`
      const joinRes = await axios.patch(result.url, result.body, {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
          //'Content-Type': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      })

      const joinResData = joinRes.data
      result.result = joinResData

      if (joinResData.token == null || joinResData.token === '') {
        throw new Error('error is ' + joinResData.token)
      }

      return joinResData.token
    } catch (err) {
      // result.error = {
      //   message: err.toString(),
      //   data: err.response?.data,
      //   status: err.response?.status,
      //   statusText: err.response?.statusText,
      // }
    }

    return ''
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
    //const beDate = addMinutes(beginDate, -10)
    //const enDate = addMinutes(endDate, 1)
    //const enDate = addMinutes(endDate, 10)

    //const betTrans = oldestDetails.transactions[0]

    //const rawHistoryArr = await callHistoryApi(this.env, Number(betTrans.betId))
    const rawHistoryRes = await callHistoryByDateApi(this.env, beDate)
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

        betData.tableId = details?.game.id
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

  async history(options: LegacyHistoryOptions): Promise<BetDataCasino[]> {
    const now = new Date()
    const beDate = new Date(now)
    const enDate = new Date(now)

    beDate.setHours(beDate.getHours() - 0)
    beDate.setMinutes(beDate.getMinutes() - 68)

    enDate.setHours(enDate.getHours() - 0)
    enDate.setMinutes(enDate.getMinutes() - 0)

    const newBets = []
    let skip = 1
    for (;;) {
      try {
        const newUrl = `${API_URL}/transactions?start=${beDate
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19)}&end=${enDate
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19)}&perPage=1000&page=${skip}&withDetails=1`
        console.log(`${newUrl}`)

        const result = await axios
          .get(newUrl, {
            headers: {
              Authorization: `Bearer ${this.env.API_TOKEN}`,
              Accept: 'application/json',
            },
          })
          .then((response: any) => response.data.data)

        newBets.push(...result)

        if (result.length < 100) {
          break
        }
        skip += 1
      } catch (err) {
        console.log(errorToString(err))
        break
      }
    }

    const eee: any = []
    const wins = newBets.filter((s: any) => s.type === 'win')
    for (const win of wins) {
      try {
        const { details, user, external } = win
        const [round] = details.game.round.split('-')
        const username = user.username.substring(3)

        const summaryId = `hlevo-${details?.game?.type}-${round}`

        if (this.memHistory[`${user.username}-${summaryId}`] != null) {
          continue
        }

        const detailInfo = await options.betRepo.findOne({
          where: {
            historyStatus: { $in: ['DO', 'WAIT'] },
            vendor: 'hlevo',
            summaryId: summaryId,
            userId: username,
          },
        })
        if (detailInfo == null) {
          continue
        }

        detailInfo.tableId = details?.game.id
        detailInfo.tableName = details?.game.title

        detailInfo.content = {
          result: {
            player: external?.detail?.data?.player,
            banker: external?.detail?.data?.banker,
            result: external?.detail?.data?.result,
          },
          participants: external?.detail?.data?.participants,
        }

        eee.push(detailInfo)
        this.memHistory[`${user.username}-${summaryId}`] = true
      } catch (err) {
        console.log(errorToString(err))
      }
    }

    return eee
  }
}
