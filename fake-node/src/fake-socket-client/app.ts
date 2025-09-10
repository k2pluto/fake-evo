import { config } from './config'
import { UserSQL } from '@service/src/lib/interface/sql'
import { MongoBet } from '@service/src/lib/interface/mongo'
import { errorToString } from '../common/util'
import { type LobbyTableInfo, connectUniongameCrawler, getLobbyTables } from './module/service'
import { createMultiClient } from './module/multi-client'

export const mainSQL = new UserSQL(config.RDB_OPTIONS)
export const mongoBet = new MongoBet(config.MONGO_OPTIONS)

process.on('uncaughtException', (err) => {
  // console.log('예기치 못한 에러', err)
  console.log('uncaughtException', errorToString(err))
})

export async function runApp() {
  const { vendor, evolutionCookie, evolutionUrl, evoSessionId, client_version, setupData } =
    await connectUniongameCrawler('tttaa33', 'p63cmvmwagteemoy')

  const rawLobbyTables = await getLobbyTables(evolutionUrl.host, setupData.user_id, evoSessionId, client_version)

  const lobbyTables: Record<string, LobbyTableInfo & { vt_id: string }> = {}
  for (const rawTableId in rawLobbyTables) {
    const [tableId, vt_id] = rawTableId.split(':')
    lobbyTables[tableId] = {
      ...rawLobbyTables[rawTableId],
      vt_id,
    }
  }

  // const vt_id=qr3cg62v7misgi6v

  // const tableInfo = lobbyTables[tableId]

  /* const client = createTableClient(
    evolutionUrl.host,
    vendor,
    evolutionCookie,
    setupData.user_id,
    evoSessionId,
    client_version,
    tableId,
    tableInfo.vt_id,
  ) */

  const client = createMultiClient(
    evolutionUrl.host,
    vendor,
    evolutionCookie,
    setupData.user_id,
    evoSessionId,
    client_version,
  )

  console.log(client.vendor)

  console.log('createApp End')
}
