import { addDays, addHours } from 'date-fns'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'

import { config } from './config'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { UserSQL } from '@service/src/lib/interface/sql'
import axios from 'axios'
import { type EvolutionHistoryItem } from '@service/src/vendor/evolution/interface'

const vendorCode = VendorCode.FakeHonorSocket_Evolution

const mainSQL = new UserSQL(config.RDB_OPTIONS)
const mongoBet = new MongoBet(config.MONGO_OPTIONS)

async function assignHistory() {
  const now = new Date()
  const dayAgo = addDays(now, -1)
  const hourAgo = addHours(now, -1)

  const betDatas = await mongoBet.betDataCasino.find({
    where: {
      // historyStatus: { $in: ['DO', 'WAIT'] },
      betTime: { $gte: dayAgo, $lt: hourAgo },
      vendor: vendorCode,
      'content.participants': null,
      isFakeBet: null,
      // historyStatus: { $in: ['DO', 'WAIT'] },
    } as any,
  })

  for (const [index, betData] of betDatas.entries()) {
    try {
      console.log(`update ${index} / ${betDatas.length}`)

      const transaction = betData.packet?.[1]?.transaction

      const username = betData.agentCode + betData.userId

      console.log(`try honorlink transactions ${username} ${betData.tableName} ${betData.summaryId}`)

      const transaction_id = transaction?.id
      if (transaction_id == null) {
        continue
      }

      const newUrl = `https://api.honorlink.org/api/transaction-detail?transaction_id=${transaction_id}`
      console.log(`${newUrl}`)

      const transactionRes = await axios.get(newUrl, {
        headers: {
          Authorization: `Bearer HzXz62mp3HZsInwTFVnJvlfsJfjZzxuFmG7bvklS`,
          Accept: 'application/json',
        },
      })

      if (transactionRes.data != null && transactionRes.data !== '') {
        const transactionData = transactionRes.data?.data as EvolutionHistoryItem

        console.log(`assign content honorlink history ${username} ${betData.tableName} ${betData.summaryId}`)

        const content = {
          participants: transactionData?.participants,
          result: transactionData?.result,
        }

        await mongoBet.betDataCasino.updateOne(
          {
            _id: betData._id,
          },
          {
            $set: {
              content,
              debug: 'HISTORY_MIGRATION',
            },
          },
        )
      }
    } catch (ex) {
      console.log('GetOldestHonorLinkHistory Error')
      console.log(ex.toString())
      console.log(ex?.response?.data)
    }
  }
}

async function main() {
  await mongoBet.connect()
  await mainSQL.connect()
  await assignHistory()

  console.log('main')
}

/* setInterval(() => {
  console.log('interval')
}, 10000) */

main().catch((err) => {
  console.log(err)
})
