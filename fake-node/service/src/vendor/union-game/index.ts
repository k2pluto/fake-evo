import { JoinResult, Vendor, JoinOptions, CreateResult, APIEnv } from '..'
import { User } from '../../lib/interface/sql/user'
import { makeErrorObj, querystring } from '../util'

import axios from 'axios'

export interface UnionGameEnv extends APIEnv {
  API_URL: string

  AGENT_NAME: string
  API_TOKEN: string
}

export const joinErrorMessageTable = {
  '1023': '사용이 중지된 유저입니다.',
}

export class ThirdPartyUnionGame extends Vendor {
  env: UnionGameEnv

  async create(user: User, userId: string) {
    const result = new CreateResult<unknown>()

    result.success = true

    return result
  }

  async join({ agentCode, userId }: JoinOptions) {
    const result = new JoinResult<unknown>()

    try {
      const username = agentCode + userId

      result.body = {
        username: username,
        nickname: username,
        language: 'ko',
        vendorKey: 'evolution_casino',
        gameKey: 'lobby1000',
        lobbyKey: 'top_games',
        platform: 'WEB',
        ipAddress: '127.0.0.1',
        requestKey: new Date().getTime(),
      }

      const qs = querystring(result.body)

      result.url = `${this.env.API_URL}/seamless/authenticate`

      const joinRes = await axios.post(result.url, qs, {
        headers: {
          'k-username': 'cool',
          'k-secret': '7d55acaba1a6b4c846ba0b894c1fa3da',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const joinResData: { code: number; msg: string; url: string } = joinRes.data
      result.result = joinResData

      const { url } = joinResData

      if (url == null || url === '') {
        result.error = {
          type: 'vendor',
          message: joinErrorMessageTable[joinResData.code] ?? joinResData.msg,
          code: joinResData.code.toString(),
        }
        return result
      }

      result.gameUrl = url
      result.success = true
    } catch (err) {
      result.error = makeErrorObj(err)
    }

    return result
  }
}
