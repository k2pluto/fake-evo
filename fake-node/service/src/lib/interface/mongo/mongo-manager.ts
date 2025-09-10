import { DataSource } from 'typeorm'
import { type MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'

export class MongoManager {
  options: MongoConnectionOptions

  // dbConnection: Connection
  dbConnection: DataSource

  async postConnect() {
    // do nothing
  }

  async connect(options?: MongoConnectionOptions) {
    this.options = { ...this.options, ...options }
    console.log(`Mongo Connect : ${this.options.host}:${this.options.port} - ${this.options.database}`)
    try {
      this.dbConnection = new DataSource(this.options)

      await this.dbConnection.initialize()

      //this.dbConnection = await createConnection(this.options)
      await this.postConnect()
    } catch (ex) {
      console.log(ex)
    }

    console.log(`Mongo Connected : ${this.options.host}:${this.options.port} - ${this.options.database}`)
  }
}
