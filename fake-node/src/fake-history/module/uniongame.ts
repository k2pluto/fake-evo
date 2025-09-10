import { addHours, addMinutes } from 'date-fns'
import { mongoBet } from '../app'
import { querystring } from '../../common/util'
import axios from 'axios'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { type UnionGameHistoryItem, type UnionGameTransactionPacket } from '@service/src/vendor/union-game/interface'
import { getTableInfo } from '../util'

const vendorCode = VendorCode.FakeUnionGame_Cool_Evolution

async function crawlUnionGameHistory(begin: Date, end: Date) {
  try {
    console.log(begin)

    const data = querystring({
      vendorKey: 'evolution_casino',
      beginDate: addMinutes(begin, -1).toISOString(),
      // endDate: end.toISOString(),
      limit: 2000,
    })

    const url = `https://api.uniongame.org/transaction/details`
    // const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
    axios.defaults.timeout = 60000

    console.log(url)

    const res = await axios.post(url, data, {
      headers: {
        'k-username': 'cool',
        'k-secret': '7d55acaba1a6b4c846ba0b894c1fa3da',
        'User-agent': 'Mozilla',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const packet = res.data as UnionGameTransactionPacket
    console.log(`transaction details result code ${packet.code} length ${packet.length}`)

    return packet.details
  } catch (err) {
    console.log(err.toString())
  }

  return []
}

export async function getUnionGameHistory(transactionKey: string) {
  try {
    const data = querystring({
      transactionKey,
    })

    const url = `https://api.uniongame.org/games/detail`
    // const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
    axios.defaults.timeout = 60000

    console.log(url)

    const res = await axios.post(url, data, {
      headers: {
        'k-username': 'cool',
        'k-secret': '7d55acaba1a6b4c846ba0b894c1fa3da',
        'User-agent': 'Mozilla',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const packet = res.data as {
      code: number
      data: string
    }

    const evolutionRes = await axios.get(packet.data)

    const evolutionHistory = evolutionRes.data
    console.log(`transaction details result code ${JSON.stringify(packet)}`)

    return evolutionHistory
  } catch (err) {
    console.log(err.toString())
  }
}

const searchBeginTimeAgo = 20

const searchOldestBeginTimeAgo = 120
// const searchOldestBeginTimeAgo = 400

export async function GetUnionGameHistory(): Promise<BetDataCasino[]> {
  const now = new Date()

  const searchBeginTime = addMinutes(now, -searchBeginTimeAgo)
  const searchEndTime = addMinutes(now, -8)

  const details = await mongoBet.betDataCasino.find({
    where: {
      betTime: { $gte: searchBeginTime, $lt: searchEndTime } as any,
      betStatus: { $ne: 'BET' } as any,
      historyStatus: { $in: ['DO', 'WAIT'] } as any,
      vendor: vendorCode,
      isFakeBet: null,
    },
    order: { betTime: 1 },
    take: 1000,
  })

  const oldestDetails = details[0]

  if (oldestDetails == null) {
    return []
  }

  const beginDate = oldestDetails.betTime

  const newestDetails = details[details.length - 1]

  const endDate = newestDetails.betTime

  console.log(`crawl uniongameoldest item ${oldestDetails.summaryId} ${oldestDetails.betTime.toString()}`)

  try {
    console.log(`crawl uniongame history ${beginDate.toString()} ${endDate.toString()}`)
    const rawHistoryArr = await crawlUnionGameHistory(beginDate, endDate)

    const rawHistorys: Record<string, UnionGameHistoryItem> = {}
    for (const i of rawHistoryArr) {
      const participant = i.detail.participants[0]
      const username = participant.playerId.substring(5).toLowerCase()

      const roundId = participant.playerGameId.split('-')[0]

      const summaryId = `${vendorCode}-${i.detail.table.id}-${roundId}`

      const searchId = `${username}-${summaryId}`
      rawHistorys[searchId] = i
    }

    const results: BetDataCasino[] = []

    for (const detail of details) {
      try {
        const { agentCode, userId, summaryId } = detail

        const username = agentCode + userId

        const searchId = `${agentCode}${userId}-${summaryId}`

        const rawHistory = rawHistorys[searchId]

        if (rawHistory == null) {
          if (detail.betStatus !== 'CANCEL') {
            continue
          }
        } else {
          detail.tableName = rawHistory.detail.table.name

          const { player, banker } = rawHistory.detail.result ?? {}

          detail.content = {
            result: {
              ...(player != null && { player }),
              ...(banker != null && { banker }),
              result: rawHistory.detail.result,
            },
            participants: rawHistory.detail.participants,
          }
        }

        results.push(detail)

        console.log(`uniongame history ${username} ${summaryId}`)
      } catch (ex) {
        console.log(ex)
      }
    }
    return results
  } catch (ex) {
    console.log('crawlSwixHistory Error')
    console.log(ex?.response?.data)
  }
  return []
}

export async function GetOldestUnionGameHistory(): Promise<BetDataCasino[]> {
  const now = new Date()

  const searchBeginTime = addMinutes(now, -searchOldestBeginTimeAgo)
  const searchEndTime = addMinutes(now, -searchBeginTimeAgo)

  const details = await mongoBet.betDataCasino.find({
    where: {
      betTime: { $gte: searchBeginTime, $lt: searchEndTime } as any,
      betStatus: { $ne: 'BET' } as any,
      historyStatus: { $in: ['DO', 'WAIT'] } as any,
      vendor: vendorCode,
      isFakeBet: null,
    },
    order: { betTime: 1 },
    take: 1000,
  })

  const oldestDetails = details[0]

  if (oldestDetails == null) {
    return []
  }

  const beginDate = oldestDetails.betTime

  const newestDetails = details[details.length - 1]

  const endDate = newestDetails.betTime

  console.log(`crawl uniongameoldest item ${oldestDetails.summaryId} ${oldestDetails.betTime.toString()}`)

  try {
    console.log(`crawl uniongame history ${beginDate.toString()} ${endDate.toString()}`)
    const rawHistoryArr = await crawlUnionGameHistory(beginDate, endDate)

    const rawHistorys: Record<string, UnionGameHistoryItem> = {}
    for (const i of rawHistoryArr) {
      const participant = i.detail.participants[0]
      const username = participant.playerId.substring(5).toLowerCase()

      const roundId = participant.playerGameId.split('-')[0]

      const summaryId = `${vendorCode}-${i.detail.table.id}-${roundId}`

      const searchId = `${username}-${summaryId}`
      rawHistorys[searchId] = i
    }

    const results: BetDataCasino[] = []

    for (const detail of details) {
      try {
        const { agentCode, userId, summaryId } = detail

        const username = agentCode + userId

        const searchId = `${agentCode}${userId}-${summaryId}`

        const rawHistory = rawHistorys[searchId]

        if (rawHistory == null) {
          if (detail.betStatus !== 'CANCEL') {
            continue
          }
        } else {
          detail.tableName = rawHistory.detail.table.name

          const { player, banker } = rawHistory.detail.result ?? {}

          detail.content = {
            result: {
              ...(player != null && { player }),
              ...(banker != null && { banker }),
              result: rawHistory.detail.result,
            },
            participants: rawHistory.detail.participants,
          }
        }

        results.push(detail)

        console.log(`uniongame history ${username} ${summaryId}`)
      } catch (ex) {
        console.log(ex)
      }
    }
    return results
  } catch (ex) {
    console.log('crawlSwixHistory Error')
    console.log(ex?.response?.data)
  }
  return []
}

export async function GetOldestUnionGameHistoryWithoutDetail(): Promise<BetDataCasino[]> {
  const now = new Date()

  const searchBeginTime = addHours(now, -24)
  const searchEndTime = addMinutes(now, -searchOldestBeginTimeAgo)

  const details = await mongoBet.betDataCasino.find({
    where: {
      betTime: { $gte: searchBeginTime, $lt: searchEndTime } as any,
      betStatus: { $ne: 'BET' } as any,
      historyStatus: { $in: ['DO', 'WAIT'] } as any,
      vendor: vendorCode,
      isFakeBet: null,
    },
    order: { betTime: 1 },
    take: 1000,
  })

  if (details.length === 0) {
    return []
  }

  const oldestDetails = details[0]
  console.log(`crawl oldest detail ${oldestDetails.summaryId}`)

  try {
    const results: BetDataCasino[] = []

    for (const detail of details) {
      try {
        const { agentCode, userId, summaryId } = detail

        const username = agentCode + userId

        if (detail.betStatus !== 'SETTLE') {
          continue
        }

        const tableInfo = await getTableInfo(detail.tableId)

        if (detail.tableName == null) {
          detail.tableName = tableInfo.name
        }

        if (detail.content == null) {
          detail.content = 'empty'
        }

        results.push(detail)

        console.log(`oldest history without detail ${username} ${summaryId}`)
      } catch (ex) {
        console.log(ex)
      }
    }
    return results
  } catch (ex) {
    console.log('crawl Oldest History Error')
    console.log(ex?.response?.data)
  }
  return []
}
