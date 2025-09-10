import fastify, { type FastifyServerOptions } from 'fastify'

import cors from '@fastify/cors'

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

  await instance.register(cors, {
    origin: '*',
    // 이게 있어야
    // allowedHeaders: ['x-fingerprint'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })

  instance.get('/', (req, reply) => {
    return { hello: 'route' }
  })

  instance.get('/info', (req, reply) => {
    const res = JSON.stringify({ headers: req.headers, body: req.body, query: req.query })
    console.log('index_route', res)
    return JSON.parse(res)
  })

  instance.get('/health', async (req, reply) => {
    // console.log('health_check')
    return 'OK'
  })

  console.log('createApp End')

  return await instance
}

export async function initApp() {
  const promises = [createApp()]

  const [app] = await Promise.all(promises)

  return app
}
