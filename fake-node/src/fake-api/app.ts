import fastify, { type FastifyInstance } from 'fastify'
import type { FastifyCookieOptions } from '@fastify/cookie'
import fastifyCookie from '@fastify/cookie'

import websocket from '@fastify/websocket'
import cors from '@fastify/cors'
// import { readFileSync } from 'fs'
import { readFile } from 'fs-extra'
import parser from 'ua-parser-js'

import { defaultAppRouter, registerV2Controller } from './module/v2.controller'

import { config } from './config'
import { PartialSQL } from '@service/src/lib/interface/sql'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { AuthManager } from '@service/src/lib/common/game/auth-manager'
import { CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { type SocketData } from './websocket/socket-data'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { connectionListener } from './websocket/connection-listener'
import { errorToObj, formatMemoryUsage } from '../common/util'
import { deleteOldGameResult } from './websocket/util'
import { connectionVideo } from './websocket/connection-video'

export const mongoDB = new MongoBet(config.MONGO_OPTIONS)
// export const mainSQL = new UserSQL(config.RDB_OPTIONS)
export const mainSQL = new PartialSQL(config.RDB_OPTIONS, ['user', 'agent', 'agentGameTypeSetting'])

export const authManager = new AuthManager(mainSQL)
export const casinoManager = new CasinoTransactionManager(mongoDB, mainSQL)

export let r2File = ''

// export let globalBrowser: puppeteer.Browser

export const vendorCode = config.FAKE_VENDOR ?? VendorCode.FakeChoi_Evolution

console.log('FAKE_VENDOR : ' + config.FAKE_VENDOR)
console.log('EVOLUTION_URL : ' + config.EVOLUTION_URL)
console.log('vendorCode : ' + vendorCode)
console.log('VERSION : ' + 1.4)

export const connections: Record<string, SocketData> = {}

export async function createApp() {
  const instance = fastify({
    ...config.FASTIFY_OPTIONS,
    ...(config.https && {
      https: {
        cert: await readFile('./key/cert.pem'),
        key: await readFile('./key/private.pem'),
      },
    }),
  })

  await instance.register(cors, {
    origin: '*',
    // 이게 있어야
    // allowedHeaders: ['x-fingerprint'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
  await instance.register(websocket)

  /* const staticDir = path.join(cwd(), 'public/frontend')
  console.log(staticDir)

  instance.register(fastifyStatic, {
    root: staticDir,
    prefix: '/frontend/', // optional: default '/'
  }) */

  /* instance.get('/', (req, reply) => {
    return 'OK'
  }) */

  instance.get('/health', (req, reply) => {
    return 'OK'
  })
  instance.get('/stats', (req, reply) => {
    return {
      rss: formatMemoryUsage(process.memoryUsage().rss),
      connectionLength: Object.keys(connections).length,
    }
  })
  instance.get('/config_dkananswk', (req, reply) => {
    return {
      SELF_URL: config.SELF_URL,
      proxyVideo: config.proxyVideo,
      fakeDragonTiger: config.fakeDragonTiger,
      fakeDoubleBet: config.fakeDoubleBet,
      fake100Percent: config.fake100Percent,
    }
  })
  instance.get('/connections', (req, reply) => {
    return Object.values(connections).map((value) => ({
      username: value.user == null ? '' : value.user.agentCode + value.user.userId,
      url: value.url,
      type: value.type,
      tableId: value.tableId,
      uuid: value.uuid,
      ip: value.ip,
      connectionTime: value.connectionTime,
      headers: value.headers,
    }))
  })

  instance.addHook('preValidation', async (request, reply) => {
    // check if the request is authenticated
    /* if (!request.isAuthenticated()) {
      await reply.code(401).send("not authenticated");
    } */
    if (!request.ws) {
      return
    }

    let username

    let errorObj

    const { url, headers } = request ?? {}

    try {
      const searchParamStr = url.substring(url.indexOf('?'))
      const params = new URLSearchParams(searchParamStr)

      let sessionId = params.get('EVOSESSIONID') ?? params.get('videoSessionId')?.split('-')[1]
      if (sessionId == null) {
        throw 'invalid sessionId url ' + url
      }

      const loginData = await mongoDB.fakeLoginData.findOne({ where: { sessionId } })
      if (loginData == null) {
        throw 'can not find sessionId ' + sessionId + ' url ' + url
      }

      const authInfo = await authManager.checkAuth(loginData.agentCode + loginData.userId)

      const { user } = authInfo

      if (user == null) {
        throw 'invalid user'
      }

      if (loginData == null) {
        throw 'invalid loginData'
      }

      username = user.agentCode + user.userId

      const blacklistUser = await mongoDB.fakeBlacklistUser.findOne({ where: { username } })
      if (blacklistUser != null) {
        throw 'not allowed user'
      }

      const requestAny = request as any

      requestAny.authInfo = authInfo
      requestAny.loginData = loginData
    } catch (err) {
      errorObj = err
      console.log(JSON.stringify({ where: 'preValidation', ...errorToObj(err), username }))
      await reply.status(403).send(err.toString())
    } finally {
      mongoDB.logFakeConnection
        .save({
          username,
          url,
          ip: (headers['x-forwarded-for'] as string) ?? request.socket.remoteAddress,
          userAgent: parser(headers['user-agent']),
          connectionTime: new Date(),
          ...(errorObj != null && errorToObj(errorObj)),
        })
        .catch((err) => {
          console.log(JSON.stringify({ where: 'logFakeConnection', ...errorToObj(err), username }))
        })
    }
  })

  instance.route({
    method: 'GET',
    url: '/public/*',
    handler: async (req, reply) => {
      // this will handle http requests
      console.log('get handler')
      await reply.send({ hello: 'world' })
    },
    wsHandler: (conn, req) => {
      connectionListener(conn, req).catch((err) => {
        console.log(err)
      })
      // connectionListener2(conn.socket, req)
    },
  })
  instance.route({
    method: 'GET',
    url: '/app/*',
    handler: defaultAppRouter,
    wsHandler: (conn, req) => {
      connectionVideo(conn, req).catch((err) => {
        console.log(err)
      })
      // connectionListener2(conn.socket, req)
    },
  })

  await instance.register(fastifyCookie, {
    secret: 'my-secret', // for cookies signature
    parseOptions: {}, // options for parsing cookies
  } as FastifyCookieOptions)

  registerV2Controller(instance)

  setInterval(() => {
    deleteOldGameResult()
  }, 10000)

  console.log('createApp End')

  return await instance
}

export let isLambda = false

export async function initApp(_isLambda: boolean) {
  isLambda = _isLambda

  const promises = [createApp(), mainSQL.connect(), mongoDB.connect()]

  const [app] = await Promise.all(promises)

  //r2File = await readFile('./public/r2.html', 'utf-8')

  // puppeteer 로는 cloudflare 가 안뚫리거나 시간이 오래 걸림
  /* globalBrowser = await puppeteer.launch({
    ...(process.env.DEBUG_MODE == null
      ? { executablePath: '/usr/bin/chromium-browser', headless: 'new' }
      : { headless: false }),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  }) // ❶ 헤드리스 브라우저 실행 */

  return app as FastifyInstance
}
