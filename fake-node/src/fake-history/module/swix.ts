import { addDays, addHours, addMinutes, addSeconds, format } from 'date-fns'
import { mongoBet } from '../app'
import { errorToString, sleep } from '../../common/util'
import axios from 'axios'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'
import { getTableInfo } from '../util'
import { type SwixGameResult, type SwixHitoryItem, type SwixHitoryResponse } from '@service/src/vendor/cx/interface'
import { type CXEnv } from '@service/src/vendor/cx'
import { type FakeGameData } from '@service/src/lib/interface/mongo/fake-game-data'

// import { VendorCode } from '@service/src/lib/common/types/vendor-code'
// import { cx } from '../../common/fake-vendors'
// const vendorCode = VendorCode.FakeCX_Evolution

interface NewSwixHitoryItem extends SwixHitoryItem {
  newDate: Date
}

export const dayBets: Record<
  string,
  {
    rawDatas: Record<string, NewSwixHitoryItem>
    lastKey: number
  }
> = {}

export async function crawlSwixHistory(cxEnv: CXEnv, date: Date) {
  try {
    // const url = `https://cp_log.vedaapi.com/req?opkey=${cx.env.OP_KEY}&thirdpartycode=1&startdate=${startDateStr}&enddate=${endDateStr}`
    // const url = `https://casinolog-sa.vedaapi.com/api?op=${cx.env.OP_KEY}&third=1&log_date=${startDateStr}`
    const dateStr = format(date, 'yyyy-MM-dd')
    // const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
    axios.defaults.timeout = 60000

    // let page = 1
    const dayBet = (dayBets[dateStr] ??= {
      rawDatas: {},
      lastKey: 0,
    })

    let cursor = dayBet.lastKey

    if (dateStr === '2024-05-25' && cursor < 500000) {
      cursor = 500000
    }

    let receiveCount = 0

    for (; ; cursor += 1000) {
      const url = `https://casinolog-sa.vedaapi.com/api?op=${cxEnv.OP_KEY}&third=1&log_date=${dateStr}&cursor=${cursor}`

      const res = await axios.get(url, {})

      const resData = res.data as SwixHitoryResponse

      const { data } = resData

      if (resData.next == null || resData.data == null || resData.data.length === 0) {
        break
      }

      const oldestItem = data[data.length - 1]

      console.log(`crawl_swix_history`, dateStr, cursor, data.length, oldestItem.date)

      for (const rawBet of data) {
        dayBet.rawDatas[rawBet.id] = {
          ...rawBet,
          newDate: new Date(rawBet.date),
        }
      }

      // 이 부분 제대로 되는지 테스트 해야함
      if (oldestItem.id >= dayBet.lastKey) {
        dayBet.lastKey = oldestItem.id
      }

      receiveCount += data.length

      if (data.length < 1000) {
        break
      }
      await sleep(5000)
    }

    console.log(`crawl_swix_history total`, dateStr, receiveCount, dayBet.lastKey)
  } catch (err) {
    console.log(errorToString(err))
  }
}

export function makeUserBets(vendorCode: string, timeoutHour = searchEndHourAgo) {
  const now = new Date()
  const timeoutTime = addHours(now, -timeoutHour)

  const userBets: Record<
    string,
    {
      bets: Record<string, SwixHitoryItem>
      table_code: string // 'gwbaccarat000001'
      table_name: string // 'Golden Wealth Baccarat'
      player_id: string
      result: string // 'Player'
      game_result: SwixGameResult
    }
  > = {}

  const allBets = Object.values(dayBets).flatMap((value) => Object.values(value.rawDatas))

  let deleted = 0
  for (const dayBet of Object.values(dayBets)) {
    for (const rawBet of Object.values(dayBet.rawDatas)) {
      // 시간이 지난 데이터는 삭제
      // 이 부분 제대로 되는지 테스트 해야함
      if (rawBet.newDate.getTime() < timeoutTime.getTime()) {
        delete dayBet.rawDatas[rawBet.id]
        deleted++
        continue
      }

      dayBet.rawDatas[rawBet.id] = rawBet
      const searchId = `${rawBet.player_id}-${vendorCode}-${rawBet.table_code}-${rawBet.round_id}`
      const userBet = (userBets[searchId] ??= {
        bets: {},
        table_name: rawBet.table_name,
        table_code: rawBet.table_code,
        player_id: rawBet.player_id,
        result: rawBet.result,
        game_result: rawBet.game_result,
      })

      userBet.bets[rawBet.id] = rawBet
    }
  }

  if (deleted > 0) {
    console.log('deleted swix old history', allBets.length, deleted)
  }

  return userBets
}

const searchBeginMinuteAgo = 20
const searchEndHourAgo = 4

export async function GetSwixHistory(vendorCode: string, cxEnv: CXEnv): Promise<BetDataCasino[]> {
  const now = new Date()

  const searchBeginTime = addMinutes(now, -searchBeginMinuteAgo)
  // const searchEndTime = addMinutes(now, -5)

  const details = await mongoBet.betDataCasino.find({
    where: {
      // betTime: { $gte: searchBeginTime, $lt: searchEndTime } as any,
      betTime: { $gte: searchBeginTime } as any,
      historyStatus: { $in: ['DO', 'WAIT'] } as any,
      vendor: vendorCode,
      isFakeBet: null,
    },
    order: { betTime: 1 },
    // 마찬가지로 몇가지 아이템들이 안들어 올 때 전체 상세 내역 수신이 지연되어 주석 처리
    // take: 1000,
  })

  const oldestDetails = details[0]

  if (oldestDetails == null) {
    return []
  }

  const crawlBeginTime = oldestDetails.betTime

  const newestDetails = details[details.length - 1]

  const crawlEndTime = newestDetails.betTime

  // 여기서 이게 있으면 몇가지 아이템들이 안들어 올 때 전체 상세 내역 수신이 지연되어 주석 처리
  /*
  const minute10Later = addMinutes(oldestDetails.betTime.getTime(), 10)

  if (crawlEndDate.getTime() > minute10Later.getTime()) {
    crawlEndDate = minute10Later
  } */

  try {
    console.log(`get swix history ${crawlBeginTime.toString()} ${crawlEndTime.toString()}`)

    const now = new Date()

    if (oldestDetails.betTime.getDate() < now.getDate()) {
      // if (0 <= now.getHours() && now.getHours() < 2) {
      await sleep(5000)
      await crawlSwixHistory(cxEnv, addDays(now, -1))
    }

    const userBets = makeUserBets(vendorCode)

    const results: BetDataCasino[] = []

    for (const detail of details) {
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
    return results
  } catch (ex) {
    console.log('crawlSwixHistory Error')
    console.log(ex?.response?.data)
  }
  return []
}

export async function resolveGameHistory(vendorCode: string, cxEnv: CXEnv) {
  // 베팅하고 나서 1분 지나고 60분 이전 꺼만 (베팅 결과가 30분 정도 지연되는게 있어서 이렇게 변경함)
  const now = new Date()
  const startTime = addSeconds(now, -30)
  // const endTime = addMinutes(now, -60)
  const endTime = addHours(now, -searchEndHourAgo)

  const betDatas = await mongoBet.betDataCasino.find({
    where: {
      betStatus: 'BET',
      betTime: { $lte: startTime, $gte: endTime } as any,
      isFakeBet: true,
      vendor: vendorCode,
    },
    order: { betTime: 1 },
  })
  const oldestDetails = betDatas[0]

  if (oldestDetails == null) {
    return
  }

  try {
    if (oldestDetails.betTime.getDate() < now.getDate()) {
      // if (0 <= now.getHours() && now.getHours() < 2) {
      await sleep(3000)
      await crawlSwixHistory(cxEnv, addDays(now, -1))
    }

    const betDatasGroupByRoundId = betDatas.reduce<Record<string, BetDataCasino[]>>((acc, cur) => {
      if (acc[cur.fakeRoundId] == null) {
        acc[cur.fakeRoundId] = []
      }
      acc[cur.fakeRoundId].push(cur)
      return acc
    }, {})

    console.log('resolveBet roundIds', JSON.stringify(Object.keys(betDatasGroupByRoundId)))
    for (const roundId in betDatasGroupByRoundId) {
      const betDatas = betDatasGroupByRoundId[roundId]

      const sampleData = betDatas[0]

      let gameData = await mongoBet.fakeGameData.findOne({
        where: {
          gameId: sampleData.fakeRoundId,
          tableId: sampleData.tableId,
        },
      })

      const userBets = makeUserBets(vendorCode)

      if (
        gameData == null ||
        (gameData.dealing !== 'Finished' &&
          gameData.dealing !== 'Cancelled' &&
          gameData.updatedAt?.getTime() + 20_000 < now.getTime())
      ) {
        // 5분이 지나거나 fakeAmountWin 이 있으면 에볼에서 데이터를 가져와서 처리한다.
        console.log(
          'choiData',
          sampleData.agentCode + sampleData.userId,
          sampleData.summaryId,
          sampleData.fakeAmountWin,
          sampleData.betTime,
          sampleData.updatedAt,
        )
        if (
          (sampleData.fakeAmountWin != null && sampleData.updatedAt.getTime() + 10_000 < now.getTime()) ||
          now.getTime() > sampleData.betTime.getTime() + 60_000 * 5
        ) {
          // 20 분 보다 안들어오면 다른데서 데이터를 가져와 본다.

          const { agentCode, userId, summaryId } = sampleData

          const username = agentCode + userId

          const searchId = `${username}-${summaryId}`

          const rawData = userBets[searchId]

          if (rawData == null) {
            console.log(`rawData is null`)
            continue
          }

          console.log(JSON.stringify(rawData))

          gameData = {
            gameId: sampleData.fakeRoundId,
            tableId: sampleData.tableId,
            betting: 'BetsClosed',
            dealing: 'Finished',
            playerHand: rawData.game_result.player,
            bankerHand: rawData.game_result.banker,
            result: {
              winner: rawData.result,
            },
            ...(rawData.game_result.multipliers != null && {
              lightningMultipliers: Object.entries(rawData.game_result.multipliers.cards).map(([card, value]) => ({
                card,
                value,
              })),
            }),
            resultTime: now,
            updatedAt: now,
          } as FakeGameData

          await mongoBet.fakeGameData.updateOne(
            {
              gameId: sampleData.fakeRoundId,
              tableId: sampleData.tableId,
            },
            {
              $set: gameData,
            },
            {
              upsert: true,
            },
          )
        }
      }
    }
  } catch (err) {
    console.log(errorToString(err))
  }
}

export async function GetOldestSwixHistory(vendorCode: string, cxEnv: CXEnv): Promise<BetDataCasino[]> {
  const now = new Date()

  const searchBeginTime = addHours(now, -searchEndHourAgo)
  // 정규로 긁어오는 데서 쓰는 처음 시간 까지 긁어 온다.
  const searchEndTime = addMinutes(now, -searchBeginMinuteAgo)

  const details = await mongoBet.betDataCasino.find({
    where: {
      betTime: { $gte: searchBeginTime, $lt: searchEndTime } as any,
      historyStatus: { $in: ['DO', 'WAIT'] } as any,
      vendor: vendorCode,
      isFakeBet: null,
    },
    order: { betTime: 1 },
    take: 100,
  })

  const oldestDetails = details[0]

  if (oldestDetails == null) {
    return []
  }

  const crawlBeginTime = oldestDetails.betTime

  const newestDetails = details[details.length - 1]

  let crawlEndTime = newestDetails.betTime

  const minute10Later = addMinutes(oldestDetails.betTime.getTime(), 20)

  // 너무 시간을 길게 두고 긁으면 받는데 시간이 오래걸려서 10분까지만 타임 캡으로 긁는다.
  if (crawlEndTime.getTime() > minute10Later.getTime()) {
    crawlEndTime = minute10Later
  }

  console.log('get oldest detail', details.length, oldestDetails.summaryId)

  try {
    console.log(`get oldest swix history ${crawlBeginTime.toString()} ${crawlEndTime.toString()}`)

    if (oldestDetails.betTime.getHours() >= 22 && oldestDetails.betTime.getHours() < 24) {
      await sleep(3000)
      await crawlSwixHistory(cxEnv, addDays(oldestDetails.betTime, 1))
    }
    const userBets = makeUserBets(vendorCode)

    const results: BetDataCasino[] = []

    for (const detail of details) {
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
    return results
  } catch (ex) {
    console.log('crawlSwixHistory Error')
    console.log(ex?.response?.data)
  }
  return []
}

export async function GetOldestSwixHistoryWithoutDetail(vendorCode: string): Promise<BetDataCasino[]> {
  const now = new Date()

  // const searchBeginTime = addHours(now, -24)
  const searchEndTime = addHours(now, -searchEndHourAgo)

  const details = await mongoBet.betDataCasino.find({
    where: {
      betTime: { $lt: searchEndTime } as any,
      betStatus: { $ne: 'BET' } as any,
      historyStatus: { $in: ['DO', 'WAIT'] } as any,
      vendor: vendorCode,
      isFakeBet: null,
    },
    order: { betTime: 1 },
    take: 100,
  })

  if (details.length === 0) {
    return []
  }

  const oldestDetails = details[0]
  console.log('crawl oldest detail', details.length, oldestDetails.summaryId)

  try {
    const results: BetDataCasino[] = []

    for (const detail of details) {
      try {
        const { agentCode, userId, summaryId } = detail

        const username = agentCode + userId

        if (detail.betStatus !== 'SETTLE' && detail.betStatus !== 'CANCEL') {
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
