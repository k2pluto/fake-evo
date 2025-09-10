import { type DataEvolutionTable } from '@service/src/lib/interface/mongo/data-evolution-table'
import { mongoBet } from './app'

const tableInfos = {}

export async function getTableInfo(tableId) {
  let tableInfo: DataEvolutionTable = tableInfos[tableId]
  if (tableInfo == null) {
    tableInfo = tableInfos[tableId] = await mongoBet.dataEvolutionTable.findOne({ where: { _id: tableId } })
  }

  return tableInfo
}
