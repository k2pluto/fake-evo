import axios from 'axios'
import { type EvolutionEnv } from '@service/src/vendor/evolution'
import { type EvolutionHistoryItem } from '@service/src/vendor/evolution/interface'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'
import { errorToString } from './util'

export async function crawlEvolutionGameHistoryList(env: EvolutionEnv, begin: Date, end: Date) {
  try {
    console.log(begin)
    const { CASINO_ID, GAME_HISTORY_API_TOKEN, API_URL } = env

    const url = `${API_URL}/api/gamehistory/v1/casino/games?startDate=${begin.toISOString()}&gameProvider=evolution`

    const token = `${CASINO_ID}:${GAME_HISTORY_API_TOKEN}`
    const encodedToken = Buffer.from(token).toString('base64')
    // const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
    axios.defaults.timeout = 60000

    const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

    // settledAt 시간이 startDate보다 큰 히스토리만 가져온다.
    const { data } = res.data as {
      data: Array<{
        games: EvolutionHistoryItem[]
        date: string
      }>
    }

    console.log(`evolution log ${url} data length ${data.length}`)

    if (data.length === 0) {
      return null
    }

    return data?.[0].games
  } catch (err) {
    console.log(`error evo crawlEvolutionGameHistoryList`, errorToString(err))
    return null
  }
}

export async function crawlEvolutionGameHistoryItem(env: EvolutionEnv, bet: BetDataCasino) {
  if (bet.packet.length === 0 || bet.packet[0] === null || bet.packet[0].data === null) {
    return null
  }

  // await Sleep(index)

  const userId: string = bet.packet[0].userId
  const historyId: string = bet.packet[0].game.id
  try {
    const { CASINO_ID, GAME_HISTORY_API_TOKEN, API_URL } = env

    const token = `${CASINO_ID}:${GAME_HISTORY_API_TOKEN}`
    const encodedToken = Buffer.from(token).toString('base64')

    const url = `${API_URL}/api/gamehistory/v1/players/${userId}/games/${historyId}`

    console.log('evolution crawlEvolutionGameHistoryItem', userId, bet.summaryId, bet.betTime.toLocaleString(), url)

    // const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
    const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

    if (res.data == null) {
      return
    }

    const info = res.data.data as EvolutionHistoryItem

    return info
  } catch (err) {
    console.log(`error evo crawlEvolutionGameHistoryItem`, userId, bet.summaryId, errorToString(err))

    return null
  }
}
