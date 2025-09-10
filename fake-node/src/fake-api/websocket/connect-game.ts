import { WebSocket } from 'ws'
import ReceiveRouters, { balanceProcess } from './router-evolution-game'
import SendRouters from './router-client-game'
import LogRouters from './router-log'
import { type SocketData } from './socket-data'
import { specialTables } from './const-tables'
import { type EvolutionRequest, makeUnsubscribePacket } from '../../common/fake-packet-types'
import { errorToObj, sleep } from '../../common/util'
import { type SendRouterType } from '../module/types'
import { fakeTables } from './settings'
import { config } from '../config'
import { changePacketHostname } from '../../common/fake-util'

export async function connectGame(
  socketData: SocketData,
  clientWs: WebSocket,
  evolutionWs: WebSocket,
  tableId: string,
) {
  let evolutionOpenResolve: (value?) => void
  const evolutionOpenPromise = new Promise((resolve) => {
    evolutionOpenResolve = resolve
  })

  socketData.createSingleTable(tableId)

  const { agentCode, userId } = socketData.user
  const username = agentCode + userId

  const startTime = Date.now()

  evolutionWs.on('open', () => {
    console.log(`evolution game socket open`, username, tableId, socketData.uuid, (Date.now() - startTime) / 1000 + 's')
    evolutionOpenResolve()
  })

  // 데이터를 분석해서 교체한다.
  evolutionWs.on('message', async (data) => {
    let packetTime: number = null
    try {
      const jsonStr = data.toString()
      const jsonObj: EvolutionRequest = JSON.parse(jsonStr)

      packetTime = jsonObj?.time

      if (packetTime != null) {
        socketData.evolutionPackets[packetTime] = jsonObj
      }

      // console.log(jsonStr)

      // 먼저 밸런스를 수정한다.
      await balanceProcess(jsonObj, socketData.user)

      // 스페셜 테이블들은 밸런스 외 데이터를 수정하지 않는다.
      if (specialTables[tableId]) {
        clientWs.send(JSON.stringify(jsonObj))
      }

      if (fakeTables[tableId] != null) {
        // console.log(jsonObj.type + ' ' + tableId)

        const { version } = (jsonObj.args as any) ?? {}

        if (version != null) {
          socketData.packetVersion = version
        }

        const router = ReceiveRouters[jsonObj.type]
        // console.log(jsonObj.type)
        if (router != null) {
          const res = await router(jsonObj, { socketData, tableData: socketData.singleTable, clientWs })
          if (res != null) {
            clientWs.send(JSON.stringify(res))
          }
          return
        }
      }
      clientWs.send(JSON.stringify(jsonObj))
    } catch (err) {
      console.log(`receive error ${username} ${JSON.stringify(errorToObj(err))}`)
    } finally {
      if (packetTime != null) {
        delete socketData.evolutionPackets[packetTime]
      }
    }
  })

  socketData.requestListener = async (jsonStr) => {
    await evolutionOpenPromise
    if (evolutionWs.readyState === WebSocket.OPEN) {
      try {
        // 스페셜 테이블들은 데이터를 수정하지 않는다.
        const jsonObj = JSON.parse(jsonStr)
        if (jsonObj.log != null) {
          changePacketHostname(jsonObj, socketData.evolutionUrl.hostname)
        }

        if (specialTables[tableId]) {
          evolutionWs.send(JSON.stringify(jsonObj))
          return
        }

        if (fakeTables[tableId] != null) {
          let router: SendRouterType = null
          if (jsonObj.log != null) {
            if (config.FAKE_PRINT_LOG) {
              console.log(JSON.stringify({ ...jsonObj, username, tableId }))
            }

            router = LogRouters[jsonObj.log.type]
          } else {
            router = SendRouters[jsonObj.type]
          }
          if (router != null) {
            const res = await router(jsonObj, { socketData, tableData: socketData.singleTable, evolutionWs, clientWs })
            if (res != null) {
              evolutionWs.send(JSON.stringify(res))
            }
            // 대기했다가 보내야 하는 경우도 있어서 여기서 리턴
            return
          }
        }

        evolutionWs.send(JSON.stringify(jsonObj))
      } catch (err) {
        console.log('game send error', username, JSON.stringify(errorToObj(err)), jsonStr)
      }
    }
  }

  for (const request of socketData.initRequestQueue) {
    socketData.requestListener(request).catch((err) => {
      console.log(err)
    })
  }
  socketData.initRequestQueue = []

  evolutionWs.on('close', async (code, reason) => {
    console.log(`evolution game socket closed ${username} tableId ${tableId} uuid ${socketData.uuid}`)

    // evolutionPacket이 다 처리 되거나 클라이언트 소켓이 끊어질 때 까지 기다린다.
    while (Object.keys(socketData.evolutionPackets).length > 0 && clientWs.readyState === WebSocket.OPEN) {
      await sleep(1000)
    }

    clientWs.close(1000, reason)
  })

  evolutionWs.on('error', (err) => {
    console.log(`evolution game socket error ${username} ${JSON.stringify(errorToObj(err))}`)
    clientWs.close(1000, 'evolution error')
  })

  clientWs.on('close', async (code, reason) => {
    console.log(`client game socket closed ${username} tableId ${tableId} uuid ${socketData.uuid} ${code}`)
    if (evolutionWs.readyState === WebSocket.OPEN) {
      await socketData.singleTable.waitSettle()

      // unsubscribe packet을 보내지 않으면 칩을 걸어놓고 나갈때 무조건 베팅 수락을 하게 된다.
      // 네트워크 장애로 접속이 끊길 때는 보내지 않는다.
      if (socketData.willUnsubscribe) {
        evolutionWs.send(JSON.stringify(makeUnsubscribePacket()))
      }

      evolutionWs.close(1000, reason)
    }
    socketData.terminate()
  })
  clientWs.on('error', (err) => {
    console.log(`client game socket error ${username} ${JSON.stringify(errorToObj(err))}`)
    if (evolutionWs.readyState === WebSocket.OPEN) {
      evolutionWs.close(1000, 'error')
    }
  })
}
