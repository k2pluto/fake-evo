import PROD from './prod'
import { type MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import { type MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'
import { type FastifyServerOptions } from 'fastify'

export interface ConfigData {
  ENV: string

  PORT: number

  FAKE_VENDOR?: string

  FAKE_CONFIG_KEY?: string

  FASTIFY_OPTIONS: FastifyServerOptions

  RDB_OPTIONS: MysqlConnectionOptions

  MONGO_OPTIONS: MongoConnectionOptions
}

console.log('STAGE_ENV : ' + process.env.STAGE_ENV)

const rawConfig: ConfigData = {} as any

if (process.env.STAGE_ENV === 'prod') {
  Object.assign(rawConfig, PROD)
} else if (process.env.STAGE_ENV === 'swix') {
  Object.assign(rawConfig, PROD)
} else if (process.env.STAGE_ENV === 'swix-cider') {
  Object.assign(rawConfig, PROD)
} else if (process.env.STAGE_ENV === 'fake') {
  Object.assign(rawConfig, PROD)
} else if (process.env.STAGE_ENV === 'honorlink') {
  Object.assign(rawConfig, PROD)
} else if (process.env.STAGE_ENV === 'uniongame') {
  Object.assign(rawConfig, PROD)
} else if (process.env.STAGE_ENV === 'fchev') {
  Object.assign(rawConfig, PROD)
}

export const config: ConfigData = rawConfig
