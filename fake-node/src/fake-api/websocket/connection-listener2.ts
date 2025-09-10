import { WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { connections, mongoDB, casinoManager } from '../app'
import { SocketData } from './socket-data'
import { connectChat } from './connect-chat'
import { connectGame } from './connect-game'
import { connectMulti } from './connect-multi'
import { connectLobby } from './connect-lobby'
import { routerBetResponse } from './router-bet-response'
import { FastifyRequest } from 'fastify'

export async function connectionListener2(ws: WebSocket, request: FastifyRequest) {
  // request.url example
  // /public/lobby/socket/v2/qq6y2dq2khjhaojr?messageFormat=json&device=Desktop&instance=o5u30-qq6y2dq2khjhaojr-&EVOSESSIONID=qq6y2dq2khjhaojrqtrhgbaahctzbnay942714141121bd7c56a3855592f437f45b607285134f9c4c&client_version=6.20221117.71138.17657-2031067905
  // /public/chat/table/p63cmvmwagteemoy/player/socket?EVOSESSIONID=qq6y2dq2khjhaojrqtrxuzl3hct2lwlj5d0f7477abb52c83d6cd0b7884df4bd95e9c9c74da012718&client_version=6.20221117.71138.17657-2031067905
  // /public/baccarat/player/game/p63cmvmwagteemoy/socket?messageFormat=json&instance=yla4i-qrdwizfr7jp6bjmh-p63cmvmwagteemoy&tableConfig=&EVOSESSIONID=qrdwizfr7jp6bjmhquvbxn6fpwxqosv2dacdf8dd9df29064ac24ba6e7e121338b0748013d4b4e371&client_version=6.20221208.72242.18564-753aceeedc
  // multi baccarat example
  // /public/baccarat/player/game/multiwidget/socket?messageFormat=json&instance=x2531-qrdwizfr7jp6bjmh-&tableConfig=undefined&EVOSESSIONID=qrdwizfr7jp6bjmhqufd4ahkpensb6vz84fbc0e9b0185a61f9d6b1770a454cf509b945484433928a&client_version=6.20221206.152749.18446-d498f19ab4

  const uuid = uuidv4()
  try {
    const [, , rawType, , rawChatTableId, rawTableId] = request.url.split('/')

    const type = rawTableId === 'multiwidget' ? 'multiwidget' : rawType

    let tableId
    if (type === 'chat') {
      tableId = rawChatTableId
    } else if (type !== 'multiwidget' && type !== 'lobby') {
      tableId = rawTableId
    }

    const { authInfo, loginData } = request as any

    const { user, agent } = authInfo

    const socketData = new SocketData({
      user,
      agent,
      mongoDB,
      casinoManager,
      url: request.url,
      ip: (request.headers['x-forwarded-for'] as string) ?? request.socket.remoteAddress,
      connectionTime: new Date(),
      headers: request.headers as { [key: string]: string },
      type,
      tableId,
      uuid,
      betResponseCallback: routerBetResponse[type],
    })

    connections[socketData.uuid] = socketData

    // on message 가 위쪽에 있어야 웹소켓에 처음 들어온 메시지를 수신 가능하다.
    ws.on('message', async (data) => {
      //console.log('client message', data.toString())
      if (socketData.requestListener != null) {
        socketData.requestListener(data.toString())
      } else {
        socketData.initRequestQueue.push(data.toString())
      }
    })
    // on close 도 위쪽에 있어야 웹소켓이 바로 끊겼을 때 메시지를 수신 가능하다.
    ws.on('close', async (code, reason) => {
      delete connections[uuid]
    })

    if (ws.readyState === WebSocket.CLOSED) {
      throw 'already client closed'
    }

    const username = user.agentCode + user.userId

    const evolutionUrl = new URL(loginData.evolutionUrl)

    const evolutionWsUrl = new URL(request.url, loginData.evolutionUrl.replace('https://', 'wss://')).href

    const sendHeaders = {
      CacheControl: 'no-cache',
      Cookie: request.headers['cookie'] ?? '',
      Host: evolutionUrl.host,
      Origin: evolutionUrl.origin,
      Pragma: 'no-cache',
      ['User-Agent']: request.headers['user-agent'],
      ['Accep-Encoding']: request.headers['accept-encoding'],
      ['Accep-Language']: request.headers['accept-language'],
    }

    console.log('client connected', username, type, tableId, socketData.uuid, request.url)

    console.log('connect evolution socket', username, evolutionWsUrl, JSON.stringify(sendHeaders))
  } catch (err) {
    console.log(err)
    delete connections[uuid]
    ws.close(1000, err.toString())
  }
}
