// import { WebSocket } from 'ws'
import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { connections, mongoDB, casinoManager } from '../app'
import { SocketData } from './socket-data'
import { connectChat } from './connect-chat'
import { connectGame } from './connect-game'
import { connectMulti } from './connect-multi'
import { connectLobby } from './connect-lobby'
import { routerBetResponse } from './router-bet-response'
import { type FastifyRequest } from 'fastify'

import { getSelfUrl } from '../module/util'
import { updateTlsSuites } from '../module/call-axios'
import { getOrCreateBrowserAgent } from '../module/browser-tls-agent'

export async function connectionListener(ws: WebSocket, request: FastifyRequest) {
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

    let tableId: string
    if (type === 'chat') {
      tableId = rawChatTableId
    } else if (type !== 'multiwidget' && type !== 'lobby') {
      tableId = rawTableId
    }

    const { authInfo, loginData } = request as any as {
      authInfo: any
      loginData: { evolutionUrl: string }
    }

    const { user, agent } = authInfo
    const evolutionUrl = new URL(loginData.evolutionUrl)

    const selfUrl = getSelfUrl(request)

    const socketData = new SocketData({
      user,
      agent,
      mongoDB,
      casinoManager,
      url: request.url,
      evolutionUrl,
      ip: (request.headers['x-forwarded-for'] as string) ?? request.socket.remoteAddress,
      connectionTime: new Date(),
      headers: request.headers as Record<string, string>,
      type,
      tableId,
      uuid,
      selfUrl,
      betResponseCallback: routerBetResponse[type],
    })

    connections[socketData.uuid] = socketData

    // on message 가 위쪽에 있어야 웹소켓에 처음 들어온 메시지를 수신 가능하다.
    ws.on('message', (data: string) => {
      // console.log('client message', data.toString())
      if (socketData.requestListener != null) {
        socketData.requestListener(data.toString()).catch((err) => {
          console.log(err)
        })
      } else {
        socketData.initRequestQueue.push(data.toString())
      }
    })
    // on close 도 위쪽에 있어야 웹소켓이 바로 끊겼을 때 메시지를 수신 가능하다.
    ws.on('close', (code, reason) => {
      delete connections[uuid]
    })

    if (ws.readyState === WebSocket.CLOSED) {
      throw 'already client closed'
    }

    const username = user.agentCode + user.userId

    const requestUrl = new URL(request.url, loginData.evolutionUrl.replace('https://', 'wss://'))

    // requestUrl.searchParams.set('client_version', '6.20240320.204819.40208-ba082d41d0')

    const evolutionWsUrl = requestUrl.href

    const { headers } = request

    const sendHeaders = {
      //...request.headers,
      host: evolutionUrl.host,
      origin: evolutionUrl.origin,

      ...(headers.accept != null && { accept: headers.accept as string }),
      'accept-encoding': headers['accept-encoding'] as string,
      'accept-language': headers['accept-language'] as string,
      ...(headers['content-type'] != null && { ['content-type']: headers['content-type'] as string }),
      ...(headers.priority != null && { priority: headers.priority as string }),

      'user-agent': headers['user-agent'] as string,
      ...(headers.cookie != null && { cookie: headers.cookie as string }),

      connection: 'upgrade',
    }

    console.log(
      'ws client connected',
      username,
      type,
      tableId,
      socketData.uuid,
      evolutionWsUrl,
      JSON.stringify(sendHeaders),
    )
    //console.log('ws client connected header', JSON.stringify(request.headers))

    //updateTlsSuites(1000)

    // Use browser-specific pooled agent for better TLS fingerprint consistency
    const userAgent = headers['user-agent'] as string
    const customAgent = getOrCreateBrowserAgent(evolutionUrl.host, userAgent)

    const evolutionWs = new WebSocket(evolutionWsUrl, {
      headers: sendHeaders,
      agent: customAgent,
    })
    /* const evolutionWs = new WebSocket('wss://3.35.224.12', {
      rejectUnauthorized: false,
      //headers: sendHeaders,
    }) */

    // Enhanced TLS debugging
    const req = (evolutionWs as any)._req
    if (req) {
      req.on('socket', (socket: any) => {
        // Log connection attempt
        console.log('WebSocket connection attempt:', {
          username,
          uuid: socketData.uuid,
          host: evolutionUrl.host,
          url: evolutionWsUrl,
        })

        socket.on('secureConnect', () => {
          const tlsSocket = socket
          const cipher = tlsSocket.getCipher?.()
          const protocol = tlsSocket.getProtocol?.()
          const alpn = tlsSocket.alpnProtocol

          console.log('✓ TLS Handshake Success:', {
            username,
            uuid: socketData.uuid,
            protocol,
            cipherName: cipher?.name,
            cipherVersion: cipher?.version,
            alpnProtocol: alpn || 'none',
            authorized: tlsSocket.authorized,
            peerCertificate: tlsSocket.getPeerCertificate?.()?.subject,
          })
        })

        socket.on('error', (err: Error) => {
          console.error('✗ Socket Error:', {
            username,
            uuid: socketData.uuid,
            host: evolutionUrl.host,
            error: err.message,
            stack: err.stack,
          })
        })

        socket.on('timeout', () => {
          console.error('✗ Socket Timeout:', {
            username,
            uuid: socketData.uuid,
            host: evolutionUrl.host,
          })
        })
      })
    }

    // console.log('evolutionWs sendHeaders', JSON.stringify((evolutionWs as any)._req._headers))

    evolutionWs.on('ping', (data) => {
      console.log('ping', data)
    })

    evolutionWs.on('pong', (data) => {
      console.log('pong', data)
    })

    evolutionWs.on('upgrade', (response) => {
      //console.log('evolutionWs upgrade', response.statusCode, response.statusMessage, JSON.stringify(response.headers))
    })
    evolutionWs.on('unexpected-response', (request, response) => {
      console.error('✗ WebSocket Unexpected Response:', {
        username,
        uuid: socketData.uuid,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        responseHeaders: response.headers,
        requestHeaders: sendHeaders,
        url: evolutionWsUrl,
      })

      // Read response body for debugging
      let body = ''
      response.on('data', (chunk) => {
        body += chunk.toString()
      })
      response.on('end', () => {
        if (body) {
          console.error('✗ Response Body:', body.substring(0, 500))
        }
      })
    })

    evolutionWs.on('error', (err) => {
      console.error('✗ WebSocket Error:', {
        username,
        uuid: socketData.uuid,
        error: err.message,
        stack: err.stack,
        url: evolutionWsUrl,
      })
    })

    evolutionWs.on('open', () => {
      console.log('✓ WebSocket Connected:', {
        username,
        uuid: socketData.uuid,
        url: evolutionWsUrl,
      })
    })

    evolutionWs.on('close', (code, reason) => {
      console.log('WebSocket Closed:', {
        username,
        uuid: socketData.uuid,
        code,
        reason: reason.toString(),
      })
    })

    /* const websocketReq = (evolutionWs as any)._req

    websocketReq.onopen = () => {
      console.log('evolution websocket open', username, type, tableId, socketData.uuid)
    }

    websocketReq.onmessage = (data) => {
      console.log('evolution websocket message', data.toString())
    } */

    if (type === 'chat') {
      await connectChat(socketData, ws, evolutionWs, tableId)
    } else if (type === 'lobby') {
      await connectLobby(socketData, ws, evolutionWs)
    } else if (type === 'multiwidget') {
      await connectMulti(socketData, ws, evolutionWs)
    } else {
      await connectGame(socketData, ws, evolutionWs, tableId)
    }
  } catch (err) {
    console.log(err)
    delete connections[uuid]
    ws?.close(1000)
  }
}
