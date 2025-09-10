import { sleep } from '../common/util'
import { config } from './config'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { AuthManager } from '@service/src/lib/common/game/auth-manager'
import { CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { UserSQL } from '@service/src/lib/interface/sql'

const mainSQL = new UserSQL(config.RDB_OPTIONS)
const mongoBet = new MongoBet(config.MONGO_OPTIONS)
const authManager = new AuthManager(mainSQL)
const casinoManager = new CasinoTransactionManager(mongoBet, mainSQL)
/*function testFunc() {
  return new Promise<void>(async (resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, 500)
  })
}*/

function waitSettle() {
  return new Promise<void>(async (resolve) => {
    const agentCode = 'ban'
    const userId = 'kk1223'

    console.log(`waitSettle ${agentCode + userId}`)

    resolve()

    await sleep(5000) // 최대 5분간 기다린다.

    /*await waitSettleByDB({
      mongoDB: mongoBet,
      authManager,
      casinoManager,
      tableId: 'qgdk6rtpw6hax4fe',
      gameId: '1731e4141f5b3aac11a8277b',
      agentCode,
      userId,
    })*/

    resolve()
  })
}

async function main() {
  await mongoBet.connect()
  await mainSQL.connect()

  await waitSettle()

  console.log('main')
}

/*setInterval(() => {
  console.log('interval')
}, 10000) */

main()
