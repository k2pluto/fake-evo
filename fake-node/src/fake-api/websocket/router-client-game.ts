import { type SendRouterType } from '../module/types'
import { BaccaratSendRouter } from './baccarat/router-game-baccarat'
import { DragonTigerSendRouter } from './router-game-dragontiger'
import { config } from '../config'

// 로비로 나갈 때 호출되는 패킷 이 걸 보내면 아직 수락되지 않은 베팅은 취소 된다.

const connectionUnsubscribe: SendRouterType = async (
  packet: {
    args: Record<string, never>
    id: string
    type: 'connection.unsubscribe'
  },
  { socketData, tableData },
) => {
  const { user } = socketData

  console.log(`connection unsubscribe ${user.agentCode + user.userId} tableId ${tableData?.tableId}`)

  socketData.willUnsubscribe = true

  // unsubscribe 는 잠시 기다렸다가 마감치는 로직이 있어서 바로 보내지는 않는다.
  return null
}

const widgetSubscribeTable: SendRouterType = async (
  packet: {
    args: {
      tableId: string
    }
  },
  { socketData: { user } },
) => {
  //console.log(`widget subscribeTable ${user.agentCode + user.userId} tableId ${packet.args.tableId}`)
  return packet
}

export default {
  'connection.unsubscribe': connectionUnsubscribe,
  'widget.subscribeTable': widgetSubscribeTable,
  // ['baccarat.playerPeekBetRequest']: playerBetRequest,
  ...BaccaratSendRouter,
  ...(config.fakeDragonTiger ? DragonTigerSendRouter : {}),
} as Record<string, SendRouterType>
