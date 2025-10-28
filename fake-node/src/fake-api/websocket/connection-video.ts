import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { connections } from '../app'
import { type FastifyRequest } from 'fastify'
import { FakeLoginData } from '@service/src/lib/interface/mongo/fake-login-data'
import { errorToString } from '../../common/util'

export async function connectionVideo(ws: WebSocket, request: FastifyRequest) {
  const uuid = uuidv4()
  try {
    const { authInfo, loginData } = request as any as {
      authInfo: any
      loginData: FakeLoginData
    }

    const { user, agent } = authInfo

    // on message 가 위쪽에 있어야 웹소켓에 처음 들어온 메시지를 수신 가능하다.

    let evolutionOpenResolve: (value?) => void
    const evolutionOpenPromise = new Promise((resolve) => {
      evolutionOpenResolve = resolve
    })

    ws.on('message', async (data: string) => {
      await evolutionOpenPromise
      if (videoWs?.readyState === WebSocket.OPEN) {
        //console.log('video send message', data.toString())
        videoWs.send(data.toString())
      }
    })
    // on close 도 위쪽에 있어야 웹소켓이 바로 끊겼을 때 메시지를 수신 가능하다.
    ws.on('close', (code, reason) => {
      console.log('client video ws close', {
        username,
        uuid,
        code,
        reason: reason.toString(),
      })
      try {
        if (videoWs?.readyState === WebSocket.OPEN) {
          videoWs?.close(1000, reason)
        }
      } catch (err) {
        console.log('client video ws close error', uuid, errorToString(err))
      }

      delete connections[uuid]
    })

    ws.on('ping', async (data) => {
      await evolutionOpenPromise
      if (videoWs.readyState === WebSocket.OPEN) {
        videoWs.ping(data)
      }
    })
    ws.on('pong', async (data) => {
      await evolutionOpenPromise
      if (videoWs.readyState === WebSocket.OPEN) {
        videoWs.pong(data)
      }
    })

    if (ws.readyState === WebSocket.CLOSED) {
      throw 'already client closed'
    }

    const username = user.agentCode + user.userId

    const requestUrl = new URL(request.url, 'wss://' + loginData.streamHost2)

    const evolutionWsUrl = requestUrl.href

    // Decode JWT videoToken to check dlh field
    const videoToken = requestUrl.searchParams.get('videoToken')
    if (videoToken) {
      try {
        const jwtPayload = JSON.parse(Buffer.from(videoToken.split('.')[1], 'base64').toString())
        console.log('===== JWT Decoded Payload =====')
        console.log('dlh (domain host):', jwtPayload.dlh)
        console.log('roh (referrer origin host):', jwtPayload.roh)
        console.log('csn (casino):', jwtPayload.csn)
        console.log('==============================')
      } catch (err) {
        console.log('Failed to decode JWT:', err.message)
      }
    }

    // Evolution 메인 도메인
    const evolutionOrigin = loginData.evolutionUrl || `https://${requestUrl.host}`

    // 사용자 브라우저 헤더를 그대로 사용하되, 프록시 흔적 제거 및 도메인 교체
    const sendHeaders = { ...request.headers } as Record<string, string | string[]>

    // Cloudflare/Caddy/Proxy 흔적 제거
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

    // 필수: host는 Evolution 비디오 서버로 변경
    sendHeaders.host = requestUrl.host
    delete sendHeaders.Host

    // origin이 있으면 fake-node 도메인을 Evolution 도메인으로 교체
    if (sendHeaders.origin && typeof sendHeaders.origin === 'string') {
      if (sendHeaders.origin.includes('soft-evo-games.com')) {
        sendHeaders.origin = evolutionOrigin
        console.log(`[Video WS] Origin: ${request.headers.origin} → ${evolutionOrigin}`)
      }
    }
    delete sendHeaders.Origin

    // referer가 있으면 fake-node 도메인을 Evolution 도메인으로 교체 (경로 유지)
    if (sendHeaders.referer && typeof sendHeaders.referer === 'string') {
      if (sendHeaders.referer.includes('soft-evo-games.com')) {
        const refererUrl = new URL(sendHeaders.referer)
        const newReferer = `${evolutionOrigin}${refererUrl.pathname}${refererUrl.search}`
        sendHeaders.referer = newReferer
        console.log(`[Video WS] Referer: ${request.headers.referer} → ${newReferer}`)
      }
    }
    delete sendHeaders.Referer

    console.log('connected video socket', username, request.url, evolutionWsUrl, 'evolutionOrigin:', evolutionOrigin)
    console.log('sendHeaders keys:', Object.keys(sendHeaders).join(', '))

    const videoWs = new WebSocket(evolutionWsUrl, { headers: sendHeaders })

    videoWs.on('open', () => {
      console.log(`videoWs socket open`, uuid)
      evolutionOpenResolve()
    })

    videoWs.on('ping', (data) => {
      console.log('videoWs ping', data)
      ws.ping(data)
    })

    videoWs.on('pong', (data) => {
      console.log('videoWs pong', data)
      ws.pong(data)
    })

    videoWs.on('message', (data, isBinary) => {
      if (isBinary) {
        ws.send(data)
      } else {
        ws.send(data.toString())
      }
    })

    videoWs.on('upgrade', (response) => {
      console.log('videoWs upgrade', response.statusCode, response.statusMessage, JSON.stringify(response.headers))
    })
    videoWs.on('unexpected-response', (request, response) => {
      console.log(
        'videoWs unexpected-response',
        response.statusCode,
        response.statusMessage,
        'request headers:',
        JSON.stringify(sendHeaders),
        'response headers:',
        JSON.stringify(response.headers),
      )
    })
    videoWs.on('close', (code, reason) => {
      console.log('videoWs close', {
        username,
        uuid,
        code,
        reason: reason.toString(),
        evolutionWsUrl,
      })
      if (ws.readyState === WebSocket.OPEN) {
        ws?.close(code, reason)
      }
    })
    videoWs.on('error', (err) => {
      console.log('videoWs error', uuid, err)
    })
  } catch (err) {
    console.log(err)
    ws?.close(1000)
  }
}
