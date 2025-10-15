import { WebSocket } from 'ws'
import ReceiveRouters from './router-evolution-lobby'
import { type SocketData } from './socket-data'
import { errorToString } from '../../common/util'
import { changePacketHostname } from '../../common/fake-util'
import { config } from '../config'

export async function connectLobby(socketData: SocketData, clientWs: WebSocket, evolutionWs: WebSocket) {
  let evolutionOpenResolve: (value?) => void
  const evolutionOpenPromise = new Promise((resolve) => {
    evolutionOpenResolve = resolve
  })
  evolutionWs.on('open', () => {
    console.log(`evolution lobby socket open ${user.agentCode}${user.userId} uuid ${socketData.uuid}`)
    evolutionOpenResolve()
  })

  // 데이터를 분석해서 교체한다.
  evolutionWs.on('message', async (data) => {
    try {
      const jsonStr = data.toString()
      const jsonObj = JSON.parse(jsonStr)

      // JWT 포함 여부 확인을 위한 상세 로그
      if (jsonStr.includes('videoToken') || jsonStr.includes('token') || jsonStr.includes('video')) {
        console.log('===== LOBBY WebSocket Message (Video/Token) =====')
        console.log('Username:', socketData.username)
        console.log('Type:', jsonObj.type)
        console.log('Full message:', jsonStr)
        console.log('==================================================')
      }

      const router = ReceiveRouters[jsonObj.type]
      // console.log(jsonObj.type)
      if (router != null) {
        const res = await router(jsonObj, socketData)
        if (res != null) {
          clientWs.send(JSON.stringify(res))
        }
      } else {
        clientWs.send(jsonStr)
      }
    } catch (err) {
      console.log(
        `evolution lobby message error ${user.agentCode}${user.userId} uuid ${socketData.uuid} ${errorToString(err)}`,
      )
    }
  })

  const { user, evolutionUrl } = socketData

  socketData.requestListener = async (jsonStr) => {
    await evolutionOpenPromise
    if (evolutionWs.readyState === WebSocket.OPEN) {
      // evolutionWs.send(jsonStr)
      const jsonObj = JSON.parse(jsonStr)
      if (config.proxyVideo && jsonObj.type === 'lobby.appEvent') {
        if (jsonObj.args.value?.video?.masterHost != null) {
          jsonObj.args.value.video.masterHost = socketData.lobbyVmh
        }
      }
      evolutionWs.send(JSON.stringify(changePacketHostname(jsonObj, evolutionUrl.hostname)))
    }
  }

  for (const request of socketData.initRequestQueue) {
    socketData.requestListener(request).catch((err) => {
      console.log(err)
    })
  }
  socketData.initRequestQueue = []

  evolutionWs.on('close', (code, reason) => {
    console.log(`evolution lobby socket closed ${user.agentCode}${user.userId} uuid ${socketData.uuid}`)
    clientWs.close(1000, reason)
  })

  evolutionWs.on('error', (err) => {
    console.log(`evolution lobby error ${user.agentCode}${user.userId} uuid ${socketData.uuid} ${errorToString(err)}`)
    clientWs.close(1000, 'evolution error')
  })

  clientWs.on('close', async (code, reason) => {
    console.log(`client lobby socket closed ${user.agentCode}${user.userId} uuid ${socketData.uuid}`)
    if (evolutionWs.readyState === WebSocket.OPEN) {
      evolutionWs.close(1000, reason)
    }
  })
  clientWs.on('error', (err) => {
    console.log(`client lobby error ${user.agentCode}${user.userId} uuid ${socketData.uuid} ${errorToString(err)}`)
    if (evolutionWs.readyState === WebSocket.OPEN) {
      evolutionWs.close(1000, 'error')
    }
  })
}
