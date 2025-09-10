import fastify, { FastifyServerOptions, FastifyInstance } from 'fastify'
import { registerController } from './module/controller'

import { config } from './config'
import { UserSQL } from '@service/src/lib/interface/sql'
import { MongoBet } from '@service/src/lib/interface/mongo'

export const mainSQL = new UserSQL(config.RDB_OPTIONS)
export const mongoBet = new MongoBet(config.MONGO_OPTIONS)

export async function createApp() {
  const serverOptions: FastifyServerOptions = {
    logger: {
      serializers: {
        res(reply) {
          // The default
          return {
            statusCode: reply.statusCode,
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

  instance.get('/', (req, reply) => {
    console.log('index route')
    return { hello: 'world 1018' }
  })

  registerController(instance)

  console.log('createApp End')

  return instance
}

export async function initApp() {
  const promises = [createApp(), mainSQL.connect(), mongoBet.connect()]

  const [app] = await Promise.all(promises)

  return app as FastifyInstance
}
