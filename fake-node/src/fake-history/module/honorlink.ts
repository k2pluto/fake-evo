import { addDays, addHours, addMinutes } from 'date-fns'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { mongoBet } from '../app'
import { type EvolutionHistoryItem } from '@service/src/vendor/evolution/interface'
import { type HonorLinkTransaction } from '../types'
import { getUserInfo } from '../../common/util'
import axios from 'axios'

const vendorCode = VendorCode.FakeHonorSocket_Evolution

const memHistroy = {}

export async function GetHonorLinkHistory(): Promise<BetDataCasino[]> {
  const now = new Date()

  const hourAgo = addHours(now, -1)
  const minuteAgo = addMinutes(now, -8)

  const oldestDetails = await mongoBet.betDataCasino.findOne({
    where: {
      betTime: { $gte: hourAgo, $lt: minuteAgo } as any,
      historyStatus: { $in: ['DO', 'WAIT'] } as any,
      vendor: vendorCode,
      isFakeBet: null,
    },
    order: { betTime: 1 },
  })

  if (oldestDetails == null) {
    return []
  }

  const beDate = oldestDetails.betTime

  const enDate = minuteAgo

  const newBets: HonorLinkTransaction[] = []
  let skip = 1
  for (;;) {
    try {
      const newUrl = `https://api.honorlink.org/api/transactions?start=${beDate
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19)}&end=${enDate
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19)}&perPage=1000&page=${skip}&withDetails=1`
      console.log(`${newUrl}`)

      const result = (await axios
        .get(newUrl, {
          headers: {
            Authorization: `Bearer HzXz62mp3HZsInwTFVnJvlfsJfjZzxuFmG7bvklS`,
            Accept: 'application/json',
          },
        })
        .then((response: any) => response.data.data)) as HonorLinkTransaction[]

      newBets.push(...result)

      if (result.length < 1000) {
        break
      }
      skip += 1
    } catch (ex) {
      console.log('HonorLink')
      console.log(ex?.response?.data)
      break
    }
  }

  const results: any = []
  const wins = newBets.filter((s) => s.type === 'win')

  console.log(`honorlink crawl ${beDate.toLocaleString()} ${enDate.toLocaleString()} length : ` + wins.length)

  for (const win of wins) {
    try {
      const { details, user, external } = win
      const [round] = details.game.round.split('-')

      const summaryId = `${vendorCode}-${details?.game?.id}-${round}`

      if (memHistroy[`${user.username}-${summaryId}`] != null) {
        continue
      }

      const { agentCode, userId } = getUserInfo(user.username)

      const detailInfo = await mongoBet.betDataCasino.findOne({
        where: {
          // betTime: { $lt: minuteAgo },
          vendor: vendorCode,
          summaryId,
          agentCode,
          userId,
        },
      })
      /* if (details?.game.title.indexOf('Baccarat') === -1) {
          console.log(`fhsvo-${details?.game?.id}-${round}`)
        } */
      if (detailInfo == null) {
        continue
      }

      if (detailInfo.historyStatus !== 'DO' && detailInfo.historyStatus !== 'WAIT') {
        continue
      }
      if (detailInfo.isFakeBet) {
        continue
      }

      detailInfo.tableId = details?.game.id
      detailInfo.tableName = details?.game.title

      console.log(`honorlink history ${user.username} ${detailInfo.tableName} ${summaryId}`)

      // console.log(`assign external participants ${user.username} ${summaryId}`)
      detailInfo.content = {
        participants: external?.detail?.data?.participants,
        result: external?.detail?.data?.result,
      }

      results.push(detailInfo)
      memHistroy[`${user.username}-${summaryId}`] = true
    } catch (ex) {
      console.log(ex)
    }
  }
  return results
}

export async function GetOldestHonorLinkHistory(): Promise<BetDataCasino[]> {
  const now = new Date()
  const dayAgo = addDays(now, -1)
  const hourAgo = addHours(now, -1)

  const oldestDetails = await mongoBet.betDataCasino.find({
    where: {
      // historyStatus: { $in: ['DO', 'WAIT'] },
      betTime: { $gte: dayAgo, $lt: hourAgo } as any,
      historyStatus: { $in: ['DO', 'WAIT'] } as any,
      vendor: vendorCode,
      isFakeBet: null,
      // historyStatus: { $in: ['DO', 'WAIT'] },
    },
    take: 500,
    order: { betTime: 1 },
  })

  const results = []

  for (const oldestDetail of oldestDetails) {
    try {
      const transaction = oldestDetail.packet?.[1]?.transaction

      const username = oldestDetail.agentCode + oldestDetail.userId

      console.log(`try oldest honorlink history ${username} ${oldestDetail.tableName} ${oldestDetail.summaryId}`)

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
        oldestDetail.tableId = transactionData.table.id
        oldestDetail.tableName = transactionData.table.name

        console.log(`assign content honorlink history ${username} ${oldestDetail.tableName} ${oldestDetail.summaryId}`)

        oldestDetail.content = {
          participants: transactionData?.participants,
          result: transactionData?.result,
        }
      }
      oldestDetail.debug = 'TransactionHistory'

      results.push(oldestDetail)
    } catch (ex) {
      console.log('GetOldestHonorLinkHistory Error')
      console.log(ex.toString())
      console.log(ex?.response?.data)
    }
  }

  return results
}
