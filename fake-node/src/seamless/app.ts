import fastify, { type FastifyServerOptions, type FastifyInstance } from 'fastify'
import formBody from '@fastify/formbody'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { v4 } from 'uuid'
import { cwd } from 'process'
import { type MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import { type MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'

import { config } from './config'
import { PartialSQL } from '@service/src/lib/interface/sql'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { AuthManager } from '@service/src/lib/common/game/auth-manager'
import { CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { registerFakeSwixController } from './module/fake-cx.controller'
import { registerFakeHonorController } from './module/fake-honor.controller'
import { ServerType } from '@service/src/lib/interface/mongo/data-server-info'
import { formatMemoryUsage } from '../common/util'
import { registerFakeAlphaController } from './module/fake-alpha.controller'
import { registerFakeUnionController } from './module/fake-union.controller'
import { registerFakeEvolutionChoiController } from './module/fake-evolution.choi.controller'

export const mongoDB = new MongoBet(config.MONGO_OPTIONS)
// export const mainSQL = new UserSQL(config.RDB_OPTIONS)
export const mainSQL = new PartialSQL(config.RDB_OPTIONS, ['user', 'agent', 'agentGameTypeSetting'])

export const authManager = new AuthManager(mainSQL)
export const casinoManager = new CasinoTransactionManager(mongoDB, mainSQL)

export const r2File = ''

export const appId = v4()

let stop = false

export async function createApp() {
  const serverOptions: FastifyServerOptions = {
    logger: {
      serializers: {
        res(reply) {
          // The default
          return {
            statusCode: reply.statusCode,
            payload: (reply as any).payload,
          }
        },
        req(request) {
          return {
            method: request.method,
            url: request.url,
            ip: request.headers?.['x-forwarded-for'] ?? request.ip,
            path: request.routeOptions.url,
            parameters: request.params,
            // Including the headers in the log could be in violation
            // of privacy laws, e.g. GDPR. You should use the "redact" option to
            // remove sensitive fields. It could also leak authentication data in
            // the logs.
            body: request.body,
            headers: request.headers,
          }
        },
      },
    },
  }
  const instance = fastify(serverOptions)

  instance.addHook('preHandler', function (req, reply, done) {
    req.log.info({ body: req.body, ip: req.headers?.['x-forwarded-for'] ?? req.ip }, 'preHandler')
    done()
  })

  instance.addHook('onSend', function (_request, reply, payload, next) {
    const replyAny = reply as any
    replyAny.payload = payload

    next()
  })

  instance.register(formBody)

  await instance.register(cors, {
    origin: '*',
    // 이게 있어야
    // allowedHeaders: ['x-fingerprint'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })

  const staticDir = path.join(cwd(), 'public/frontend')
  console.log(staticDir)

  instance.register(fastifyStatic, {
    root: staticDir,
    prefix: '/frontend/', // optional: default '/'
  })

  instance.get('/', (req, reply) => {
    console.log('index route')
    return { hello: 'world' }
  })

  instance.get('/stats', (req, reply) => {
    return {
      appId,
      rss: formatMemoryUsage(process.memoryUsage().rss),
    }
  })

  instance.get('/stop', (req, reply) => {
    stop = true
    return 'OK'
  })

  instance.get('/health', async (req, reply) => {
    console.log('index route')
    if (stop) {
      throw 'app is stoped'
    }
    await mongoDB.serverInfo.updateOne(
      { _id: appId },
      {
        $set: {
          type: ServerType.FakeSeamless,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
      },
    )
    return 'OK'
  })

  registerFakeSwixController(instance)
  registerFakeHonorController(instance)
  registerFakeAlphaController(instance)
  registerFakeUnionController(instance)
  registerFakeEvolutionChoiController(instance)

  console.log('createApp End')

  return await instance
}

export async function initDb({
  rdbOptions,
  mongoOptions,
}: {
  rdbOptions?: MysqlConnectionOptions
  mongoOptions?: MongoConnectionOptions
}) {
  const promises = [mainSQL.connect(rdbOptions), mongoDB.connect(mongoOptions)]

  await Promise.all(promises)
}

export async function initApp() {
  const promises = [createApp(), mainSQL.connect(), mongoDB.connect()]

  const [app] = await Promise.all(promises)

  return app as FastifyInstance
}
