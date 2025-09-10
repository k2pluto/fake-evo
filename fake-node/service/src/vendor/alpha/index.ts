import { JoinResult, Vendor, JoinOptions, CreateResult, APIEnv } from '..'
import { User } from '../../lib/interface/sql/user'
import { makeErrorObj, querystring } from '../util'

import axios from 'axios'
import { errorToString } from '../../lib/utility/util'

export interface AlphaEnv extends APIEnv {
  API_URL: string

  API_TOKEN: string
}

export class ThirdPartyAlpha extends Vendor {
  env: AlphaEnv

  async create(user: User, userId: string) {
    const result = new CreateResult<unknown>()

    try {
      result.url = `${this.env.API_URL}/user/create`
      result.body = {
        username: userId,
        nickname: userId,
      }

      const createResData = await axios.post(result.url, result.body, {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
        },
      })
      result.result = createResData.data

      result.success = true
    } catch (err) {
      if (err.response?.status === 422) {
        result.success = true
      } else {
        // result.error = {
        //   message: err.toString(),
        //   data: err.response?.data,
        //   status: err.response?.status,
        //   statusText: err.response?.statusText,
        // }
      }
    }

    return result
  }

  async lobbyList() {
    try {
      const url = `${this.env.API_URL}/lobby-list`
      const lobbyRes = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
        },
      })

      return lobbyRes.data
    } catch (err) {
      console.log(errorToString(err))
    }
  }
  async join({ agentCode, userId }: JoinOptions) {
    const result = new JoinResult<unknown>()

    try {
      result.url = `${this.env.API_URL}/user/refresh-token`
      result.body = {
        username: agentCode + userId,
      }
      const tokenRes = await axios.post(result.url, result.body, {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
        },
      })

      const tokenResData = tokenRes.data
      result.result = tokenResData

      if (tokenResData.token == null || tokenResData.token === '') {
        throw new Error('error is ' + tokenResData.token)
      }

      result.body = {
        game_id: 'evolution_top_games',
        token: tokenResData.token,
        vendor: 'evolution',
        ip: '127.0.0.1',
      }

      result.url = `${this.env.API_URL}/get-game-url?${querystring(result.body)}`

      const joinRes = await axios.get(result.url, {
        headers: {
          Authorization: `Bearer ${this.env.API_TOKEN}`,
        },
        data: result.body,
      })

      const joinResData = joinRes.data
      result.result = joinResData

      if (joinResData.link == null || joinResData.link === '') {
        throw new Error('error is ' + joinResData.link)
      }

      result.gameUrl = joinResData.link
      result.success = true
    } catch (err) {
      result.error = makeErrorObj(err)
    }

    return result
  }
}
