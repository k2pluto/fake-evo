import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { connections } from '../app'
import { type FastifyRequest } from 'fastify'
import { FakeLoginData } from '../../../../service/src/lib/interface/mongo/fake-login-data'
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
      console.log('client video ws close', uuid, code, reason)
      try {
        if (videoWs?.readyState === WebSocket.OPEN) {
          videoWs?.close(0, reason)
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

    const sendHeaders = {
      CacheControl: 'no-cache',
      Cookie: request.headers.cookie ?? '',
      Pragma: 'no-cache',
      Origin: loginData.evolutionUrl,
      Host: requestUrl.host,
      'User-Agent': request.headers['user-agent'],
      'Accep-Encoding': request.headers['accept-encoding'],
      'Accep-Language': request.headers['accept-language'],
    }

    console.log('connected video socket', username, request.url, evolutionWsUrl, JSON.stringify(sendHeaders))

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
        'evolutionWs unexpected-response',
        response.statusCode,
        response.statusMessage,
        JSON.stringify(response.headers),
      )
    })
    videoWs.on('close', (code, reason) => {
      console.log('videoWs close', uuid, code, reason)
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
