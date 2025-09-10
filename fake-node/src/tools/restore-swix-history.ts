// import 'source-map-support/register'
// mport 'module-alias/register'

import { config } from './config'
import { cider_cx } from '../common/fake-vendors'
import { crawlSwixHistory, makeUserBets } from '../fake-history/module/swix'
import { ProgressHistory } from '../fake-history/progress-history'
import { MongoBet } from '../../service/src/lib/interface/mongo'
import { VendorCode } from '../../service/src/lib/common/types/vendor-code'
import { BetData } from '../../service/src/lib/interface/mongo/data-bet-data'
import { UserSQL } from '../../service/src/lib/interface/sql'

const mongoBet = new MongoBet(config.MONGO_OPTIONS)
const mainSQL = new UserSQL(config.RDB_OPTIONS)

async function bootstrap() {
  await mongoBet.connect()
  await mainSQL.connect()

  const date = new Date('2024-10-02T11:16:40.630Z')

  const betData = await mongoBet.betDataCasino.find({
    where: {
      agentCode: 'bch',
      vendor: 'cxevc',
      betTime: {
        $gte: date,
      },
    },
  })

  if (betData == null) {
    return
  }

  await crawlSwixHistory(cider_cx.env, date)

  const userBets = makeUserBets(VendorCode.CX_EVOLUTION, 240)

  const results: BetData[] = []

  for (const detail of betData) {
    try {
      const { agentCode, userId, summaryId } = detail

      const username = agentCode + userId

      const searchId = `${username}-${summaryId}`

      const rawHistory = userBets[searchId]

      if (rawHistory == null) {
        if (detail.betStatus !== 'CANCEL') {
          continue
        }
      } else {
        detail.tableName = rawHistory.table_name

        detail.content = {
          result: {
            result: {
              ...rawHistory.game_result,
              outcome: rawHistory.result,
            },
          },
          participants: [
            {
              playerId: rawHistory.player_id,
              bets: Object.values(rawHistory.bets).map((value) => ({
                code: value.bet_code,
                stake: value.bet_amount,
                payout: value.win_amount,
              })),
            },
          ],
        }
      }

      results.push(detail)

      console.log(`swix history ${username} ${summaryId}`)
    } catch (ex) {
      console.log(ex)
    }
  }

  await ProgressHistory(mongoBet, mainSQL, results)

  console.log(betData.length)

  // const newData = vendor.getHistory(betData)

  // console.log(newData)
}
bootstrap().catch((err) => {
  console.log(err)
})
