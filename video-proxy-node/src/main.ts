import WebSocket from 'ws'

import tls from 'tls'
tls.DEFAULT_CIPHERS =
  'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'

import uws from 'uWebSockets.js'

import { MongoClient } from 'mongodb'
const client = new MongoClient('mongodb://mindu:1234!@3.115.218.82:19123')

const db = client.db('apiDB')

interface FakeLoginData {
  username: string
  sessionId: string
  streamHost2: string
  evolutionUrl: string
}

const collection = db.collection<FakeLoginData>('fake_login_data')

//const https = false
const https = true

interface SessionData {
  sessionId: string
  pathname: string
  query: string
  requestHeaders: Record<string, string>
  loginData: FakeLoginData
  clientWs: uws.WebSocket<unknown>
  videoWs: WebSocket
  initMessage: string[]
}

async function main() {
  /*const loginData = await collection.findOne({
    sessionId: 'rnpt7vre2xyaa7oxsbpzoymvrz57rtcgf45c81654117e94b929d1b23d9b6e44a2aa4d0b0300f0936',
  })*/

  const app = https
    ? uws.SSLApp({
        /* There are more SSL options, cut for brevity */
        key_file_name: 'key/private.pem',
        cert_file_name: 'key/cert.pem',
      })
    : uws.App()

  app
    .get('/health', (res, req) => {
      /* It does Http as well */
      res.writeStatus('200 OK').writeHeader('IsExample', 'Yes').end('OK')
    })
    .ws<SessionData>('/*', {
      /* There are many common helper features */
      idleTimeout: 32,
      maxBackpressure: 1024,
      maxPayloadLength: 512,
      //compression: DEDICATED_COMPRESSOR_3KB,

      upgrade: (res, req, context) => {
        const query = req.getQuery()

        const pathname = req.getUrl()

        const params = new URLSearchParams(query)
        let sessionId = params.get('videoSessionId')?.split('-')[1]
        if (sessionId == null) {
          console.log('invalid sessionId', sessionId)
          res.end('invalid sessionId')
          return
        }

        const headers = {}
        for (const key of ['user-agent', 'accept-encoding', 'accept-language']) {
          headers[key] = req.getHeader(key)
        }

        res.upgrade(
          {
            sessionId,
            pathname,
            query,
            requestHeaders: headers,
          },
          /* Spell these correctly */
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'),
          context,
        )
      },

      open: async (ws) => {
        try {
          const userData = ws.getUserData() as SessionData
          userData.initMessage = []
          userData.clientWs = ws

          const sessionId = userData.sessionId
          const loginData = await collection.findOne({ sessionId })
          if (loginData == null) {
            ws.close()
            //res.end('can not find sessionId')
            return
          }

          const headers = userData.requestHeaders

          const requestUrl = 'wss://' + loginData.streamHost2 + userData.pathname + userData.query

          const sendHeaders = {
            CacheControl: 'no-cache',
            Pragma: 'no-cache',
            Origin: loginData.evolutionUrl,
            Host: loginData.streamHost2,
            'User-Agent': headers['user-agent'],
            'Accep-Encoding': headers['accept-encoding'],
            'Accep-Language': headers['accept-language'],
          }
          //const evolutionWsUrl = requestUrl.href
          console.log('connect video socket', sessionId, loginData.username, requestUrl, JSON.stringify(sendHeaders))

          //const videoWs = new WebSocket(requestUrl, { headers: sendHeaders })

          const videoWs = new WebSocket(requestUrl)

          videoWs.on('open', () => {
            console.log('videoWs open')
          })

          userData.videoWs = videoWs

          videoWs.on('message', (data, isBinary) => {
            if (isBinary) {
              userData.clientWs.send(data as Buffer)
            } else {
              userData.clientWs.send(data.toString())
            }
          })

          videoWs.on('close', (code, reason) => {
            //if (userData.clientWs?.readyState === WebSocket.OPEN) {
            //userData.clientWs.close(code, reason.toString())
            //}
            if (userData.clientWs != null) {
              userData.clientWs.close()
            }
          })
        } catch (err) {
          console.log(err)
        }
      },

      /* For brevity we skip the other events (upgrade, open, ping, pong, close) */
      message: (ws, message, isBinary) => {
        /* You can do app.publish('sensors/home/temperature', '22C') kind of pub/sub as well */

        const userData = ws.getUserData() as SessionData

        if (userData.videoWs == null || userData.videoWs.readyState !== WebSocket.OPEN) {
          const string = new TextDecoder().decode(message)
          userData.initMessage.push(string)
        } else {
          userData.videoWs.send(message)
        }
      },
      close: (ws, code, message) => {
        if (ws.getUserData().videoWs) {
          ws.getUserData().videoWs.close(code)
        }
      },
    })
    .listen(4000, (listenSocket) => {
      if (listenSocket) {
        console.log('Listening to port 4000')
      }
    })
}

main()

/*
async function main() {
  try {
    const evolutionWsUrl =
      'wss://seoa-mdp-e01.egcvi.com/app/30/korgm1_bi_med/websocketstream2?vc=h264&ac=aac&videoSessionId=rcu7uehgnhyudf45-rcu7uehgnhyudf45sbpelv6wrz53jcby95f491e170417add30ae10c316a4aec13780c331736cc68f-onokyd4wn7uekbjx-de3594&videoToken=eyJhbGciOiJSUzI1NiIsImtpZCI6ImxpdmUxMDEiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJzZW9hLW1kcC1lMDEiLCJiaWQiOiJzaW5hLXZsb2FkZXIwMSIsImV4cCI6MTcxOTU2ODY0NiwiaXNzIjoiTDF5NnFyZU5MUyIsInN1YiI6ImtvcmdtMV9iIiwidnNpZCI6InJjdTd1ZWhnbmh5dWRmNDUtcmN1N3VlaGduaHl1ZGY0NXNicGVsdjZ3cno1M2pjYnk5NWY0OTFlMTcwNDE3YWRkMzBhZTEwYzMxNmE0YWVjMTM3ODBjMzMxNzM2Y2M2OGYtb25va3lkNHduN3Vla2JqeC1kZTM1OTQifQ.nuZbneIAn2tv2snpWaFWlTzNyQ9BE-HOpJghA_pPhbtNO8_fMiJSQHbZAYfoKATSqySvA94hKkx4G9KTvtCF5u41BcxKaaxk7QO4eiGK5N94Yu8e5amnhsd3aVWzWCSlcQYr0CD8GjhK6-nnaPEkh5n9Gbs7l7H9JMn0A7WZm3oznxeIdCBjiK0pGOWK3ci5WvQsZKLsQIossoAVLcHrnMh96zoiYx0JSLNEiliJkTlUyxH0t9VhYp06TVIttTiuJNdmn8WOkyX9Z5T0MRr1NWgNe3xb59daNkGmCQtsFCjxBkqqQ7_t4dEvUC4JOwXeIOeY8iD1JqX4p8h5lWJBRA'
    const videoWs = new WebSocket(evolutionWsUrl, {
      headers: {
        host: 'seoa-mdp-e01.egcvi.com',
        origin: 'https://0.0.0.0',
      },
    })
    //const videoWs = new WebSocket(evolutionWsUrl, { headers: sendHeaders })

    videoWs.on('open', () => {
      console.log('videoWs open')
    })

    videoWs.on('ping', (data) => {
      console.log('videoWs ping', data)
    })

    videoWs.on('pong', (data) => {
      console.log('videoWs pong', data)
    })

    videoWs.on('message', (data, isBinary) => {
      if (isBinary) {
        console.log('videoWs message binary', data.length)
      } else {
        console.log('videoWs message text', data.length)
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
      console.log('videoWs close', code, reason)
    })
    videoWs.on('error', (err) => {
      console.log('videoWs error', err)
    })
  } catch (err) {
    console.log(err)
  }
}*/
