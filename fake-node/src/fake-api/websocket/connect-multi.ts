import { WebSocket } from 'ws'
import ReceiveRouters, { type BalancePacket, balanceProcess } from './router-evolution-game'
import SendRouters from './router-client-game'
import LogRouters from './router-log'
import { type SocketData } from './socket-data'
import { makeUnsubscribePacket } from '../../common/fake-packet-types'
import { type SendRouterType } from '../module/types'
import { fakeTables } from './settings'
import { config } from '../config'
import { errorToString } from '../../common/util'
import { changePacketHostname } from '../../common/fake-util'

export async function connectMulti(socketData: SocketData, clientWs: WebSocket, evolutionWs: WebSocket) {
  let evolutionOpenResolve: (value?) => void
  const evolutionOpenPromise = new Promise((resolve) => {
    evolutionOpenResolve = resolve
  })

  const { agentCode, userId } = socketData.user
  const username = agentCode + userId

  evolutionWs.on('open', () => {
    console.log(`evolution multi socket open ${username} uuid ${socketData.uuid}`)
    evolutionOpenResolve()
  })

  // 데이터를 분석해서 교체한다.
  evolutionWs.on('message', async (data) => {
    try {
      const jsonStr = data.toString()
      const jsonObj = JSON.parse(jsonStr)

      // console.log(jsonObj.type + ' ' + tableId)

      // 먼저 밸런스를 수정한다.
      await balanceProcess(jsonObj as BalancePacket, socketData.user)

      const tableId = jsonObj.args?.tableId as string
      if (fakeTables[tableId] != null) {
        // console.log(jsonObj.type + ' ' + tableId)

        const router = ReceiveRouters[jsonObj.type]
        // console.log(jsonObj.type)
        if (router != null) {
          const tableData = socketData.getTable(tableId)
          const res = await router(jsonObj, { socketData, tableData, clientWs })
          if (res != null) {
            clientWs.send(JSON.stringify(res))
          }
          return
        }
      }
      clientWs.send(JSON.stringify(jsonObj))
    } catch (err) {
      console.log(`receive error ${username} ${errorToString(err)}`)
    }
  })

  socketData.requestListener = async (jsonStr) => {
    await evolutionOpenPromise
    if (evolutionWs.readyState === WebSocket.OPEN) {
      try {
        const jsonObj = JSON.parse(jsonStr)
        if (jsonObj.log != null) {
          changePacketHostname(jsonObj, socketData.evolutionUrl.hostname)
        }

        let router: SendRouterType
        let tableId: string
        if (jsonObj.log != null) {
          tableId = jsonObj.log.value?.tableId
          if (
            config.FAKE_PRINT_LOG &&
            (jsonObj.log.type.indexOf('CLIENT_BET') >= 0 || jsonObj.log.type.indexOf('CLIENT_PRESSED') >= 0)
          ) {
            console.log(JSON.stringify({ ...jsonObj, username, tableId }))
          }
          router = LogRouters[jsonObj.log.type]
        } else {
          router = SendRouters[jsonObj.type]
          tableId = jsonObj.args?.tableId
        }

        if (fakeTables[tableId] != null) {
          if (router != null) {
            const tableData = socketData.getTable(tableId)
            const res = await router(jsonObj, { socketData, tableData, evolutionWs, clientWs })
            if (res != null) {
              evolutionWs.send(JSON.stringify(res))
            }
            return
          }
        }

        evolutionWs.send(jsonStr)
      } catch (err) {
        console.log('multi send error', username, errorToString(err), jsonStr)
      }
    }
  }

  for (const request of socketData.initRequestQueue) {
    socketData.requestListener(request).catch((err) => {
      console.log(errorToString(err))
    })
  }
  socketData.initRequestQueue = []

  evolutionWs.on('close', (code, reason) => {
    console.log(`evolution multi socket closed ${username} uuid ${socketData.uuid}`)
    clientWs.close(1000, reason)
  })

  evolutionWs.on('error', (err) => {
    console.log(`evolution multi socket error ${username} ${errorToString(err)}`)

    clientWs.close(1000, 'evolution error')
  })

  clientWs.on('close', async (code, reason) => {
    console.log(`client multi socket closed ${username} uuid ${socketData.uuid}`)
    if (evolutionWs.readyState === WebSocket.OPEN) {
      await socketData.waitAllSettle()

      // unsubscribe packet을 보내지 않으면 칩을 걸어놓고 나갈때 무조건 베팅 수락을 하게 된다.
      // 네트워크 장애로 접속이 끊길 때는 보내지 않는다.
      if (socketData.willUnsubscribe) {
        for (const tableId in socketData.getTables()) {
          evolutionWs.send(JSON.stringify(makeUnsubscribePacket({ tableId })))
        }
      }

      evolutionWs.close(1000, reason)
    }
    socketData.terminate()
  })
  clientWs.on('error', (err) => {
    console.log(`client multi socket error ${username} ${errorToString(err)}`)
    if (evolutionWs.readyState === WebSocket.OPEN) {
      evolutionWs.close(1000, 'error')
    }
  })
}
