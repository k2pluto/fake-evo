import { addDays, addMinutes, addSeconds } from 'date-fns'

import { CronJob } from 'cron'

import { config } from './config'
import { MINUTE_MS, errorToString, sleep } from '../common/util'
// import { waitAndCalcSettle } from '../fake-websocket/module/table-data'

import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { PartialSQL } from '@service/src/lib/interface/sql'
import { AuthManager } from '@service/src/lib/common/game/auth-manager'
import { CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { calcSettleBet } from '../common/settle'
import { type FakeGameData } from '@service/src/lib/interface/mongo/fake-game-data'
import { crawlEvolutionGameHistoryItem } from '../common/evolution-api'
import { evolution } from '../common/fake-vendors'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'

export const mongoDB = new MongoBet(config.MONGO_OPTIONS)
// export const mainSQL = new UserSQL(config.RDB_OPTIONS)
export const mainSQL = new PartialSQL(config.RDB_OPTIONS, ['user', 'agent'])

export const authManager = new AuthManager(mainSQL)
export const casinoManager = new CasinoTransactionManager(mongoDB, mainSQL)

async function resolveBet() {
  // 베팅하고 나서 30분 지나고 60분 이전 꺼만 (베팅 결과가 30분 정도 지연되는게 있어서 이렇게 변경함)
  const now = new Date()
  const startTime = addSeconds(now, -20)
  const endTime = addMinutes(now, -10)
  //const endTime = addMinutes(now, -60 * 24)

  const betDatas = await mongoDB.betDataCasino.find({
    where: {
      betStatus: 'BET',
      betTime: { $lte: startTime, $gte: endTime } as any,
      isFakeBet: true,
    },
  })

  // betDatas = betDatas.filter((value) => value.agentCode !== 'ttt' && value.userId !== 'test1')

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

    let gameData = await mongoDB.fakeGameData.findOne({
      where: {
        gameId: sampleData.fakeRoundId,
        tableId: sampleData.tableId,
      },
    })

    if (
      gameData == null ||
      (gameData.dealing !== 'Finished' &&
        gameData.dealing !== 'Cancelled' &&
        gameData.updatedAt?.getTime() + 20_000 < now.getTime())
    ) {
      const choiData = betDatas.find((value) => value.vendor === VendorCode.FakeChoi_Evolution)

      // 5분이 지나거나 fakeAmountWin 이 있으면 에볼에서 데이터를 가져와서 처리한다.
      if (choiData != null) {
        console.log(
          'choiData',
          choiData.agentCode + choiData.userId,
          choiData.summaryId,
          choiData.fakeAmountWin,
          choiData.betTime,
          choiData.updatedAt,
        )
        if (
          (choiData.fakeAmountWin != null && choiData.updatedAt.getTime() + 10_000 < now.getTime()) ||
          now.getTime() > choiData.betTime.getTime() + 60_000 * 5
        ) {
          // 5 분 보다 안들어오면 다른데서 데이터를 가져와 본다.
          const rawData = await crawlEvolutionGameHistoryItem(evolution.env, choiData)

          if (rawData?.result?.outcome == null) {
            console.log(`rawData is null`)
            continue
          }

          console.log('rawData', choiData.fakeRoundId, JSON.stringify(rawData))

          gameData = {
            gameId: choiData.fakeRoundId,
            tableId: choiData.tableId,
            betting: 'BetsClosed',
            dealing: 'Finished',
            playerHand: rawData.result.player,
            bankerHand: rawData.result.banker,
            result: {
              winner: rawData.result.outcome,
            },
            ...(rawData.result.multipliers != null && {
              lightningMultipliers: Object.entries(rawData.result.multipliers.cards).map(([card, value]) => ({
                card,
                value,
              })),
            }),
            redEnvelopePayouts: rawData.result.redEnvelopePayouts,
            resultTime: now,
            updatedAt: now,
          } as FakeGameData

          await mongoDB.fakeGameData.updateOne(
            {
              gameId: choiData.fakeRoundId,
              tableId: choiData.tableId,
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

    if (gameData == null) {
      console.log(`gameData is null`, roundId)
      continue
    }

    //이제 resolver에서만 마감을 치므로 10초 이후룰은 제거한다,
    /*
    if (gameData.resultTime?.getTime() + 10_000 > now.getTime()) {
      console.log(`game ${gameData?.gameId} : too fast resultTime ${gameData?.resultTime}`)
      continue
    }*/

    console.log(`game ${gameData?.gameId} : ${gameData?.dealing}`)

    const { dealing } = gameData

    if (dealing === 'Finished' || dealing === 'Cancelled') {
      // 마감한다.
      for (const betData of betDatas) {
        console.log(`try calc settle bet ${betData.summaryId} dealing ${dealing} round ${gameData?.gameId}`)
        await calcSettleBet(authManager, casinoManager, betData, gameData)

        await mainSQL.repos.user.update(
          {
            agentCode: betData.agentCode,
            userId: betData.userId,
          },
          {
            lockedBalance: 0,
          },
        )
      }
    }
  }
}

async function resolveBetLoop() {
  while (true) {
    try {
      await resolveBet().catch((err) => {
        console.log(errorToString(err))
      })
      await sleep(3_000)
    } catch (err) {
      console.log(errorToString(err))
    }
  }
}

async function deleteGameDataLoop() {
  while (true) {
    try {
      const weekAgo = addDays(new Date(), -7)
      await mongoDB.fakeGameData.deleteMany({
        updatedAt: { $lt: weekAgo },
      })
      const dayAgo = addDays(new Date(), -2)
      await mongoDB.fakeBetData.deleteMany({
        betTime: { $lt: dayAgo },
      })

      await sleep(MINUTE_MS * 10)
    } catch (err) {}
  }
}

export async function createApp() {
  await mongoDB.connect()
  await mainSQL.connect()

  setTimeout(() => {
    resolveBetLoop().catch((err) => {
      console.log(errorToString(err))
    })
  })

  setTimeout(() => {
    deleteGameDataLoop().catch((err) => {
      console.log(errorToString(err))
    })
  })

  const expr = '0 0 8 * * *'

  const balJob = new CronJob(expr, async () => {
    try {
      console.log('cron end')
      process.exit(1)
    } catch (e) {
      console.error(e)
    }
  })
  if (!balJob.running) {
    balJob.start()
  }
}
