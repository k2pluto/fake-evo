import { FastifyInstance } from 'fastify'

import { honorlink, star_cx, alpha, uniongame, evolution } from '../../common/fake-vendors'
import { mainSQL, mongoBet } from '../app'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { APIError } from '@service/src/vendor'
import { getAgentGameSettingTree } from '@service/src/lib/common/game/game-setting-store'

export function getUserInfo(username: string) {
  return {
    agentCode: username.substring(0, 3).toLowerCase(),
    userId: username.substring(3).toLowerCase(),
  }
}

export interface LaunchAPIResult {
  status: number
  desc?: APIError
  message?: string
  gameUrl?: string
}

export function registerController(fastify: FastifyInstance) {
  fastify.get('/honorlink/token', async (req, reply) => {
    const { query } = req

    const { username } = query as { [key: string]: string }

    const { agentCode, userId } = getUserInfo(username)

    /*const user = await mainSQL.user.findOne({ where: { agentCode, userId } })
    if (user == null) {
      return {
        status: 100,
      }
    }*/

    const createRes = await honorlink.create(null, agentCode + userId)
    console.log(JSON.stringify(createRes))
    if (createRes.success === false) {
      return {
        status: 100,
        mesage: createRes.error,
      }
    }
    const res = await honorlink.join({ agentCode, userId })
    console.log(JSON.stringify(res))
    if (res.success === false) {
      return {
        status: 100,
        mesage: res.error,
      }
    }

    return {
      status: 0,
      gameUrl: res.gameUrl,
    }
  })

  fastify.get('/alpha/token', async (req, reply) => {
    const { query } = req

    const { username } = query as { [key: string]: string }

    const { agentCode, userId } = getUserInfo(username)

    /*const user = await mainSQL.user.findOne({ where: { agentCode, userId } })
    if (user == null) {
      return {
        status: 100,
      }
    }*/

    const createRes = await alpha.create(null, agentCode + userId)
    console.log(JSON.stringify(createRes))
    if (createRes.success === false) {
      return {
        status: 100,
        mesage: createRes.error,
      }
    }
    const res = await alpha.join({ agentCode, userId })
    console.log(JSON.stringify(res))
    if (res.success === false) {
      return {
        status: 100,
        mesage: res.error,
      }
    }

    return {
      status: 0,
      gameUrl: res.gameUrl,
    }
  })

  fastify.get('/swix/token', async (req, reply): Promise<LaunchAPIResult> => {
    const { query } = req

    const { username } = query as { [key: string]: string }

    const { agentCode, userId } = getUserInfo(username)

    /*const user = await mainSQL.user.findOne({ where: { agentCode, userId } })
    if (user == null) {
      return {
        status: 100,
      }
    }*/

    const createRes = await star_cx.create(null, agentCode + userId)
    console.log(JSON.stringify(createRes))
    if (createRes.success === false) {
      return {
        status: 100,
        desc: createRes.error,
      }
    }

    /*const vendorSetting = await mongoBet.agentVendorSetting.findOne({
      where: {
        agentCode,
        //vendor: VendorCode.CX_Star_Evolution,
        vendor: VendorCode.FakeCX_Evolution,
      },
    }) */

    const agentGameSetting = await mongoBet.agentGameSetting.findOne({
      where: {
        agentCode,
      },
    })

    const vendorSetting = agentGameSetting?.vendorGameSettings?.[VendorCode.FakeCX_Evolution]

    //이미 reevo 에서 체크하기 때문에 여기서 따로 체크하지 않는다.
    /*if (vendorSetting?.used === false) {
      return {
        status: 101,
        message: 'Not allow vendor',
      }
    }*/

    const res = await star_cx.join({ agentCode, userId, vendorSetting })
    console.log(JSON.stringify(res))
    if (res.success === false) {
      return {
        status: 102,
        desc: res.error,
      }
    }

    return {
      status: 0,
      gameUrl: res.gameUrl,
    }
  })
  fastify.get('/uniongame/token', async (req, reply): Promise<LaunchAPIResult> => {
    const { query } = req

    const { username } = query as { [key: string]: string }

    const { agentCode, userId } = getUserInfo(username)

    /*const user = await mainSQL.user.findOne({ where: { agentCode, userId } })
    if (user == null) {
      return {
        status: 100,
      }
    }*/

    const createRes = await uniongame.create(null, agentCode + userId)
    console.log(JSON.stringify(createRes))
    if (createRes.success === false) {
      return {
        status: 100,
        desc: createRes.error,
      }
    }
    const res = await uniongame.join({ agentCode, userId })
    console.log(JSON.stringify(res))
    if (res.success === false) {
      return {
        status: 102,
        desc: res.error,
      }
    }

    return {
      status: 0,
      gameUrl: res.gameUrl,
    }
  })

  fastify.get('/evolution/token', async (req, reply): Promise<LaunchAPIResult> => {
    const { query } = req

    const { username } = query as { [key: string]: string }

    const { agentCode, userId } = getUserInfo(username)

    /*const user = await mainSQL.user.findOne({ where: { agentCode, userId } })
    if (user == null) {
      return {
        status: 100,
      }
    }*/

    const createRes = await evolution.create(null, agentCode + userId)
    console.log(JSON.stringify(createRes))
    if (createRes.success === false) {
      return {
        status: 100,
        desc: createRes.error,
      }
    }

    const agent = await mainSQL.agent.findOne({ where: { agentCode } })
    if (agent == null) {
      console.log('can not find user')

      throw new Error('can not find agent')
    }

    const { mergedVendorSettings } = await getAgentGameSettingTree(mongoBet, agent, new Date())

    const vendorSetting = mergedVendorSettings[VendorCode.FakeChoi_Evolution]

    //이미 reevo 에서 체크하기 때문에 여기서 따로 체크하지 않는다.
    /*if (vendorSetting?.used === false) {
      return {
        status: 101,
        message: 'Not allow vendor',
      }
    }*/

    const res = await evolution.join({ agentCode, userId, userRepo: mainSQL.repos.user, vendorSetting })
    console.log(JSON.stringify(res))
    if (res.success === false) {
      return {
        status: 102,
        desc: res.error,
      }
    }

    return {
      status: 0,
      gameUrl: res.gameUrl,
    }
  })

  fastify.get('/hl-create-login-job', async (req, reply) => {
    console.log('hl-create-login-job')
  })

  fastify.get('/hl-assgin-login-job', async (req, reply) => {
    console.log('hl-assgin-login-job')
  })

  fastify.get('/hl-done-login-job', async (req, reply) => {
    console.log('hl-done-login-job')
  })

  fastify.get('/hl-ip', async (req, reply) => {
    const ipRes = await honorlink.ip()

    return {
      status: 0,
      data: ipRes.result,
      error: ipRes.error,
    }
  })
  fastify.get('/hl-ping', async (req, reply) => {
    const pingRes = await honorlink.ping()

    return {
      status: 0,
      data: pingRes.result,
      error: pingRes.error,
    }
  })
}
