import { mongo_options, rdb_options } from '@service/src/connections/prod'
import { type ConfigData } from '.'

export default {
  ENV: 'prod-local',

  PORT: 80,

  fakeDragonTiger: false,
  fakeDoubleBet: false,
  fake100Percent: false,

  FASTIFY_OPTIONS: {
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
  },

  SELF_URL: 'https://localhost',

  VIDEO_HOST: 'localhost:4000',

  // synchronize를 끄는 이유는 AWS Lambda 콜드 런치시에 끌 때는 1.5초에서 2초 사이로 걸리는데 켜면 4초 정도로 시간차이가 많이 나서 끔

  MONGO_OPTIONS: {
    ...mongo_options,
    synchronize: false,
    // entities: mongo_use_entities,
  },

  RDB_OPTIONS: {
    ...rdb_options,
    synchronize: false,
    // entities: rdb_use_entities,
  },
} as ConfigData
