import { In, type MongoRepository } from 'typeorm'

import { CronJob } from 'cron'

import { UserSQL } from '@service/src/lib/interface/sql'
import { MongoBet } from '@service/src/lib/interface/mongo'

import { config } from './config'
import { GetFakeEvo, GetOldestHistory } from './module/fake'
import { GetHonorLinkHistory, GetOldestHonorLinkHistory } from './module/honorlink'
import {
  GetOldestSwixHistory,
  GetOldestSwixHistoryWithoutDetail,
  GetSwixHistory,
  crawlSwixHistory,
  resolveGameHistory,
} from './module/swix'
import { errorToString, printMemoryUsage } from '../common/util'
import {
  GetOldestUnionGameHistory,
  GetOldestUnionGameHistoryWithoutDetail,
  GetUnionGameHistory,
} from './module/uniongame'
import {
  GetEvolutionHistory,
  GetOldestEvolutionHistory,
  GetOldestEvolutionHistoryWithoutDetail,
} from './module/evolution'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { cider_cx, star_cx } from '../common/fake-vendors'
import { ProgressHistory } from './progress-history'

console.log('env ' + JSON.stringify(process.env))

export const gIgnore: Record<string, number> = {}

export const mongoBet = new MongoBet(config.MONGO_OPTIONS)
export const mainSQL = new UserSQL(config.RDB_OPTIONS)

const memHistroy = {}

export interface HistoryOptions {
  betRepo: MongoRepository<any>
  betSlotRepo: MongoRepository<any>
  historyKeyRepo: MongoRepository<any>
}

export const Sleep = async (ms: number) => {
  return await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function calculateRename() {
  const calculates = await mongoBet.calculateAgent.find({ agentId: null })

  for (const calculate of calculates) {
    const names = calculate._id.split('_')
    await mongoBet.calculateAgent.updateOne(
      { _id: calculate._id },
      { $set: { agentId: names[1], date: names[0], time: new Date(names[0]) } },
    )
  }
}

export async function connectDb() {
  await Promise.all([mainSQL.connect(), mongoBet.connect()]).catch((err) => {
    console.log(err)
    process.exit(1)
  })
}

export async function bootstrap() {
  await connectDb()

  await calculateRename()

  async function loopFakeEvo() {
    let newDate = new Date()

    const sleepMs = 10_000
    for (;;) {
      try {
        newDate = new Date()

        await ProgressHistory(mongoBet, mainSQL, await GetFakeEvo())
        await ProgressHistory(mongoBet, mainSQL, await GetOldestHistory())
      } catch (ex) {
        console.log(`error fake evo`)
        console.log(errorToString(ex))
      }

      console.log('loop end')

      const elapseMs = new Date().getTime() - newDate.getTime()
      await Sleep(elapseMs > sleepMs ? 3000 : sleepMs - elapseMs)
    }
  }
  async function loopSwixStar() {
    let newDate = new Date()

    const swixSleepMs = 10_000 * 2

    for (;;) {
      try {
        newDate = new Date()

        const now = new Date()

        await crawlSwixHistory(star_cx.env, now)

        await resolveGameHistory(VendorCode.FakeCX_Evolution, star_cx.env)
        await ProgressHistory(mongoBet, mainSQL, await GetOldestSwixHistoryWithoutDetail(VendorCode.FakeCX_Evolution))
        await ProgressHistory(mongoBet, mainSQL, await GetSwixHistory(VendorCode.FakeCX_Evolution, star_cx.env))
        await ProgressHistory(mongoBet, mainSQL, await GetOldestSwixHistory(VendorCode.FakeCX_Evolution, star_cx.env))

        console.log('loopend swix')
      } catch (ex) {
        console.log(`error swix`)
        console.log(errorToString(ex))
      }

      const elapseMs = new Date().getTime() - newDate.getTime()
      await Sleep(elapseMs > swixSleepMs ? 3000 : swixSleepMs - elapseMs)
    }
  }
  async function loopSwixCider() {
    let newDate = new Date()

    const swixSleepMs = 10_000 * 2

    for (;;) {
      try {
        newDate = new Date()

        const now = new Date()
        await crawlSwixHistory(cider_cx.env, now)

        await ProgressHistory(mongoBet, mainSQL, await GetSwixHistory(VendorCode.CX_EVOLUTION, cider_cx.env))
        await ProgressHistory(mongoBet, mainSQL, await GetOldestSwixHistoryWithoutDetail(VendorCode.CX_EVOLUTION))
        await ProgressHistory(mongoBet, mainSQL, await GetOldestSwixHistory(VendorCode.CX_EVOLUTION, cider_cx.env))
        console.log('loopend swix')
      } catch (ex) {
        console.log(`error swix`)
        console.log(errorToString(ex))
      }

      const elapseMs = new Date().getTime() - newDate.getTime()
      await Sleep(elapseMs > swixSleepMs ? 3000 : swixSleepMs - elapseMs)
    }
  }

  async function loopHonorLink() {
    let newDate = new Date()

    for (;;) {
      try {
        newDate = new Date()

        await ProgressHistory(mongoBet, mainSQL, await GetOldestHonorLinkHistory())
        await ProgressHistory(mongoBet, mainSQL, await GetHonorLinkHistory())
      } catch (ex) {
        console.log(`error honor link`)
        console.log(errorToString(ex))
      }

      const elapseMs = new Date().getTime() - newDate.getTime()
      elapseMs > 60000 ? await Sleep(5000) : await Sleep(60000 - elapseMs)
    }
  }
  async function loopUnionGame() {
    let newDate = new Date()
    const unionSleepMs = 10_000 * 3

    for (;;) {
      try {
        newDate = new Date()

        await ProgressHistory(mongoBet, mainSQL, await GetOldestUnionGameHistoryWithoutDetail())
        await ProgressHistory(mongoBet, mainSQL, await GetOldestUnionGameHistory())
        await ProgressHistory(mongoBet, mainSQL, await GetUnionGameHistory())
      } catch (ex) {
        console.log(`error uniongame`)
        console.log(errorToString(ex))
      }

      const elapseMs = new Date().getTime() - newDate.getTime()
      await Sleep(elapseMs > unionSleepMs ? 3000 : unionSleepMs - elapseMs)
    }
  }

  async function loopEvolution() {
    let newDate = new Date()
    const sleepMs = 10_000 * 3

    for (;;) {
      try {
        newDate = new Date()

        // oldest 를 순차적으로 처리한다. 이렇게 안하면 oldest가 쌓일 경우 api 호출 제한 때문에 GetEvolutionHistory가 돌아가지 않는다.
        await ProgressHistory(mongoBet, mainSQL, await GetEvolutionHistory())
        await Sleep(1_000)
        await ProgressHistory(mongoBet, mainSQL, await GetOldestEvolutionHistory())
      } catch (ex) {
        console.log(`error evolution`)
        console.log(errorToString(ex))
      }

      const elapseMs = new Date().getTime() - newDate.getTime()
      await Sleep(elapseMs > sleepMs ? 3000 : sleepMs - elapseMs)
    }
  }

  async function loopOldestWithoutDetailEvolution() {
    let newDate = new Date()
    const sleepMs = 10_000 * 3

    for (;;) {
      try {
        newDate = new Date()

        await ProgressHistory(mongoBet, mainSQL, await GetOldestEvolutionHistoryWithoutDetail())
      } catch (ex) {
        console.log(`error oldest evolution`)
        console.log(errorToString(ex))
      }

      const elapseMs = new Date().getTime() - newDate.getTime()
      await Sleep(elapseMs > sleepMs ? 3000 : sleepMs - elapseMs)
    }
  }

  async function calculateUserLoop() {
    for (;;) {
      try {
        const users = await mongoBet.calculateUser.find({ userId: null })
        for (const user of users) {
          const info = user.id.split('-')

          await mongoBet.calculateUser.updateOne(
            { _id: user.id },
            {
              $set: {
                strDate: `${info[0]}-${info[1]}-${info[2]}`,
                agentId: info[3],
                userId: info[4],
                date: new Date(`${info[0]}-${info[1]}-${info[2]}`),
              },
            },
            {
              upsert: false,
            },
          )
        }
      } catch (ex) {}

      await Sleep(60 * 1000)
    }
  }

  async function deleteDataLoop() {
    const now = new Date()

    if (now.getHours() >= 4 && now.getHours() <= 9) {
      const removeDate = new Date(now.setDate(now.getDate() - 12))

      await mongoBet.betDataCasino.deleteMany({ betTime: { $lt: removeDate } })
      await mongoBet.betDataSlot.deleteMany({ betTime: { $lt: removeDate } })
    }
  }

  async function deleteTransactionLoop() {
    const now = new Date()

    if (now.getHours() >= 4 && now.getHours() <= 9) {
      const nearDate = new Date(now.setDate(now.getDate() - 2))

      await mongoBet.betTransactionCasino.deleteMany({ createdAt: { $lt: nearDate } })
      await mongoBet.betTransactionSlot.deleteMany({ createdAt: { $lt: nearDate } })
    }
  }

  if (process.env.STAGE_ENV === 'prod') {
    loopFakeEvo().catch((err) => {
      console.log(errorToString(err))
    })
    // loopHonorLink().catch((err) => console.log(errorToString(err)))
  } else if (process.env.STAGE_ENV === 'fake') {
    loopFakeEvo().catch((err) => {
      console.log(errorToString(err))
    })
  } else if (process.env.STAGE_ENV === 'swix') {
    loopSwixStar().catch((err) => {
      console.log(errorToString(err))
    })
  } else if (process.env.STAGE_ENV === 'swix-cider') {
    loopSwixCider().catch((err) => {
      console.log(errorToString(err))
    })
  } else if (process.env.STAGE_ENV === 'honorlink') {
    loopHonorLink().catch((err) => {
      console.log(errorToString(err))
    })
  } else if (process.env.STAGE_ENV === 'uniongame') {
    loopUnionGame().catch((err) => {
      console.log(errorToString(err))
    })
  } else if (process.env.STAGE_ENV === 'fchev') {
    loopEvolution().catch((err) => {
      console.log(errorToString(err))
    })
    loopOldestWithoutDetailEvolution().catch((err) => {
      console.log(errorToString(err))
    })

    /* GetEvolutionStream().catch((err) => {
      console.log(errorToString(err))
    }) */
  }

  setImmediate(() => {
    calculateUserLoop().catch((err) => {
      console.log(errorToString(err))
    })
  })

  setImmediate(() => {
    deleteDataLoop().catch((err) => {
      console.log(errorToString(err))
    })
  })

  setImmediate(() => {
    deleteTransactionLoop().catch((err) => {
      console.log(errorToString(err))
    })
  })

  setInterval(() => {
    console.log(printMemoryUsage())
  }, 60000)

  // const expr = '0 0 */1 * * *'
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
