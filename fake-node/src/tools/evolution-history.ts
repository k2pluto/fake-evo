// import 'source-map-support/register'
// mport 'module-alias/register'

import { config } from './config'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { crawlEvolutionGameHistoryItem } from '../common/evolution-api'
import { evolution } from '../common/fake-vendors'

const mongoBet = new MongoBet(config.MONGO_OPTIONS)

async function bootstrap() {
  await mongoBet.connect()

  const betData = await mongoBet.betDataCasino.findOne({
    where: {
      summaryId: 'fchev-qsf63ownyvbqnz33-17d180cb7d618ddbbba7bf09',
      userId: 'so01',
    },
  })

  if (betData == null) {
    return
  }

  const data = await crawlEvolutionGameHistoryItem(evolution.env, betData)

  console.log(data)

  // const newData = vendor.getHistory(betData)

  // console.log(newData)
}
bootstrap().catch((err) => {
  console.log(err)
})
