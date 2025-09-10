import { config } from './config'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { UserSQL } from '@service/src/lib/interface/sql'
import { AuthManager } from '@service/src/lib/common/game/auth-manager'
import { CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'

const mainSQL = new UserSQL(config.RDB_OPTIONS)
const mongoBet = new MongoBet(config.MONGO_OPTIONS)

const authManager = new AuthManager(mainSQL)
const casinoManager = new CasinoTransactionManager(mongoBet, mainSQL)

async function main() {
  await mainSQL.connect()
  await mongoBet.connect()

  const summaryId = 'fhsvo-BacBo00000000001-173244c9dace2957695140ea'

  const userId = 'Nga1234'

  const agentCode = 'bbc'

  const orgTransId = '3536398631'

  const betData = await mongoBet.betDataCasino.findOne({ where: { summaryId, userId, agentCode } })

  if (betData != null) {
    const { user, agent } = await authManager.checkAuth(agentCode + userId)

    const transId = 'c' + new Date().getTime().toString()

    const res = await casinoManager.betCancel({
      info: {
        agent,
        user,
        vendor: VendorCode.FakeHonorSocket_Evolution,
        roundId: betData.roundId,
        gameId: betData.gameId,
        tableId: betData.tableId,
      },
      transId: transId,
      orgTransId: orgTransId,
      betId: orgTransId,
      packet: 'MANUAL CANCEL',
    })
    console.log(res)
  }
}

main()
