import TEST from './test'
import PROD from './prod'
import QA from './qa'
import PROD_LOCAL from './prod-local'
import { type MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import { type MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'
import { type FastifyServerOptions } from 'fastify'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
// import tls from 'tls'

export interface ConfigData {
  ENV: string

  PORT: number

  FAKE_VENDOR?: string

  FAKE_CONFIG_KEY?: string

  FAKE_PRINT_LOG?: boolean

  FASTIFY_OPTIONS: FastifyServerOptions

  https?: boolean

  fakeDragonTiger: boolean
  fakeDoubleBet: boolean
  fake100Percent: boolean

  proxyVideo?: boolean

  SELF_URL: string

  EVOLUTION_URL?: string

  VIDEO_HOST: string

  RDB_OPTIONS: MysqlConnectionOptions

  MONGO_OPTIONS: MongoConnectionOptions
}

console.log('STAGE_ENV : ' + process.env.STAGE_ENV)

const rawConfig: ConfigData = {} as any

if (process.env.STAGE_ENV === 'test') {
  Object.assign(rawConfig, TEST)
} else if (process.env.STAGE_ENV === 'qa') {
  Object.assign(rawConfig, QA)
} else if (process.env.STAGE_ENV === 'prod') {
  Object.assign(rawConfig, {
    ...PROD,

    FAKE_VENDOR: process.env.FAKE_VENDOR,
  })
} else if (process.env.STAGE_ENV === 'prod-local') {
  Object.assign(rawConfig, PROD_LOCAL)
} else if (process.env.STAGE_ENV === 'remote-prod') {
  Object.assign(rawConfig, {
    ...PROD,

    RDB_OPTIONS: {
      ...PROD.RDB_OPTIONS,

      logging: false,
    },

    FAKE_VENDOR: process.env.FAKE_VENDOR,

    FAKE_PRINT_LOG: false,
    VIDEO_HOST: 'seoa-mdp-e08.evo-games-k.com',

    https: true,

    PORT: process.env.PORT != null ? Number(process.env.PORT) : 443,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'blue') {
  Object.assign(rawConfig, {
    ...PROD,
    proxyVideo: false,
    FAKE_VENDOR: VendorCode.FakeChoi_Evolution,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'green') {
  // tls.DEFAULT_MAX_VERSION = 'TLSv1.2'
  Object.assign(rawConfig, {
    ...PROD,
    FAKE_VENDOR: VendorCode.FakeChoi_Evolution,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'lemon') {
  Object.assign(rawConfig, {
    ...PROD,
    proxyVideo: true,
    SELF_URL: 'https://babylonkrst2.evo-games-k.com',
    EVOLUTION_URL: 'https://babylonvg.evo-games.com',
    VIDEO_HOST: 'seoa-mdp-e08.evo-games-k.com',
    FAKE_VENDOR: VendorCode.FakeCX_Evolution,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'tomato') {
  Object.assign(rawConfig, {
    ...PROD,
    fakeDoubleBet: true,
    proxyVideo: true,
    SELF_URL: 'https://babylond4.evo-games-k.com',
    VIDEO_HOST: 'seoa-mdp-e08.evo-games-k.com',
    FAKE_VENDOR: VendorCode.FakeCX_Evolution,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'korea') {
  Object.assign(rawConfig, {
    ...PROD,
    proxyVideo: true,
    //SELF_URL: 'https://skylinekgon.evo-games-k.com',
    EVOLUTION_URL: 'https://babylonvg.evo-games.com',
    VIDEO_HOST: 'seoa-mdp-e08.evo-games-k.com',
    FAKE_VENDOR: VendorCode.FakeCX_Evolution,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'gold') {
  Object.assign(rawConfig, {
    ...PROD,
    FAKE_VENDOR: VendorCode.FakeUnionGame_Cool_Evolution,
    // FAKE_VENDOR: VendorCode.FakeChoi_Evolution,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'silver') {
  Object.assign(rawConfig, {
    ...PROD,
    FAKE_VENDOR: VendorCode.FakeUnionGame_Cool_Evolution,
    // FAKE_VENDOR: VendorCode.FakeChoi_Evolution,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'grape') {
  Object.assign(rawConfig, {
    ...PROD,
    FAKE_VENDOR: VendorCode.FakeUnionGame_Cool_Evolution,
    fake100Percent: true,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'apple') {
  Object.assign(rawConfig, {
    ...PROD,
    FAKE_VENDOR: VendorCode.FakeUnionGame_Cool_Evolution,
    fake100Percent: true,
  } satisfies ConfigData)
} else if (process.env.STAGE_ENV === 'naver') {
  // tls.DEFAULT_MAX_VERSION = 'TLSv1.2'
  Object.assign(rawConfig, {
    ...PROD,

    RDB_OPTIONS: {
      ...PROD.RDB_OPTIONS,

      logging: false,
    },

    FAKE_VENDOR: VendorCode.FakeChoi_Evolution,

    FAKE_PRINT_LOG: false,

    https: true,

    PORT: 443,
  } satisfies ConfigData)
}

export const config: ConfigData = rawConfig
