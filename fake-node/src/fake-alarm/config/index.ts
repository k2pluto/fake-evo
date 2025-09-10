import TEST from './test'
import PROD from './prod'
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import { MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'
export interface ConfigData {
  ENV: string

  PORT: number

  DG_AGENT: string

  RDB_OPTIONS: MysqlConnectionOptions

  MONGO_OPTIONS: MongoConnectionOptions
}

console.log('STAGE_ENV : ' + process.env.STAGE_ENV)

const rawConfig: ConfigData = {} as any

if (process.env.STAGE_ENV === 'test') {
  Object.assign(rawConfig, TEST)
} else if (process.env.STAGE_ENV === 'prod') {
  Object.assign(rawConfig, PROD)
} else if (process.env.STAGE_ENV === 'swix') {
  Object.assign(rawConfig, PROD)
} else if (process.env.STAGE_ENV === 'honorlink') {
  Object.assign(rawConfig, PROD)
}

export const config: ConfigData = rawConfig
