import { MINUTE_MS, sleep } from '../../common/util'
import { type MultiClient, createMultiClient } from './multi-client'
import { type ConnectInfo, connectHonorlinkCrawler, connectSwixCrawler, connectUniongameCrawler } from './service'

const connectEnv = process.env.STAGE_ENV

export class MultiCrawler {
  usernameQueue: string[] = []

  client: MultiClient

  constructor(public usernames: string[]) {}

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

        const client = createMultiClient(
          info.evolutionUrl.host,
          info.vendor,
          info.evolutionCookie,
          info.setupData.user_id,
          info.evoSessionId,
          info.client_version,
        )

        await client.dataPromise()
        return client
      } catch (err) {
        console.log(`connect fail multi retry ${retryCount++}`)
      }
      await sleep(MINUTE_MS)
    }
  }

  async loop() {
    while (true) {
      console.log(`retry connect multi`)
      const client = await this.retryConnect()
      const oldClient = this.client
      if (oldClient?.ws != null) {
        oldClient.ws.close()
      }
      this.client = client

      // 30분마다 커넥션이 끊어지기 때문에 20분마다 크롤러를 추가 한다.
      await sleep(MINUTE_MS * 20)
    }
  }

  async init() {
    this.loop()
  }
}
