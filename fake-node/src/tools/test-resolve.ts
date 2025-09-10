import { config } from './config'
import { UserSQL } from '@service/src/lib/interface/sql'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { settleGame } from '../common/settle'
import { AuthManager } from '@service/src/lib/common/game/auth-manager'
import { CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'

const mainSQL = new UserSQL(config.RDB_OPTIONS)
const mongoBet = new MongoBet(config.MONGO_OPTIONS)

const authManager = new AuthManager(mainSQL)
const casinoManager = new CasinoTransactionManager(mongoBet, mainSQL)

async function main() {
  await mainSQL.connect()
  await mongoBet.connect()

  const gameData = await mongoBet.fakeGameData.findOne({ where: { gameId: '172aff15f5491d8d6dfe9375' } })

  await settleGame(mongoBet, authManager, casinoManager, gameData).catch((err) => {
    console.log(`error workerNumber : ${process.pid}`)
    console.log(err)
  })
}

main()
