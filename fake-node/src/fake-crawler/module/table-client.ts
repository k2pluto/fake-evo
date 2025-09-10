import { makeInstanceId, randomString } from '../../common/util'
import { WebSocket, type RawData } from 'ws'
import { SocketClient } from './socket-client'
import { processTables } from './client-router'

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

/* const CLIENT_VIDEO_V2_HEARTBEAT = {
  log: {
    type: 'CLIENT_VIDEO_V2_HEARTBEAT',
    value: {
      metrics: {
        droppedFrames: 0,
        observedLowFps: 23.11,
        observedMinBuffer: 1027,
        observedMaxBuffer: 1705,
        latency: 1851,
        bufferTime: 0,
      },
      logic: { currentPlayer: 'fmp4', currentQuality: 'HD', currentToken: null },
      client: { timestamp: 1667480388265, pointInTime: 405885 },
      session: {
        videoSessionId:
          'qq6y2dq2khjhaojr-qq6y2dq2khjhaojrqq6y2drnkhjhaojs6487fabd1428bf70b596bf99e8d1949aca6dfcae1f9399d6-onokyd4wn7uekbjx-83affe',
        gameType: 'baccarat',
      },
      v: '13.13.0',
    },
  },
} */

function makePing() {
  return { id: randomString(10), type: 'metrics.ping', args: { t: new Date().getTime() } }
}

export class TableClient extends SocketClient {
  interval: NodeJS.Timeout
  vendor: string
  tableId: string
  dataResolve: (data: RawData) => void
  constructor(
    public url: string,
    vendor: string,
    tableId: string,
    cookie: string,
  ) {
    super()

    // const evolutionWsUrl = new URL(request.url, loginData.evolutionUrl.replace('https://', 'wss://')).href

    const urlObj = new URL(url).href

    console.log('TableClient', urlObj)
    console.log('TableClient cookie', cookie)

    this.vendor = vendor
    this.tableId = tableId

    /* const ws = new WebSocket(urlObj, {
      headers: {
        Host: urlObj.host,
        Origin: 'https://' + urlObj.host,
        //Cookie: `lang=ko;locale=ko;EVOSESSIONID=${evoSessionId}`,
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'ko,en',
      },
    }) */
    const ws = new WebSocket(urlObj)

    const startTime = Date.now()

    ws.on('open', () => {
      console.log('Open TableClient Websocket', url, (Date.now() - startTime) / 1000 + 's')

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
      console.log(`close TableClient Websocket`, code, reason.toString(), (Date.now() - startTime) / 1000 + 's')
      if (this.interval != null) {
        clearInterval(this.interval)
      }
    })
    ws.on('error', (err) => {
      console.log(`error TableClient Websocket`, JSON.stringify(err))
    })
    ws.on('message', (data) => {
      if (this.dataResolve != null) {
        this.dataResolve(data)
        this.dataResolve = null
      }

      const jsonStr = data.toString()

      const jsonObj = JSON.parse(jsonStr)

      const processor = processTables[jsonObj.type]
      if (processor != null) {
        processor(this, jsonObj, this.vendor)
      }
    })
    this.ws = ws
  }

  async dataPromise(): Promise<RawData> {
    return await new Promise((resolve) => {
      this.dataResolve = resolve
    })
  }
}

export function createTableClient(
  evolutionHostUrl: string,
  vendor: string,
  cookie: string,
  user_id: string,
  evoSessionId: string,
  client_version: string,
  tableId: string,
  vt_id?: string,
) {
  const instanceId = makeInstanceId(user_id, tableId, vt_id)
  const wssUrl = `wss://${evolutionHostUrl}/public/baccarat/player/game/${tableId}/socket?messageFormat=json&instance=${instanceId}&tableConfig=${
    vt_id ?? tableId
  }&EVOSESSIONID=${evoSessionId}&client_version=${client_version}`

  const client = new TableClient(wssUrl, vendor, tableId, cookie)

  return client
}
