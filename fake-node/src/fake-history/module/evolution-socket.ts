import axios from 'axios'
import { Sleep } from '../app'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'
import { evolution } from '../../common/fake-vendors'
import { type IncomingMessage } from 'http'
import { addMinutes } from 'date-fns'

export async function processEvolutionPacket(packet: string) {
  // console.log(packet)

  const jsonObj = JSON.parse(packet)

  console.log(jsonObj)
}

export async function GetEvolutionStream(): Promise<BetDataCasino[]> {
  try {
    const { CASINO_ID, GAME_HISTORY_API_TOKEN, API_URL } = evolution.env

    const startDate = addMinutes(new Date(), -5)

    // const url = `${API_URL}/api/gamehistory/v1/casino/games/stream?startDate=${startDate.toISOString()}`
    const url = `${API_URL}/api/streaming/game/v1?startDate=${startDate.toISOString()}`
    const token = `${CASINO_ID}:${GAME_HISTORY_API_TOKEN}`
    const encodedToken = Buffer.from(token).toString('base64')
    // const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
    axios.defaults.timeout = 60000

    let datas = ''
    let message: IncomingMessage
    while (true) {
      try {
        const res = await axios.get(url, {
          headers: { Authorization: 'Basic ' + encodedToken },
          responseType: 'stream',
        })

        message = res.data
        // message.pipe(process.stdout)

        message.on('data', (chunk) => {
          datas += chunk.toString()
        })

        break
      } catch (err) {
        console.log(`error evo streamingApi`)
        console.log(JSON.stringify(err))
      }
      await Sleep(1000)
    }

    // 여기서 무한 루프를 돈다.
    while (true) {
      await Sleep(1000)

      const splitData = datas.split('\n')
      if (splitData.length === 1) {
        continue
      }

      datas = splitData[splitData.length - 1]

      for (let i = 0; i < splitData.length - 2; i++) {
        try {
          await processEvolutionPacket(splitData[i])
        } catch (err) {
          console.log(err)
        }
      }
    }
  } catch (err) {
    console.log(`error evo streamingApi`)
    console.log(JSON.stringify(err))
  }

  return []
}
