import { errorToString } from './util'
import { type Repository, type BaseEntity, DataSource } from 'typeorm'
import { type MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'

// ConnectionOptions
export class SqlManager<T extends Record<string, typeof BaseEntity>> {
  options: MysqlConnectionOptions

  dbConnection: DataSource

  repos: { [Property in keyof T]: Repository<InstanceType<T[Property]>> }

  entities: T

  constructor(options: MysqlConnectionOptions, entities: T) {
    this.options = { ...options, entities: Object.values(entities) }
    this.entities = entities
  }

  async postConnect() {
    // do nothing

    const repos = {}
    for (const [key, value] of Object.entries(this.entities)) {
      repos[key] = this.dbConnection.manager.getRepository(value)
    }
    this.repos = repos as any
  }

  async connect(options?: MysqlConnectionOptions) {
    this.options = { ...this.options, ...options }
    try {
      //typeorm DataSource 은 getManager('userdb').transaction 사용이 불가능하다.
      //this.dbConnection = await createConnection(this.options)
      this.dbConnection = new DataSource(this.options)
      await this.dbConnection.initialize()
    } catch (err) {
      console.log('sql service coneection error')
      console.log(errorToString(err))
      throw err
    }

    console.log(`SQL Connected : ${this.options.host}:${this.options.port} - ${this.options.database}`)
    await this.postConnect()
  }
}
