import { MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import { default_mongo_options, default_rdb_options } from './default'

export const mongo_options = {
  ...default_mongo_options,
  host: '35.77.193.99',
  port: 19123,
  username: 'min',
  password: '1234!',
  authSource: 'admin',
} as MongoConnectionOptions

export const rdb_options = {
  ...default_rdb_options,
  host: 'ganymede-test-db.cluster-codvse50t2kr.ap-northeast-1.rds.amazonaws.com',
  port: 3306,
  username: 'min',
  password: 'Include12!',
} as MysqlConnectionOptions
