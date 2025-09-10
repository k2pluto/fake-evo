//import { evolTables } from '../common/evol-tables'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { evolutionTableInfos } from '@service/src/lib/common/data/evolution-tables'
import { config } from './config'

const mongoBet = new MongoBet(config.MONGO_OPTIONS)

async function main() {
  await mongoBet.connect()

  const tableArr = await mongoBet.dataEvolutionTable.find({
    select: ['name', 'gameType', 'gameSubType', 'gameTypeUnified', 'nameKo', 'description'],
  })

  for (const orgTable of tableArr) {
    const tableId = orgTable._id

    const newTable = evolutionTableInfos[tableId]
    if (newTable == null) {
      continue
    }
    if (
      //orgTable.gameType != newTable.name ||
      orgTable.gameType != newTable.gameType ||
      orgTable.gameSubType != newTable.gameSubType ||
      orgTable.gameTypeUnified != newTable.gameTypeUnified ||
      orgTable.nameKo != newTable.nameKo ||
      orgTable.description != newTable.description
    ) {
      console.log(`tableId ${tableId} is different ${JSON.stringify(orgTable)} ${JSON.stringify(newTable)}`)
    }
  }

  console.log('end')
  process.exit(1)
  //console.log(JSON.stringify(evolutionTableInfos))
}

main()
