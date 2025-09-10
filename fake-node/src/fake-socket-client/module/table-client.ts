import { randomString } from '../../common/util'
import WebSocket from 'ws'

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

function makePing() {
  return { id: randomString(10), type: 'metrics.ping', args: { t: new Date().getTime() } }
}

export class TableClient {
  ws: WebSocket
  interval: NodeJS.Timeout
  vendor: string
  tableId: string
  balanceUpdated = false
  dataResolve: (data: WebSocket.RawData) => void
  constructor(
    public url: string,
    vendor: string,
    tableId: string,
    cookie: string,
  ) {
    // const evolutionWsUrl = new URL(request.url, loginData.evolutionUrl.replace('https://', 'wss://')).href
    // const evolutionWs = new WebSocket(evolutionWsUrl)

    console.log(url)

    const urlObj = new URL(url)
    const ws = new WebSocket(urlObj, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Cookie: cookie,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'ko,en',
        'Cache-Control': 'no-cache',
        Connection: 'Upgrade',
        Host: urlObj.host,
        Origin: 'https://' + urlObj.host,
        Pragma: 'no-cache',
        'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13',
        Upgrade: 'websocket',
      },
    })

    this.vendor = vendor
    this.tableId = tableId

    ws.on('open', () => {
      console.log('Open Websocket ' + url)

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
      console.log(`close Websocket ${code} ${reason.toString()}`)
      if (this.interval != null) {
        clearInterval(this.interval)
      }
    })
    ws.on('error', (err) => {
      console.log(`error Websocket ${err}`)
    })
    ws.on('message', (data) => {
      if (this.dataResolve != null) {
        this.dataResolve(data)
        this.dataResolve = null
      }
      const jsonStr = data.toString()

      const jsonObj = JSON.parse(jsonStr)

      if (jsonObj.type === 'baccarat.gameState') {
        console.log(jsonStr)
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
  const instanceId = `${randomString(6)}-${user_id}-${vt_id ?? tableId}`
  const wssUrl = `wss://${evolutionHostUrl}/public/baccarat/player/game/${tableId}/socket?messageFormat=json&instance=${instanceId}&tableConfig=${
    vt_id ?? tableId
  }&EVOSESSIONID=${evoSessionId}&client_version=${client_version}`

  const client = new TableClient(wssUrl, vendor, tableId, cookie)

  return client
}
