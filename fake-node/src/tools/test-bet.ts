import { config } from './config'
import { v4 as uuidv4 } from 'uuid'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { UserSQL } from '@service/src/lib/interface/sql'
import { AuthManager } from '@service/src/lib/common/game/auth-manager'
import { CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { fakeEvolutionDebit } from '../seamless/module/fake-evolution.service'
import { getUserInfo } from '../common/util'

const mainSQL = new UserSQL(config.RDB_OPTIONS)
const mongoBet = new MongoBet(config.MONGO_OPTIONS)

const authManager = new AuthManager(mainSQL)
const casinoManager = new CasinoTransactionManager(mongoBet, mainSQL)

const testUsername = 'bivxxxx55'

async function main() {
  await mainSQL.connect()
  await mongoBet.connect()

  const roundId = new Date().getTime().toString()

  const transId = 'd' + roundId

  const { agentCode, userId } = getUserInfo(testUsername)

  const sid = 'd11358cd-854b-4b45-8efc-b21a0d9ffb53'

  await mainSQL.user.update(
    {
      agentCode,
      userId,
    },
    { gameToken: sid },
  )

  const temp = await fakeEvolutionDebit(authManager, casinoManager, roundId, {
    transaction: {
      id: transId,
      refId: transId,
      amount: 2000,
    },
    sid,
    userId: testUsername,
    uuid: uuidv4(),
    currency: 'KRW',
    game: {
      id: roundId + '-qi4xeqphfpoac2sh',
      type: 'baccarat',
      details: {
        table: {
          id: 'q6ardco6opnfwes4',
          vid: null,
        },
      },
    },
  })

  console.log(temp)
}

main()
