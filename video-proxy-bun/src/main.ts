import { ServerWebSocket } from 'bun'
import { MongoClient } from 'mongodb'
import { heapStats } from 'bun:jsc'

// alloc heap arraybyte 1024mb

setInterval(() => {
  console.log('Heap', (heapStats().heapCapacity / 1024 / 1024).toFixed(0) + 'mb')
}, 60_000)

const https = process.env.USE_HTTPS === 'true'

const client = new MongoClient('mongodb://mindu:1234!@3.115.218.82:19123')

const db = client.db('apiDB')

interface FakeLoginData {
  username: string
  sessionId: string
  streamHost2: string
  evolutionUrl: string
}

const collection = db.collection<FakeLoginData>('fake_login_data')

console.log('Bun start2 4000')

interface SessionData {
  sessionId: string
  loginData: FakeLoginData
  clientWs: ServerWebSocket<SessionData>
  videoWs: WebSocket
  initMessage: string[]
}

const sessions: { [key: string]: SessionData } = {}

function randomHost() {
  return `seoa-mdp-e0${Math.random() * 5 + 1}.egcvi.com`
}

Bun.serve<SessionData>({
  fetch: async (req, server) => {
    const url = new URL(req.url)

    if (url.pathname === '/health') {
      return new Response('OK')
    }

    const sessionId = url.searchParams.get('videoSessionId')?.split('-')[1]

    const debugEntryUsername = url.searchParams.get('debugEntry')

    if (sessionId == null && debugEntryUsername == null) {
      return new Response('invalid parameter', { status: 500 })
    }

    let loginData: FakeLoginData
    if (debugEntryUsername != null) {
      loginData = await collection.findOne({ username: debugEntryUsername })
    } else if (sessionId != null) {
      loginData = await collection.findOne({ sessionId })
    }
    if (loginData == null) {
      throw 'can not find sessionId ' + sessionId + ' url ' + url
    }

    const sendHeaders = {
      CacheControl: 'no-cache',
      Cookie: req.headers.get('cookie') ?? '',
      Pragma: 'no-cache',
      Origin: loginData.evolutionUrl,
      Host: url.host,
      'User-Agent': req.headers['user-agent'],
      'Accep-Encoding': req.headers['accept-encoding'],
      'Accep-Language': req.headers['accept-language'],
    }

    if (loginData.streamHost2 == null) {
      console.log('streamHost2 is null', loginData.username)
    }

    const streamHost2 = loginData.streamHost2 ?? randomHost()

    const requestUrl = 'wss://' + streamHost2 + url.pathname + url.search

    //const evolutionWsUrl = requestUrl.href
    console.log('connected video socket', loginData.username, requestUrl, JSON.stringify(sendHeaders))

    //const videoWs = new WebSocket(evolutionWsUrl, { headers: sendHeaders })
    const videoWs = new WebSocket(requestUrl)
    //const videoWs = new WebSocket('https://echo.websocket.org')

    const sessionData: SessionData = (sessions[sessionId] = {
      sessionId,
      loginData,
      clientWs: null,
      videoWs,
      initMessage: [],
    })

    videoWs.onmessage = (event) => {
      //console.log('videoWs message')
      if (sessionData.clientWs?.readyState === WebSocket.OPEN) {
        //if(event.type)
        sessionData.clientWs.send(event.data)
      }
    }

    videoWs.onclose = (event) => {
      console.log('videoWs close ', sessionData.loginData?.username, sessionId, event.code, event.reason.toString())
      if (sessionData.clientWs?.readyState === WebSocket.OPEN) {
        sessionData.clientWs.close(event.code, event.reason.toString())
      }
      delete sessions[sessionId]
    }

    videoWs.onopen = (event) => {
      console.log('videoWs open', sessionData.loginData?.username, sessionId)
      if (sessionData.initMessage.length > 0) {
        sessionData.initMessage.forEach((message) => {
          videoWs.send(message)
        })
        sessionData.initMessage = []
      }
    }

    /*
    videoWs.on('message', (data, isBinary) => {
      if (session.clientWs?.readyState === WebSocket.OPEN) {
        if (isBinary) {
          session.clientWs.send(data as Buffer)
        } else {
          session.clientWs.send(data.toString())
        }
      }
    })

    videoWs.on('close', (code, reason) => {
      if (session.clientWs?.readyState === WebSocket.OPEN) {
        session.clientWs.close(code, reason.toString())
      }
      delete sessions[uuid]
    })*/

    // upgrade the request to a WebSocket
    if (server.upgrade(req, { data: sessionData })) {
      return // do not return a Response
    }
    return new Response('Upgrade failed', { status: 500 })
  },
  websocket: {
    open: (ws) => {
      const sessionData = ws.data
      console.log('clientWs open', sessionData.loginData?.username, sessionData.sessionId)
      sessionData.clientWs = ws
    },
    message: (ws, message) => {
      const sessionData = ws.data
      if (sessionData.videoWs?.readyState === WebSocket.OPEN) {
        sessionData.videoWs.send(message)
      } else {
        sessionData.initMessage.push(message as string)
      }
    },
    close: (ws, code, reason) => {
      const sessionData = ws.data
      console.log('clientWs close', sessionData.loginData?.username, sessionData.sessionId, code)
      if (sessionData.videoWs?.readyState === WebSocket.OPEN) {
        sessionData.videoWs.close(code, reason)
      }
      delete sessions[sessionData.sessionId]
    },
  },
  ...(https ? { tls: { cert: Bun.file('key/cert.pem'), key: Bun.file('key/private.pem') } } : {}),
  /*tls: {
    cert: Bun.file('key/cert.pem'),
    key: Bun.file('key/private.pem'),
  },*/
  port: 4000,
})

process.on('beforeExit', () => console.log('beforeExit'))
// @ts-ignore
process.on('exit', () => console.log('exit'))

process.on('SIGHUP', () => {
  console.log('SIGHUP')
  process.exit(128 + 1)
})
process.on('SIGINT', () => {
  console.log('SIGINT')
  process.exit(128 + 2)
})
process.on('SIGTERM', () => {
  console.log('SIGTERM')
  process.exit(128 + 15)
})
process.on('SIGBREAK', () => {
  console.log('SIGBREAK')
  process.exit(128 + 21)
})
