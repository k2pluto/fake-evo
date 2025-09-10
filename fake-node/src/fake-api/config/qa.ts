import { mongo_options, rdb_options } from '@service/src/connections/prod'
import { type ConfigData } from '.'

export default {
  ENV: 'qa',

  PORT: 4000,

  FAKE_CONFIG_KEY: 'FAKE_CONFIG_QA',

  FASTIFY_OPTIONS: {
    logger: false,
  },

  fakeDragonTiger: false,
  fakeDoubleBet: false,
  fake100Percent: false,

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
