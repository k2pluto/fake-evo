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

    // Log Cloudflare headers to debug real user IP
    console.log('🔍 Incoming Headers (IP detection):', {
      'x-forwarded-for': request.headers['x-forwarded-for'],
      'cf-connecting-ip': request.headers['cf-connecting-ip'],
      'x-real-ip': request.headers['x-real-ip'],
      'socket-ip': request.socket.remoteAddress,
    })

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

    // Firefox는 Akamai WAF가 TLS fingerprint로 차단하므로 Chrome으로 위장
    const originalUserAgent = headers['user-agent'] as string
    const isFirefox = originalUserAgent?.toLowerCase().includes('firefox')

    let spoofedUserAgent = originalUserAgent
    if (isFirefox) {
      // Firefox → Chrome User-Agent로 변경 (Akamai 우회)
      spoofedUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      console.log('[Akamai Bypass] Firefox → Chrome User-Agent')
    }

    // 받은 헤더를 그대로 사용하되, 도메인만 fake-node → Evolution으로 변경
    const sendHeaders = { ...headers } as Record<string, string>

    // Cloudflare/Caddy/Proxy가 추가한 헤더들 제거 (프록시 사용 흔적 제거)
    delete sendHeaders['x-forwarded-for']
    delete sendHeaders['x-forwarded-host']
    delete sendHeaders['x-forwarded-proto']
    delete sendHeaders['x-real-ip']
    delete sendHeaders['via']
    delete sendHeaders['cdn-loop']
    delete sendHeaders['cf-connecting-ip']
    delete sendHeaders['cf-ipcountry']
    delete sendHeaders['cf-ray']
    delete sendHeaders['cf-visitor']
    delete sendHeaders['cf-worker']
    delete sendHeaders['cf-request-id']

    // 필수: host는 Evolution 서버로 변경
    delete sendHeaders.host // 소문자 host 삭제
    sendHeaders.Host = evolutionUrl.host // 대문자 Host로 설정

    // origin이 있으면 fake-node 도메인을 Evolution 도메인으로 교체
    if (sendHeaders.origin && sendHeaders.origin.includes('soft-evo-games.com')) {
      delete sendHeaders.origin // 소문자 origin 삭제
      sendHeaders.Origin = evolutionUrl.origin // 대문자 Origin으로 설정
      console.log(`[WS] Origin: ${headers.origin} → ${evolutionUrl.origin}`)
    }

    // referer가 있으면 fake-node 도메인을 Evolution 도메인으로 교체 (경로 유지)
    if (sendHeaders.referer && sendHeaders.referer.includes('soft-evo-games.com')) {
      const refererUrl = new URL(sendHeaders.referer)
      const newReferer = `${evolutionUrl.origin}${refererUrl.pathname}${refererUrl.search}`
      delete sendHeaders.referer // 소문자 referer 삭제
      sendHeaders.Referer = newReferer // 대문자 Referer로 설정
      console.log(`[WS] Referer: ${headers.referer} → ${newReferer}`)
    }

    // Firefox는 User-Agent를 Chrome으로 위장 (Akamai 우회)
    if (isFirefox) {
      sendHeaders['user-agent'] = spoofedUserAgent
    }

    // WebSocket 필수 헤더
    delete sendHeaders.connection // 소문자 connection 삭제
    delete sendHeaders.upgrade // 소문자 upgrade 삭제
    sendHeaders.Connection = 'upgrade' // 대문자 Connection으로 설정
    sendHeaders.Upgrade = 'websocket' // 대문자 Upgrade로 설정

    // Use browser-specific pooled agent for better TLS fingerprint consistency
    const userAgent = headers['user-agent'] as string
    // Firefox는 Chrome TLS fingerprint 사용 (Akamai 우회)
    const customAgent = getOrCreateBrowserAgent(evolutionUrl.host, isFirefox ? spoofedUserAgent : userAgent)

    // 브라우저 감지 로그
    const detectedBrowser = userAgent?.toLowerCase().includes('safari') && !userAgent?.toLowerCase().includes('chrome')
      ? 'Safari'
      : userAgent?.toLowerCase().includes('firefox')
      ? 'Firefox'
      : 'Chrome'

    console.log(
      `ws client connected [${detectedBrowser}]`,
      username,
      type,
      tableId,
      socketData.uuid,
      evolutionWsUrl,
    )

    // Safari/Firefox는 상세 헤더 로그
    if (detectedBrowser === 'Safari' || detectedBrowser === 'Firefox') {
      console.log(`[${detectedBrowser}] Request Headers:`, JSON.stringify({
        'user-agent': sendHeaders['user-agent'],
        'sec-fetch-site': sendHeaders['sec-fetch-site'],
        'sec-fetch-mode': sendHeaders['sec-fetch-mode'],
        'sec-fetch-dest': sendHeaders['sec-fetch-dest'],
        'sec-websocket-version': sendHeaders['sec-websocket-version'],
        'sec-websocket-key': sendHeaders['sec-websocket-key']?.substring(0, 20) + '...',
        'sec-websocket-extensions': sendHeaders['sec-websocket-extensions'],
      }, null, 2))
    }
    //console.log('ws client connected header', JSON.stringify(request.headers))

    //updateTlsSuites(1000)

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
