import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'

// import { config } from '../config'

import { mainSQL, mongoDB } from '../app'

import { FakeApiStatus } from './types'

import { configService, entryGame, playerHistoryDay, playerHistoryDays, playerHistoryGame, setup } from './service'
import { type User } from '@service/src/lib/interface/sql/user'
import { type FakeLoginData } from '@service/src/lib/interface/mongo/fake-login-data'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { connectEvolution } from './connect-evolution'
import { type CallEvoResponse, callEvo } from './call-evo'
import { errorToString, getFastifyIp } from '../../common/util'
import { changePacketHostname } from '../../common/fake-util'
import { config } from '../config'
import { updateTlsSuites } from './call-axios'
import { globalStore } from '../global-store'
import { getEvolutionUrl, getSelfUrl } from './util'

//const evolutionUrl = 'https://skylinemtgsea1.evo-games.com'

const versionRegex = /Build Version: ([a-z0-9.-]+) /

async function defaultEvoRootRouter(req: FastifyRequest, reply: FastifyReply) {
  const { EVOSESSIONID } = req.cookies as { EVOSESSIONID: string }

  if (EVOSESSIONID == null) {
    return await reply.status(401).send(`authorization failed EVOSESSIONID ${EVOSESSIONID}`)
  }

  const evolutionUrl = config.EVOLUTION_URL ?? (await getEvolutionUrl(EVOSESSIONID))
  if (evolutionUrl == null) {
    return { status: FakeApiStatus.DataNotFound, ms: 'authorization failed' }
  }

  const selfUrl = getSelfUrl(req)
  console.log('defaultEvoRootRouter', req.url, EVOSESSIONID, selfUrl)

  try {
    const url = `${evolutionUrl}${req.originalUrl}`

    const res = await callEvo(url, {
      headers: req.headers,
    })

    // Akamai 봇 감지 스크립트 제거 (자동 로그아웃 방지)
    if (res.recvHeaders['content-type']?.includes('text/html')) {
      const beforeLength = res.data.length

      // Akamai script 태그 제거 (src에 /akam/ 포함)
      res.data = res.data.replace(/<script[^>]*src=["'][^"']*\/akam\/[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '')

      // Akamai img 태그 제거 (src에 /akam/ 포함)
      res.data = res.data.replace(/<img[^>]*src=["'][^"']*\/akam\/[^"']*["'][^>]*\/?>/gi, '')

      // Akamai 인라인 스크립트 제거 (akam 문자열 포함)
      res.data = res.data.replace(/<script[^>]*>[\s\S]*?\/akam\/[\s\S]*?<\/script>/gi, '')

      const afterLength = res.data.length
      if (beforeLength !== afterLength) {
        console.log(`🚫 Akamai scripts removed from HTML: ${beforeLength} -> ${afterLength} bytes (removed ${beforeLength - afterLength} bytes)`)
      }
    }

    if (config.proxyVideo && res.recvHeaders['content-type']?.includes('text/html')) {
      //이 부분에서 많이 부하가 있을거라 예상됨 나중에 캐싱으로 처리해야 할듯
      /*const match = res.data.match(versionRegex)

      let version: string
      if (match && match[1]) {
        version = match[1]
      }

      console.log('convert video url', loginData?.username, version)

      const matchRes = res.data.match(/\${window\.EVO_CDN}\/frontend\/cvi\/evo-video-components/g)
      console.log('matchRes', loginData?.username, JSON.stringify(matchRes))*/

      res.data = res.data.replace(
        /\${window\.EVO_CDN}\/frontend\/cvi\/evo-video-components/g,
        `${selfUrl}/video/frontend/cvi/evo-video-components`,
      )
    }

    return await reply.headers(res.recvHeaders).status(res.status).send(res.data)
  } catch (err) {
    console.log(errorToString(err))
  }
  return await reply.status(500).send('error')
}

async function defaultVideoRouter(req: FastifyRequest, reply: FastifyReply) {
  /*const { EVOSESSIONID, cdn } = req.cookies as Record<string, string>

  if (EVOSESSIONID == null) {
    return await reply.status(401).send(`authorization failed EVOSESSIONID ${EVOSESSIONID}`)
  }

  const loginData = await mongoDB.fakeLoginData.findOne({ where: { sessionId: EVOSESSIONID } })
  if (loginData == null) {
    console.log('defaultVideoRouter authroization failed', EVOSESSIONID)
    return await reply.status(401).send('authorization failed login')
  }*/

  const selfUrl = getSelfUrl(req)
  console.log('defaultVideoRouter', req.url, selfUrl)

  const newCdn = globalStore.getCdn()

  try {
    const url = `${newCdn}${req.originalUrl.replace('/video', '')}`

    const res = await callEvo(url, {
      headers: req.headers,
    })

    if (req.originalUrl.includes('video_version_') === false) {
      //이것도 부하가 있을거라고 생각됨.
      /*const regex = /"stream\.host"\s*:\s*"([a-zA-Z0-9.]+)"/g

      const [searchText, streamHost1] = regex.exec(res.data)

      globalStore.setStreamHost1(streamHost1)*/

      /*if (streamHost1 !== loginData.streamHost1) {
        console.log('defaultVideoRouter update streamHost1', loginData?.username, EVOSESSIONID)
        await mongoDB.fakeLoginData.updateOne(
          {
            username: loginData.username,
          },
          {
            $set: {
              streamHost1,
            },
          },
        )
      }

      res.data = res.data.replace(searchText, `"stream.host": "${new URL(config.SELF_URL).host}"`) */
      res.data = res.data.replace(/"stream\.host"\s*:\s*"[a-zA-Z0-9.]+"/, `"stream.host": "${new URL(selfUrl).host}"`)
    }

    res.recvHeaders['access-control-allow-origin'] = selfUrl

    return await reply.headers(res.recvHeaders).status(res.status).send(res.data)
  } catch (err) {
    console.log(errorToString(err))
  }
  return await reply.status(500).send('error')
}

async function defaultCdnRouter(req: FastifyRequest, reply: FastifyReply) {
  const sessionId = req.cookies['EVOSESSIONID'] ?? req.query['videoSessionId']?.split('-')[1]

  if (sessionId == null) {
    return await reply.status(401).send(`authorization failed EVOSESSIONID ${sessionId}`)
  }

  const loginData = await mongoDB.fakeLoginData.findOne({ where: { sessionId: sessionId } })
  if (loginData == null) {
    console.log('defaultCdnRouter authroization failed', sessionId)
    return await reply.status(401).send('authorization failed login')
  }

  const streamHost1 = loginData.streamHost1 ?? globalStore.getStreamHost1()

  const selfUrl = getSelfUrl(req)
  console.log('defaultCdnRouter', loginData?.username, sessionId, req.url, selfUrl, loginData.streamHost1)

  try {
    const url = `https://${streamHost1}${req.originalUrl}`

    // Evolution CDN에 요청할 때 헤더를 Evolution 도메인으로 정리 (프록시 증거 제거)
    const cleanHeaders = {
      'accept': req.headers['accept'],
      'accept-encoding': req.headers['accept-encoding'] ?? 'gzip, deflate, br',
      'accept-language': req.headers['accept-language'],
      'user-agent': req.headers['user-agent'],
      'sec-ch-ua': req.headers['sec-ch-ua'],
      'sec-ch-ua-mobile': req.headers['sec-ch-ua-mobile'],
      'sec-ch-ua-platform': req.headers['sec-ch-ua-platform'],
      'sec-fetch-dest': req.headers['sec-fetch-dest'] ?? 'empty',
      'sec-fetch-mode': req.headers['sec-fetch-mode'] ?? 'cors',
      'sec-fetch-site': 'none',  // 직접 연결로 위장
      'priority': req.headers['priority'],
      'cookie': req.headers['cookie'],
      'referer': req.headers['referer'],  // Referer 추가 (callAxios에서 도메인 변환됨)
    }

    // undefined 값 제거
    Object.keys(cleanHeaders).forEach(key => {
      if (cleanHeaders[key] === undefined) {
        delete cleanHeaders[key]
      }
    })

    console.log('===== defaultCdnRouter: Cleaned headers for Evolution CDN =====')
    console.log('Username:', loginData?.username, 'URL:', url)
    console.log('Original Referer:', req.headers['referer'], '(will be transformed by callAxios)')
    console.log('sec-fetch-site:', cleanHeaders['sec-fetch-site'])
    console.log('================================================================')

    const res = await callEvo(url, {
      headers: cleanHeaders,
      username: loginData?.username,
      evolutionUrl: loginData.evolutionUrl,  // Evolution 메인 도메인 전달
    })

    if (res.data?.indexOf('http') < 0) {
      console.log(
        'defaultCdnRouter error data',
        loginData?.username,
        url,
        JSON.stringify(res.data),
        JSON.stringify(res.recvHeaders),
      )
      return await reply.headers(res.recvHeaders).status(res.status).send(res.data)
    }
    const streamHost2 = new URL(res.data).host

    if (streamHost2 !== loginData.streamHost2) {
      console.log('defaultCdnRouter update streamHost2', loginData?.username, sessionId)
      await mongoDB.fakeLoginData.updateOne(
        {
          username: loginData.username,
        },
        {
          $set: {
            streamHost2,
          },
        },
      )
    }

    const data = res.data.replace(streamHost2, new URL(selfUrl).host)

    return await reply.headers(res.recvHeaders).status(res.status).send(data)
  } catch (err) {
    console.log(errorToString(err))
  }
  return await reply.status(500).send('error')
}

export async function defaultAppRouter(req: FastifyRequest, reply: FastifyReply) {
  const { EVOSESSIONID, cdn } = req.cookies as Record<string, string>

  if (EVOSESSIONID == null) {
    return await reply.status(401).send(`authorization failed EVOSESSIONID ${EVOSESSIONID}`)
  }

  const loginData = await mongoDB.fakeLoginData.findOne({ where: { sessionId: EVOSESSIONID } })
  if (loginData == null) {
    return await reply.status(401).send('authorization failed login')
  }

  try {
    const url = `https://${loginData.streamHost2}${req.originalUrl}`

    const res = await callEvo(url, {
      headers: req.headers,
    })

    const data = res.data as {
      name: string
      streams: {
        url: string
      }[]
    }

    if (data.streams == null) {
      console.log('defaultAppRouter data.streams is null', loginData?.username, JSON.stringify(data))
      return await reply.headers(res.recvHeaders).status(res.status).send(res.data)
    }

    // fake-evo가 비디오 WebSocket을 중계하도록 URL을 fake-evo 주소로 변경
    const selfUrl = getSelfUrl(req)
    const selfHost = new URL(selfUrl).host
    console.log('🎥 Video stream URLs (proxied through fake-evo):')
    console.log(`   selfUrl: ${selfUrl}`)
    console.log(`   Original streamHost2: ${loginData.streamHost2}`)
    console.log(`   Replacing with selfHost: ${selfHost}`)

    for (let i of data.streams) {
      const originalUrl = i.url
      i.url = i.url.replace(loginData.streamHost2, selfHost)
      console.log(`   ${originalUrl} → ${i.url}`)
    }

    return await reply.headers(res.recvHeaders).status(res.status).send(res.data)
  } catch (err) {
    console.log(errorToString(err))
  }
  return await reply.status(500).send('error')
}
async function defaultEvoRouter(req: FastifyRequest, reply: FastifyReply) {
  const { EVOSESSIONID } = req.cookies as { EVOSESSIONID: string }

  if (EVOSESSIONID == null) {
    return await reply.status(401).send(`authorization failed EVOSESSIONID ${EVOSESSIONID}`)
  }

  const evolutionUrl = config.EVOLUTION_URL ?? (await getEvolutionUrl(EVOSESSIONID))

  if (evolutionUrl == null) {
    return { status: FakeApiStatus.DataNotFound, ms: 'authorization failed' }
  }

  let res: CallEvoResponse
  try {
    const url = `${evolutionUrl}${req.originalUrl}`

    if (req.method === 'POST') {
      const bodyObj = JSON.parse(req.body as string)
      changePacketHostname(bodyObj, new URL(evolutionUrl).hostname)

      // POST body 로깅
      console.log('defaultEvoRouter POST:', req.originalUrl)
      console.log('  Body preview:', JSON.stringify(bodyObj).substring(0, 200))

      res = await callEvo(url, {
        body: JSON.stringify(bodyObj),
        headers: req.headers,
        method: 'POST',
      })
    } else {
      res = await callEvo(url, {
        headers: req.headers,
      })
    }

    return await reply.headers(res.recvHeaders).status(res.status).send(res.data)
  } catch (err) {
    console.log(errorToString(err))
  }
  return await reply.status(500).send('error')
}

async function defaultEvoApiRouter(req: FastifyRequest, reply: FastifyReply) {
  const { EVOSESSIONID } = req.cookies as { EVOSESSIONID: string }

  if (EVOSESSIONID == null) {
    return await reply.status(401).send(`authorization failed EVOSESSIONID ${EVOSESSIONID}`)
  }

  const evolutionUrl = config.EVOLUTION_URL ?? (await getEvolutionUrl(EVOSESSIONID))
  if (evolutionUrl == null) {
    return { status: FakeApiStatus.DataNotFound, ms: 'authorization failed' }
  }

  console.log('defaultEvoApiRouter', req.url)

  let res: CallEvoResponse
  try {
    const url = `${evolutionUrl}${req.originalUrl}`

    if (req.method === 'POST') {
      const bodyObj = JSON.parse(req.body as string)
      changePacketHostname(bodyObj, new URL(evolutionUrl).hostname)

      // POST body 로깅
      console.log('defaultEvoApiRouter POST:', req.originalUrl)
      console.log('  Body preview:', JSON.stringify(bodyObj).substring(0, 200))

      res = await callEvo(url, {
        body: JSON.stringify(bodyObj),
        headers: req.headers,
        method: 'POST',
      })
    } else {
      res = await callEvo(url, {
        headers: req.headers,
      })
    }

    return await reply.headers(res.recvHeaders).status(res.status).send(res.data)
  } catch (err) {
    console.log(errorToString(err))
  }
  return await reply.status(500).send('error')
}
export function registerV2Controller(fastify: FastifyInstance) {
  fastify.get('/', async (req, reply) => {
    console.log('fake_frontend_static_root', req.url)
    const { EVOSESSIONID } = (req.cookies ?? {}) as { EVOSESSIONID: string }

    if (EVOSESSIONID == null) {
      return 'OK'
      //return await reply.code(403).send({ error: 'unauthenticated' })
    }

    try {
      const evolutionUrl = config.EVOLUTION_URL ?? (await getEvolutionUrl(EVOSESSIONID))
      if (evolutionUrl == null) {
        return await reply.status(401).send('authorization failed login')
      }
      const res = await callEvo(`${evolutionUrl}${req.url}`, {
        headers: req.headers,
        responseType: 'arraybuffer',
      })
      await reply.header('Content-Type', 'text/html').send(res.data)
    } catch (err) {
      console.log(errorToString(err))
      if (err.response != null) {
        return await reply.status(err.response.status).send(err.response.data)
      }
    }
  })

  /* fastify.get(
    '/frontend/*',

    async (req, reply) => {
      try {
        console.log('fake_frontend_static', req.url, JSON.stringify(req.headers))
        const res = await callEvo(`${evolutionUrl}${req.url}`, {
          headers: req.headers,
        })
        console.log(
          'fake_frontend_static res',
          req.url,
          res.headers['content-type'],
          res.headers['content-length'],
          res.headers.location,
          res.status,
          res.data.length,
        )

        // return reply.headers(res.headers).send(res.data)
        return await reply
          .headers({
            ...res.headers,
            // 'content-type': 'text/html; charset=utf-8',
          })
          .status(res.status)
          .send(res.data)
      } catch (err) {
        console.log(errorToString(err))
        if (err.response != null) {
          return await reply.status(err.response.status).send(err.response.data)
        }
      }
    },
  ) */
  fastify.get('/frontend/evo/r2/', defaultEvoRootRouter)
  fastify.get('/frontend/evo/r3/', defaultEvoRootRouter)
  fastify.get('/frontend/onyx/ls/', defaultEvoRootRouter)

  fastify.get('/video/*', defaultVideoRouter)

  fastify.get('/cdn/*', defaultCdnRouter)
  //fastify.get('/app/*', defaultAppRouter)

  fastify.get('/frontend/*', defaultEvoRouter)

  // set-cookie path가 지정되어 있지 않아서 /debug/entry 이렇게 사용하면 set-cookie가 정상적으로 작동하지 않는다.
  fastify.get('/debugEntry', async (req, reply) => {
    const { username } = req.query as { username: string }

    return await entryGame({
      username,
      ip: getFastifyIp(req),
      headers: req.headers as any,
      reply,
    })
  })

  fastify.get('/entry', async (req, reply) => {
    const { authToken } = req.query as { authToken: string }

    return await entryGame({
      authToken,
      ip: getFastifyIp(req),
      headers: req.headers as any,
      reply,
    })
  })

  fastify.post('/set-url', async (req, reply) => {
    const { authToken, evolutionEntryUrl } = req.body as { authToken: string; evolutionEntryUrl: string }

    // POST body 로깅
    console.log('POST /set-url:', JSON.stringify(req.body).substring(0, 200))

    let userInfo: User

    const setUrlRes: {
      url?: string
      response?: any
      error?: any
    } = {}

    let returnValue: any

    try {
      userInfo = await mainSQL.repos.user.findOne({ where: { gameToken: authToken } })
      if (userInfo == null) {
        return await reply.status(401).send('authorization failed')
      }
      const { agentCode, userId } = userInfo
      await mainSQL.repos.user.update({ gameToken: authToken }, { gameToken: authToken })

      await mongoDB.fakeLoginData.updateOne(
        { username: agentCode + userId },
        {
          $set: { evolutionEntryUrl } as FakeLoginData,
        },
        {
          upsert: true,
        },
      )

      returnValue = {
        status: CommonReturnType.Success,
      }
    } catch (err) {
      setUrlRes.error = {
        message: err.toString(),
        stack: err.stack,
      }
      returnValue = {
        status: 8888,
        message: '알수없는 에러 입니다. 잠시 후에 다시 접속 바랍니다.',
      }
    } finally {
      const { agentCode, userId } = userInfo
      await mongoDB.logService.updateOne(
        { type: 'fake_entry', agentCode, userId },
        {
          $set: {
            'stepLog.setUrl': setUrlRes,
            error: setUrlRes.error != null,
          },
        },
      )
    }

    return returnValue
  })

  fastify.get('/init', async (req, reply) => {
    const { authToken } = req.query as { authToken: string }

    let userInfo: User

    const initRes: {
      url?: string
      response?: any
      error?: any
    } = {}

    let returnValue: any

    try {
      userInfo = await mainSQL.repos.user.findOne({ where: { gameToken: authToken } })
      if (userInfo == null) {
        return await reply.status(401).send('authorization failed')
      }

      const { agentCode, userId, agentId } = userInfo
      const fakeLoginData = await mongoDB.fakeLoginData.findOne({ where: { username: agentCode + userId } })

      const username = agentCode + userId

      for (let i = 0; i < 3; i++) {
        const connectData = await connectEvolution(fakeLoginData.evolutionEntryUrl, agentId, username, req.headers)

        initRes.response = connectData

        console.log(JSON.stringify(connectData))

        if (connectData.status !== 0) {
          // TLS를 바꾸고 한번 더 시도한다.
          updateTlsSuites()
          continue
        }

        await mainSQL.repos.user.update({ agentCode, userId }, { fakeMode: true })

        return await reply.headers(connectData.data.headers).redirect(`/frontend/evo/r2/#category=baccarat_sicbo`)
      }
      throw {
        status: 5555,
        message: '벤더사 오류입니다. 잠시 후에 다시 접속 바랍니다.',
      }
    } catch (err) {
      if (err.status != null) {
        initRes.error = err
        returnValue = { status: err.status, message: err.message }
      } else if (err?.response != null) {
        initRes.error = {
          message: err.toString(),
          data: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText,
        }
        returnValue = {
          status: 6666,
          message: '네트워크 에러 입니다. 잠시 후에 다시 접속 바랍니다.',
        }
      } else {
        initRes.error = {
          message: err.toString(),
          stack: err.stack,
        }
        returnValue = {
          status: 9999,
          message: '알수없는 에러 입니다. 잠시 후에 다시 접속 바랍니다.',
        }
      }
    } finally {
      const { agentCode, userId } = userInfo
      await mongoDB.logService.updateOne(
        { type: 'fake_entry', agentCode, userId },
        {
          $set: {
            'stepLog.init': initRes,
            error: initRes.error != null,
          },
        },
      )
    }

    return returnValue
  })

  fastify.get('/config', async (req, reply) => {
    return await configService(req, reply)
  })

  // fastify.get('/style', defaultEvoRouter)
  fastify.get('/style', defaultEvoRouter)
  fastify.get('/setup', async (req, reply) => {
    return await setup(req, reply)
  })
  fastify.post('/log', defaultEvoRouter)

  fastify.get('/api/player/history/days', async (req, reply) => {
    const { EVOSESSIONID } = req.cookies as { EVOSESSIONID: string }

    if (EVOSESSIONID == null) {
      return await reply.status(401).send('authorization failed')
    }

    const userInfo = await mongoDB.fakeLoginData.findOne({ where: { sessionId: EVOSESSIONID } })
    // const user = await mainSQL.repos.user.findOne({ agentCode: 'baj', userId: 'jun1234' })
    if (userInfo == null) {
      return { status: FakeApiStatus.DataNotFound, ms: 'authorization failed' }
    }

    const { agentCode, userId } = userInfo

    return await playerHistoryDays(agentCode, userId, req.url, req.headers)
  })

  fastify.get('/api/player/history/day/:dayParam', async (req, reply) => {
    const { EVOSESSIONID } = req.cookies as { EVOSESSIONID: string }

    if (EVOSESSIONID == null) {
      return await reply.status(401).send('authorization failed')
    }

    const userInfo = await mongoDB.fakeLoginData.findOne({ where: { sessionId: EVOSESSIONID } })
    // const user = await mainSQL.repos.user.findOne({ agentCode: 'baj', userId: 'jun1234' })
    if (userInfo == null) {
      return await reply.status(401).send('authorization failed')
    }

    const { agentCode, userId } = userInfo

    const { dayParam } = req.params as Record<string, string>

    return await playerHistoryDay(agentCode, userId, dayParam, req.url, req.headers)
  })

  fastify.get('/api/player/history/game/:gameId', async (req, reply) => {
    const { EVOSESSIONID } = req.cookies as { EVOSESSIONID: string }

    if (EVOSESSIONID == null) {
      return await reply.status(401).send('authorization failed')
    }

    const userInfo = await mongoDB.fakeLoginData.findOne({ where: { sessionId: EVOSESSIONID } })
    if (userInfo == null) {
      return await reply.status(401).send('authorization failed')
    }

    const { agentCode, userId } = userInfo

    const { gameId } = req.params as {
      gameId: string
    }

    const [, queryStr] = req.url.split('?')

    return await playerHistoryGame(agentCode, userId, gameId, queryStr, req.headers)
  })
  fastify.get('/api/snapshot', defaultEvoApiRouter)
  fastify.get('/api/unclaimed', defaultEvoApiRouter)
  fastify.get('/api/player/screenName', defaultEvoApiRouter)
  fastify.get('/api/*', defaultEvoApiRouter)

  fastify.get('/*', async (req, reply) => {
    console.log('etc_get_url', req.url)
    const { EVOSESSIONID } = (req.cookies ?? {}) as { EVOSESSIONID: string }

    if (EVOSESSIONID == null) {
      return ''
      //return await reply.code(403).send({ error: 'unauthenticated' })
    }

    try {
      const evolutionUrl = config.EVOLUTION_URL ?? (await getEvolutionUrl(EVOSESSIONID))
      if (evolutionUrl == null) {
        return await reply.status(401).send('authorization failed login')
      }

      const res = await callEvo(`${evolutionUrl}${req.url}`, {
        headers: req.headers,
        responseType: 'arraybuffer',
        evolutionUrl: evolutionUrl,  // Evolution 메인 도메인 전달
      })
      await reply.header('Content-Type', res.recvHeaders['content-type']).status(res.status).send(res.data)
    } catch (err) {
      console.log(errorToString(err))
      if (err.response != null) {
        return await reply.status(err.response.status).send(err.response.data)
      }
    }
  })
  fastify.post('/*', async (req, reply) => {
    console.log('etc_post_url', req.url)
    const { EVOSESSIONID } = (req.cookies ?? {}) as { EVOSESSIONID: string }

    try {
      // EVOSESSIONID가 없어도 처리 가능하도록 수정 (Akamai POST는 쿠키 없음)
      let evolutionUrl = config.EVOLUTION_URL

      if (!evolutionUrl && EVOSESSIONID) {
        evolutionUrl = await getEvolutionUrl(EVOSESSIONID)
      }

      // Akamai POST는 쿠키가 없으므로 fake-node 도메인을 Evolution 도메인으로 매핑
      if (!evolutionUrl) {
        const selfUrl = getSelfUrl(req)
        const selfDomain = new URL(selfUrl).hostname

        // soft-evo-games.com 도메인을 evo-games.com으로 변환
        // babylonrdi.soft-evo-games.com → babylonvg.evo-games.com
        const evolutionDomain = selfDomain.replace(/([a-z]+)[a-z]{3}\.soft-evo-games\.com/, 'babylonvg.evo-games.com')
        evolutionUrl = `https://${evolutionDomain}`
        console.log(`🔄 Akamai POST - Mapped domain: ${selfDomain} → ${evolutionDomain}`)
      }

      if (evolutionUrl == null) {
        console.log('⚠️ POST without session/origin - returning OK:', req.url.substring(0, 100))
        return 'OK'
      }

      // POST body 처리: fake-node 도메인을 Evolution 도메인으로 교체
      let bodyToSend = req.body
      if (req.body) {
        const selfUrl = getSelfUrl(req)
        const fakeNodeDomain = new URL(selfUrl).hostname
        const evolutionDomain = new URL(evolutionUrl).hostname

        if (typeof req.body === 'string') {
          const originalBody = req.body
          // fake-node 도메인을 Evolution 도메인으로 교체 (정확한 도메인 매칭)
          bodyToSend = originalBody.replace(new RegExp(fakeNodeDomain.replace(/\./g, '\\.'), 'gi'), evolutionDomain)

          // Akamai 텔레메트리 요청인 경우 로깅 (173자 이상의 obfuscated URL)
          if (req.url.length > 100 && req.url.split('/').length <= 2) {
            console.log('🔧 Akamai POST - Domain replacement:')
            console.log('   URL:', req.url.substring(0, 80) + '...')
            console.log(`   ${fakeNodeDomain} -> ${evolutionDomain}`)
            console.log('   Original body preview:', originalBody.substring(0, 150))
            console.log('   Replaced body preview:', (typeof bodyToSend === 'string' ? bodyToSend : JSON.stringify(bodyToSend)).substring(0, 150))
          }
        } else if (typeof req.body === 'object') {
          // 객체인 경우 JSON 문자열로 변환 후 교체
          const jsonStr = JSON.stringify(req.body)
          bodyToSend = jsonStr.replace(new RegExp(fakeNodeDomain.replace(/\./g, '\\.'), 'gi'), evolutionDomain)
        }
      }

      const res = await callEvo(`${evolutionUrl}${req.url}`, {
        headers: req.headers,
        method: 'POST',
        body: bodyToSend,
        evolutionUrl: evolutionUrl,
      })
      await reply.header('Content-Type', res.recvHeaders['content-type']).status(res.status).send(res.data)
    } catch (err) {
      console.log(errorToString(err))
      if (err.response != null) {
        return await reply.status(err.response.status).send(err.response.data)
      }
    }
  })
}
