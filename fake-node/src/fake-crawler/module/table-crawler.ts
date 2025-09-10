import { MINUTE_MS, randomString, sleep } from '../../common/util'
import {
  type ConnectInfo,
  type LobbyTableInfo,
  connectHonorlinkCrawler,
  connectSwixCrawler,
  connectUniongameCrawler,
  getLobbyTables,
} from './service'
import { type TableClient, createTableClient } from './table-client'

const connectEnv = process.env.STAGE_ENV

export class TableCrawler {
  usernameQueue: string[] = []

  client: TableClient

  constructor(
    public usernames: string[],
    public tableId: string,
  ) {}

  popUsername() {
    if (this.usernameQueue.length === 0) {
      this.usernameQueue = [...this.usernames]
    }

    return this.usernameQueue.pop()
  }

  async retryConnect() {
    let retryCount = 0
    while (true) {
      try {
        let info: ConnectInfo
        if (connectEnv === 'swix') {
          info = await connectSwixCrawler(this.popUsername())
        } else if (connectEnv === 'uniongame') {
          info = await connectUniongameCrawler(this.popUsername())
        } else {
          info = await connectHonorlinkCrawler(this.popUsername())
        }

        const lobbyTableRes = await getLobbyTables(
          info.evolutionUrl.host,
          info.setupData.user_id,
          info.evoSessionId,
          info.client_version,
        )

        const lobbyTables: Record<string, LobbyTableInfo & { vt_id: string }> = {}
        for (const [rawTableId, value] of Object.entries(lobbyTableRes.configs)) {
          const [tableId, vt_id] = rawTableId.split(':')
          lobbyTables[tableId] = {
            ...value,
            vt_id,
          }
        }

        const tableInfo = lobbyTables[this.tableId]

        lobbyTableRes.ws.send(
          JSON.stringify({
            id: randomString(10),
            type: 'lobby.appEvent',
            args: {
              type: 'CLIENT_LOBBY_TABLE_JOIN_CLICK',
              value: {
                categoryId: 'all_games',
                channel: 'PCMac',
                inGame: false,
                layoutBreakpoint: 'SM',
                orientation: 'landscape',
                joinType: 'DirectLaunch',
                lobby_launch_id: '2554a01c026d4551bdeb0486b13afaa4',
                position: 1,
                tableCategoryId: 'top_picks_for_you',
                tableId: this.tableId,
                virtualTableId: tableInfo.vt_id,
                balance: 2316510,
                currency: '₩',
                timeInLobby: 30372,
                url: `${info.evolutionUrl.origin}/frontend/evo/r2/#category=all_games&game=baccarat`,
              },
            },
          }),
        )
        lobbyTableRes.ws.close()

        /*
        const configRes = await axios
          .get(
            `${info.evolutionUrl.origin}/config?table_id=${this.tableId}&vt_id=${tableInfo.vt_id}&client_version=${info.client_version}`,
            {
              //withCredentials: true,
              headers: {
                'Cache-Control': 'max-age=0',
                Connection: 'keep-alive',
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
                Cookie: info.evolutionCookie,
              },
            },
          )
          .catch(() => {
            throw new Error('에볼루션 setup 호출 실패')
          })
        console.log(JSON.stringify(configRes.data)) */

        const client = createTableClient(
          info.evolutionUrl.host,
          info.vendor,
          info.evolutionCookie,
          info.setupData.user_id,
          info.evoSessionId,
          info.client_version,
          this.tableId,
          tableInfo.vt_id,
        )

        await client.dataPromise()
        return client
      } catch (err) {
        console.log(`connect fail ${this.tableId} retry ${retryCount++}`)
      }
      await sleep(MINUTE_MS)
    }
  }

  async loop() {
    while (true) {
      console.log(`retry connect ${this.tableId}`)
      const client = await this.retryConnect()
      const oldClient = this.client
      if (oldClient?.ws != null) {
        oldClient.ws.close()
      }
      this.client = client

      // 30분마다 커넥션이 끊어지기 때문에 10분마다 크롤러를 추가 한다.
      await sleep(MINUTE_MS * 10)
    }
  }

  async init() {
    this.loop()
  }
}
