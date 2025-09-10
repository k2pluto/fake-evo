import WebSocket from 'ws'

import { makeInstanceId, randomString } from '../../common/util'
import { processTables } from './client-router'
import { SocketClient } from './socket-client'

const CLIENT_SOCKET_CONNECTION_ESTABLISHED = {
  log: {
    type: 'CLIENT_SOCKET_CONNECTION_ESTABLISHED',
    value: {
      reconnectionCount: 0,
      channel: 'PCMac',
      orientation: 'landscape',
      gameDimensions: { width: 1600, height: 900 },
      gameId: '',
    },
  },
}

function createSettingsRead(key: string) {
  return { id: randomString(10), type: 'settings.read', args: { key } }
}
function createSubscribeTable(tableId: string) {
  return { id: randomString(10), type: 'widget.subscribeTable', args: { tableId } }
}

function makePing() {
  return { id: randomString(10), type: 'metrics.ping', args: { t: new Date().getTime() } }
}

export class MultiClient extends SocketClient {
  interval: NodeJS.Timeout
  vendor: string
  dataResolve: (data: WebSocket.RawData) => void
  constructor(
    public url: string,
    vendor: string,
    cookie: string,
  ) {
    super()
    // const evolutionWsUrl = new URL(request.url, loginData.evolutionUrl.replace('https://', 'wss://')).href
    // const evolutionWs = new WebSocket(evolutionWsUrl)

    console.log('MultiClient', url)
    this.vendor = vendor

    const urlObj = new URL(url)
    const ws = new WebSocket(urlObj, {
      headers: {
        Host: urlObj.host,
        Origin: 'https://' + urlObj.host,
        // Cookie: `lang=ko;locale=ko;EVOSESSIONID=${evoSessionId}`,
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'ko,en',
        /* 'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13', */
      },
    })

    const startTime = Date.now()
    ws.on('open', () => {
      console.log('Open MultiClient Websocket', url, (Date.now() - startTime) / 1000 + 's')

      ws.send(JSON.stringify(CLIENT_SOCKET_CONNECTION_ESTABLISHED))
      ws.send(JSON.stringify(createSettingsRead('generic.common')))
      ws.send(JSON.stringify(createSettingsRead('baccarat.common')))
      ws.send(JSON.stringify(createSettingsRead('generic.mobile')))
      ws.send(JSON.stringify(createSettingsRead('generic.phone')))
      ws.send(JSON.stringify(createSettingsRead('generic.tablet')))
      ws.send(JSON.stringify(createSettingsRead('baccarat.live')))

      /* setTimeout(() => {
        ws.send(JSON.stringify(createFetchBalance()))
      }, 1000) */

      this.interval = setInterval(() => {
        ws.send(JSON.stringify(makePing()))
      }, 5000)
    })

    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`close MultiClient Websocket`, code, reason.toString(), (Date.now() - startTime) / 1000 + 's')
      if (this.interval != null) {
        clearInterval(this.interval)
      }
    })
    ws.on('error', (err) => {
      console.log(`error MultiClient Websocket`, JSON.stringify(err))
    })
    ws.on('message', (data) => {
      if (this.dataResolve != null) {
        this.dataResolve(data)
        this.dataResolve = null
      }

      const jsonStr = data.toString()
      const jsonObj = JSON.parse(jsonStr)

      if (jsonObj.type === 'widget.availableTables') {
        const availableTables = jsonObj.args.availableTables as Array<{
          tableId: string
          tableName: string
          vtId: string
        }>

        for (const table of availableTables) {
          ws.send(JSON.stringify(createSubscribeTable(table.tableId)))
        }
      }
      const processor = processTables[jsonObj.type]
      if (processor != null) {
        processor(this, jsonObj, this.vendor)
      }
    })
    this.ws = ws
  }

  async dataPromise(): Promise<WebSocket.RawData> {
    return await new Promise((resolve) => {
      this.dataResolve = resolve
    })
  }
}

export function createMultiClient(
  evolutionHostUrl: string,
  vendor: string,
  cookie: string,
  user_id: string,
  evoSessionId: string,
  client_version: string,
) {
  const instanceId = makeInstanceId(user_id)

  const wssUrl = `wss://${evolutionHostUrl}/public/baccarat/player/game/multiwidget/socket?messageFormat=json&instance=${instanceId}&tableConfig=&EVOSESSIONID=${evoSessionId}&client_version=${client_version}`

  const client = new MultiClient(wssUrl, vendor, cookie)

  return client
}
