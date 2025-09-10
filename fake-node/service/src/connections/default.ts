import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import { MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'
import { mongo_entities } from '../lib/interface/mongo'
import { mysql_entities } from '../lib/interface/sql'
// import { mongo_casino_entities, mongo_slot_entities } from '../lib/interface/mongo'

export const default_mongo_options: MongoConnectionOptions = {
  type: 'mongodb',
  name: 'apiDB',
  logging: false,
  synchronize: false,
  database: 'apiDB',
  entities: mongo_entities,
}

export const default_rdb_options: MysqlConnectionOptions = {
  type: 'mysql',
  name: 'userdb',
  // logging: true,
  logging: true,
  synchronize: false,
  logger: 'advanced-console',
  database: 'pluto-db',
  entities: mysql_entities,
}
