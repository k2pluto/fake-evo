import { shuffle } from 'lodash'

import { config } from './config'
import { UserSQL } from '@service/src/lib/interface/sql'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { TableCrawler } from './module/table-crawler'
import { errorToString, sleep } from '../common/util'
import { usernames } from './username-tables'
import { fakeBaccaratTables } from '../common/fake-tables'
import { MultiCrawler } from './module/multi-crawler'

export const mainSQL = new UserSQL(config.RDB_OPTIONS)
export const mongoBet = new MongoBet(config.MONGO_OPTIONS)

const fakeTableArr = Object.keys(fakeBaccaratTables)

const crawlers: TableCrawler[] = []

process.on('uncaughtException', (err) => {
  //console.log('예기치 못한 에러', err)
  console.log('uncaughtException', errorToString(err))
})

export async function runTableApp() {
  console.log('run table app')
  await mainSQL.connect()
  await mongoBet.connect()
  const shuffledNames = shuffle(usernames)
  const onceCount = Math.floor(usernames.length / fakeTableArr.length)
  function divideNames() {
    return shuffledNames.splice(0, onceCount)
  }

  try {
    const chunkSize = 1
    for (let i = 0; i < fakeTableArr.length; i += chunkSize) {
      const chunk = fakeTableArr.slice(i, i + chunkSize)

      const promises = []
      for (const tableId of chunk) {
        const table = new TableCrawler(divideNames(), tableId)
        crawlers.push(table)
        promises.push(table.init())
      }
      await Promise.all(promises)
      await sleep(1000)
      break
    }
    console.log('init success')
  } catch (err) {
    console.log(errorToString(err))
  }

  console.log('runTableApp End')
}

export async function runMultiApp() {
  console.log('run multi app')
  await mainSQL.connect()
  await mongoBet.connect()
  const shuffledNames = shuffle(usernames)
  const onceCount = 5
  function divideNames() {
    return shuffledNames.splice(0, onceCount)
  }

  const multiCrawler = new MultiCrawler(divideNames())
  await multiCrawler.init()

  const tableCrawler = new TableCrawler(divideNames(), 'PTBaccarat000001')
  await tableCrawler.init()

  while (true) {
    try {
      await sleep(1000)
    } catch (err) {
      console.log(errorToString(err))
    }
  }
}
