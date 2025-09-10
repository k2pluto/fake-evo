import { BaccaratBetResponseRouter } from './baccarat/router-game-baccarat'
import { DragonTigerBetResponseRouter } from './router-game-dragontiger'

import { config } from '../config'
import { type SocketData } from './socket-data'
import { type TableData } from './table-data'

export type BetResponseCallbackType = (responseData: any, socketData: SocketData, tableData: TableData) => any

export const routerBetResponse = {
  ...BaccaratBetResponseRouter,
  ...(config.fakeDragonTiger ? DragonTigerBetResponseRouter : {}),
}
