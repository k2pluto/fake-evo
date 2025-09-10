import { createConnection, Connection } from 'typeorm'
import { MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'

export class MongoManager {
  options: MongoConnectionOptions

  dbConnection: Connection

  async postConnect() {
    // do nothing
  }

  async connect() {
    try {
      this.dbConnection = await createConnection(this.options)
      await this.postConnect()
    } catch (ex) {
      console.log(ex)
    }

    console.log(`Mongo Connected : ${this.options.host}:${this.options.port} - ${this.options.database}`)
  }
}
