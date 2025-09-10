import { MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import { default_mongo_options, default_rdb_options } from './default'

export const mongo_options = {
  ...default_mongo_options,
  host: '3.115.218.82',
  port: 19123,
  username: 'mindu',
  password: '1234!',
  authSource: 'admin',
} as MongoConnectionOptions

export const rdb_options = {
  ...default_rdb_options,
  host: 'pluto-prod-db.cluster-codvse50t2kr.ap-northeast-1.rds.amazonaws.com',
  port: 4412,
  username: 'mindu',
  password: 'IncludeInclude12!!',
} as MysqlConnectionOptions
