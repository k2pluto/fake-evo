import { config } from './config'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { sleep } from '../common/util'

const mongoBet = new MongoBet(config.MONGO_OPTIONS)

async function main() {
  await mongoBet.connect()

  /*const tables = await mongoBet.dataEvolutionTable.find()

  for (const table of tables) {
    if (table.configData != null) {
      console.log('tableId : ' + table._id)
      await mongoBet.dataEvolutionTable.updateOne(
        { _id: table._id },
        {
          $set: {
            name: table.configData.aams_game_name,
            nameKo: table.configData.table_name_ko,
            provider: table.configData.provider,
            gameType: table.configData.aams_game_name,
            gameTypeUnified: table.configData.game_type,
            ...(table.configData.gameSubType != null && { gameSubType: table.configData.gameSubType }),
          },
        },
      )
    }
  }*/

  const betDatas = await mongoBet.betDataCasino.find({
    where: {
      vendor: 'fcevo',
      fakeAmountBet: { $lt: 0 },
    },
  })

  for (const betData of betDatas) {
    if (betData.fakeAmountBet < 0) {
      await mongoBet.betDataCasino.updateOne(
        {
          _id: betData._id,
        },
        {
          $set: {
            fakeAmountBet: -betData.fakeAmountBet,
          },
        },
      )
    }
    await sleep(100)
  }

  console.log('main')
  process.exit()
}

/*setInterval(() => {
  console.log('interval')
}, 10000) */

main()
