import { MongoBet } from '../../interface/mongo'
import { DataEvolutionTable } from '../../interface/mongo/data-evolution-table'

export const evolutionTableCache: {
  [tableId: string]: {
    data: DataEvolutionTable
  }
} = {}
//테스트를 쉽게 하기 위해서 now 를 인자로 받음

export async function getEvolutionTable(mongoBet: MongoBet, tableId: string) {
  const cache = evolutionTableCache[tableId]

  if (cache != null) {
    return cache.data
  }

  const newData = await mongoBet.dataEvolutionTable.findOne({ where: { _id: tableId } })

  console.log(`refresh getEvolutionTable`, tableId, newData?.nameKo)

  evolutionTableCache[tableId] = {
    data: newData,
  }

  return newData
}
