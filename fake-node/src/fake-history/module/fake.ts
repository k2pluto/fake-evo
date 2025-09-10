import { addHours, addMinutes } from 'date-fns'
import { mongoBet } from '../app'
import { makeContentResult } from '../../common/fake-util'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'
import { getTableInfo } from '../util'
import { type BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { errorToString } from '@service/src/lib/utility/util'

/* const tableNames: { [tableId: string]: string } = {}

async function getTableName(tableId: string) {
  if (tableNames[tableId] == null) {
    const table = await mongoBet.dataEvolutionTable.findOne({ _id: tableId })
    const name = (tableNames[tableId] = table?.name ?? '')
    return name
  }
  return tableNames[tableId]
} */

export async function GetFakeEvo(): Promise<BetData[]> {
  const now = new Date()

  //const hourAgo = addHours(now, -1)
  const endTime = addMinutes(now, -20)

  const datas = await mongoBet.betDataCasino.find({
    where: {
      betTime: { $gte: endTime } as any,
      // vendor: VendorCode.FakeHonor_Evolution,
      historyStatus: 'DO',
      isFakeBet: true,
      // gameId: 'baccarat',
      // summaryId: 'fhevo-baccarat-172e6d6bc420905307ffbb52',
    },
    // where: { vendor: VendorCode.FakeHonor_Evolution, historyStatus: 'DO', gameId: 'baccarat' },

    skip: 0,
    take: 1000,
    order: { betTime: -1 },
  })

  console.log('fake evo count', datas.length)

  const histories = []
  for (const data of datas) {
    try {
      if (data.packet?.length <= 0) {
        continue
      }

      if (data.content == null && data.betStatus !== 'CANCEL') {
        continue
      }

      console.log(
        `fake history ${data.agentCode + data.userId} ${data.tableName} ${data.summaryId} ${JSON.stringify(data.content?.result ?? {})}`,
      )

      // result 만 없을 경우에는 result를 채워 넣는다.
      if (data.content?.result == null) {
        const gameData = await mongoBet.fakeGameData.findOne({ where: { gameId: data.fakeRoundId } })

        if (gameData == null) {
          continue
        }

        if (gameData.dealing === 'Cancelled') {
          // data.betStatus = 'CANCEL'
          continue
        }

        if (data.content == null) {
          data.content = {}
        }

        data.content.result = makeContentResult(data.tableId, gameData)
      }

      const betSettled = data.betSettled ?? {}
      const betOrg = data.betOrg ?? {}
      const betFake = data.betFake ?? {}

      for (const spot in betOrg) {
        betOrg[spot] = Number(betOrg[spot])
      }
      for (const spot in betFake) {
        betFake[spot] = Number(betFake[spot])
      }
      for (const key of Object.keys(betSettled)) {
        const bet = betSettled[key]

        betOrg[`${key}_win`] = Number(bet.payoff)
        // 갑자기 bet.amount 가 들어오는게 문자열로 바뀜
        betFake[`${key}_win`] = (betFake[key] * bet.payoff) / Number(bet.amount)

        /* if (typeof bet.payoff !== 'number') {
          console.log(`history ${data.agentCode + data.userId} ${data.summaryId} is invalid payoff ${bet.payoff}`)
        }
        if (typeof bet.amount !== 'number') {
          console.log(`history ${data.agentCode + data.userId} ${data.summaryId} is invalid payoff ${bet.amount}`)
        } */
      }

      const tableInfo = await getTableInfo(data.tableId)
      if (data.tableName == null) {
        data.tableName = tableInfo.name
      }
      data.calBetFake = betFake
      data.calBetOrg = betOrg
      histories.push(data)
    } catch (err) {
      console.log(
        `fake history error ${data.agentCode + data.userId} ${data.tableName} ${data.summaryId}`,
        errorToString(err),
      )
    }
  }

  return histories
}

export async function GetOldestHistory(): Promise<BetDataCasino[]> {
  const now = new Date()

  const hourAgo = addHours(now, -30)
  const minuteAgo = addHours(now, -1)

  const details = await mongoBet.betDataCasino.find({
    where: {
      betTime: { $gte: hourAgo, $lt: minuteAgo } as any,
      historyStatus: 'DO',
      isFakeBet: true,
    },
    order: { betTime: 1 },
    take: 1000,
  })

  console.log('oldest evo count', details.length)

  if (details.length === 0) {
    return []
  }

  const oldestDetails = details[0]
  console.log(`crawl oldest detail ${oldestDetails.summaryId}`)

  try {
    const results: BetDataCasino[] = []

    for (const detail of details) {
      const { agentCode, userId, summaryId } = detail ?? {}

      const username = agentCode + userId
      try {
        if (detail.betStatus !== 'SETTLE') {
          continue
        }

        const tableInfo = await getTableInfo(detail.tableId)

        if (detail.tableName == null) {
          detail.tableName = tableInfo.name
        }

        // result 만 없을 경우에는 result를 채워 넣는다.
        if (detail.content?.result == null) {
          const fakeRoundId = detail.fakeRoundId ?? (detail.vendor === 'fucev' ? detail.roundId : null)

          const gameData = await mongoBet.fakeGameData.findOne({ where: { gameId: fakeRoundId } })

          if (gameData != null && gameData.dealing !== 'Cancelled') {
            if (detail.content == null) {
              detail.content = {}
            }

            detail.content.result = makeContentResult(detail.tableId, gameData)
          }
        }

        if (detail.content == null) {
          detail.content = 'temporary'
        }

        results.push(detail)

        console.log(`oldest history ${username} ${summaryId}`)
      } catch (ex) {
        console.log(`oldest history error ${username} ${summaryId}`)
      }
    }
    return results
  } catch (ex) {
    console.log('crawl Oldest History Error')
    console.log(ex?.response?.data)
  }
  return []
}
