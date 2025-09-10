import { addHours, addMinutes } from 'date-fns'
import { mongoBet } from '../app'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { getTableInfo } from '../util'
import { type EvolutionHistoryItem, type EvolutionHistoryParticipant } from '@service/src/vendor/evolution/interface'
import { crawlEvolutionGameHistoryItem, crawlEvolutionGameHistoryList } from '../../common/evolution-api'
import { evolution } from '../../common/fake-vendors'
import { errorToString, sleep } from '../../common/util'

const vendorCode = VendorCode.FakeChoi_Evolution

const searchBeginTimeAgo = 20

const searchOldestBeginTimeAgo = 120
// const searchOldestBeginTimeAgo = 480

export async function GetEvolutionHistory(): Promise<BetDataCasino[]> {
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

  console.log(`crawl evolution item ${oldestDetails.summaryId} ${oldestDetails.betTime.toString()}`)

  try {
    console.log(`crawl evolution history ${beginDate.toString()} ${endDate.toString()}`)

    let rawHistoryArr: EvolutionHistoryItem[]
    for (let i = 0; i < 5; i++) {
      rawHistoryArr = await crawlEvolutionGameHistoryList(evolution.env, beginDate, endDate)
      if (rawHistoryArr != null) {
        break
      }
    }
    if (rawHistoryArr == null) {
      return []
    }

    const rawHistorys: Record<
      string,
      {
        item: EvolutionHistoryItem
        participant: EvolutionHistoryParticipant
      }
    > = {}
    for (const item of rawHistoryArr) {
      for (const participant of item.participants) {
        if (participant.playerGameId == null) {
          console.log('participant.playerGameId is null', JSON.stringify(participant))
          continue
        }
        const username = participant.playerId

        const roundId = participant.playerGameId.split('-')[0]

        const summaryId = `${vendorCode}-${item.table.id}-${roundId}`

        const searchId = `${username}-${summaryId}`
        rawHistorys[searchId] = {
          item,
          participant,
        }
      }
    }

    const results: BetDataCasino[] = []

    // for (const detail of details) {
    for (let i = 0; i < details.length; i++) {
      try {
        const detail = details[i]
        const { agentCode, userId, summaryId } = detail

        const username = agentCode + userId

        const searchId = `${agentCode}${userId}-${summaryId}`

        const rawHistory = rawHistorys[searchId]

        if (rawHistory == null) {
          if (detail.betStatus !== 'CANCEL') {
            continue
          }
        } else {
          detail.tableName = rawHistory.item.table.name

          const { player, banker } = rawHistory.item.result ?? {}

          detail.content = {
            result: {
              ...(player != null && { player }),
              ...(banker != null && { banker }),
              result: rawHistory.item.result,
            },
            participants: [rawHistory.participant],
          }
        }

        results.push(detail)

        console.log(`evolution history`, i, details.length, username, summaryId)
      } catch (ex) {
        console.log(ex)
      }
    }
    return results
  } catch (ex) {
    console.log('GetEvolutionHistory Error', errorToString(ex))
  }
  return []
}

export async function GetOldestEvolutionHistory(): Promise<BetDataCasino[]> {
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
    take: 20,
  })

  const oldestDetails = details[0]

  if (oldestDetails == null) {
    return []
  }

  const beginDate = oldestDetails.betTime

  const newestDetails = details[details.length - 1]

  const endDate = newestDetails.betTime

  console.log(`oldest crawl evolution item ${oldestDetails.summaryId} ${oldestDetails.betTime.toString()}`)

  try {
    console.log(`oldest crawl evolution history ${beginDate.toString()} ${endDate.toString()}`)

    const results: BetDataCasino[] = []

    for (const detail of details) {
      try {
        const { agentCode, userId, summaryId } = detail

        const username = agentCode + userId

        const rawHistory = await crawlEvolutionGameHistoryItem(evolution.env, detail)

        await sleep(1000)

        if (rawHistory == null) {
          continue
        }
        detail.tableName = rawHistory.table.name

        const { player, banker } = rawHistory.result ?? {}

        detail.content = {
          result: {
            ...(player != null && { player }),
            ...(banker != null && { banker }),
            result: rawHistory.result,
          },
          participants: rawHistory.participants,
        }

        results.push(detail)

        console.log(
          `evolution history data ${username} ${summaryId} ${rawHistory.table.name} ${JSON.stringify(rawHistory.result)}`,
        )
      } catch (ex) {
        console.log(ex)
      }
    }
    return results
  } catch (ex) {
    console.log('GetOldestEvolutionHistory Error', errorToString(ex))
  }
  return []
}

export async function GetOldestEvolutionHistoryWithoutDetail(): Promise<BetDataCasino[]> {
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
