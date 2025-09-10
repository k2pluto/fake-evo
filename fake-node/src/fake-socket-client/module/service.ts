import axios from 'axios'

import WebSocket from 'ws'

import * as cheerio from 'cheerio'
import { getUserInfo, printAxiosErrorLog, randomString } from '../../common/util'
import { EvolutionSetupData } from '../../common/types'

const cookies: { [username: string]: string } = {}

async function connectEvolution(username: string, tableId: string, evolutionEntryUrl: string, vendor: string) {
  const evolutionUrl = new URL(evolutionEntryUrl)

  let evolutionCookie = ''
  try {
    await axios.get(evolutionEntryUrl, {
      //withCredentials: true,
      headers: {
        'Cache-Control': 'max-age=0',
        Connection: 'keep-alive',
        //Host: evolutionUrl,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
        Cookie:
          //'cdn=https://static.egcdn.com; lang=ko; EVOSESSIONID=qqckq2ppouun3morqqcn3srtzwbn7obz1fd77f2b6880659b3b9c604c548cbd11e8caca9c85d64271',
          'cdn=https://static.egcdn.com; lang=ko; EVOSESSIONID=',
      },
      maxRedirects: 0,
    })
  } catch (err) {
    if (err.response.status === 302) {
      console.log('evolution headers')
      console.log(JSON.stringify(err.response.headers))
      console.log(err.response.data)
      const setCookies: string[] = err.response.headers['set-cookie']
      if (Array.isArray(setCookies)) {
        evolutionCookie = setCookies.join(';')
        cookies[username] = evolutionCookie
      } else {
        evolutionCookie = cookies[username]
      }
    } else {
      throw new Error('에볼루션 Entry Url 호출 실패')
    }
  }

  console.log('evolutionCookie : ' + evolutionCookie)
  if (evolutionCookie == null) {
    throw new Error('에볼루션 쿠키를 얻지 못했습니다.')
  }

  const setup = await axios
    .get(`${evolutionUrl.origin}/setup?device=desktop&wrapped=true`, {
      //withCredentials: true,
      headers: {
        'Cache-Control': 'max-age=0',
        Connection: 'keep-alive',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
        Cookie: evolutionCookie,
      },
    })
    .catch(() => {
      throw new Error('에볼루션 setup 호출 실패')
    })

  const setupData: EvolutionSetupData = setup.data

  const evoSessionId = setupData.session_id

  const htmlRes = await axios.get(`${evolutionUrl.origin}${setupData.casinoConfig.gameClientUrl}`, {
    //withCredentials: true,
    headers: {
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
      Cookie: evolutionCookie,
    },
  })

  const html: string = htmlRes.data

  const regexRes = html.match(/Build Version: ([\w.-]+)/)

  const client_version = regexRes[1] ?? '6.20230920.225605.31467-52b9cf4b6f'

  //const lobbyTables = await getLobbyTables(evolutionUrl.host, setupData.user_id, evoSessionId, client_version)

  // lightning 카드 정보까지 주는 버전
  //const client_version = '6.20221014.154029.16296-564b2c3f32'

  // 최신버전은 lightning 카드 정보까지 안주고 multiply 정보만 주는 듯 하다.

  return {
    evolutionUrl,
    evoSessionId,
    vendor,
    tableId,
    evolutionCookie,
    client_version,
    setupData,
  }
}

export interface LobbyTableInfo {
  bl: { min: 1000; max: 10000000 }
  descrKey: string // 'lightning'
  frontendApp: string // 'baccarat.prosperity'
  gp: string // 'evolution'
  gst: string // 'prosperitytree'
  gt: string // 'baccarat'
  gv: string // 'live'
  published: boolean // true
  title: string // '번영의 나무 바카라'
}

export async function getLobbyTables(
  evolutionUrlHost: string,
  user_id: string,
  evoSessionId: string,
  client_version: string,
): Promise<{
  [tableId: string]: LobbyTableInfo
}> {
  return new Promise((resolve, reject) => {
    const wssUrl = `wss://${evolutionUrlHost}/public/lobby/socket/v2/${user_id}?messageFormat=json&device=Desktop&instance=${randomString(
      5,
    )}-${user_id}-&EVOSESSIONID=${evoSessionId}&client_version=${client_version}`

    console.log('getLobbyTables wssUrl : ' + wssUrl)

    const ws = new WebSocket(wssUrl, {
      headers: {
        Host: evolutionUrlHost,
        Origin: `https://${evolutionUrlHost}`,
        Cookie: `lang=ko;locale=ko;EVOSESSIONID=${evoSessionId}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    })

    ws.on('open', () => {
      console.log('Open lobby Websocket ' + wssUrl)

      ws.send(
        JSON.stringify({
          id: randomString(10),
          type: 'lobby.initLobby',
          args: {
            version: 2,
          },
        }),
      )
    })

    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`close lobby Websocket ${code} ${reason.toString()}`)
    })
    ws.on('error', (err) => {
      console.log(`error lobby Websocket ${wssUrl} ${err}`)
    })
    ws.on('message', (data) => {
      const jsonStr = data.toString()

      const jsonObj = JSON.parse(jsonStr)

      if (jsonObj.type === 'lobby.configs') {
        ws.close()
        resolve(jsonObj.args.configs)
      }
    })
  })
}

export async function getHonorlinkGameUrl(agentCode: string, userId: string): Promise<string> {
  const res = await axios.get(`https://token.blackmambalive.com/honorlink/token?username=${agentCode + userId}`)

  console.log(JSON.stringify(res.data))
  const { gameUrl } = res.data
  return gameUrl
}

export async function connectHonorlinkCrawler(username: string, tableId: string) {
  console.log(`connectHonorlinkCrawler username : ${username} tableId : ${tableId}`)

  const { agentCode, userId } = getUserInfo(username)
  const gameUrl = await getHonorlinkGameUrl(agentCode, userId)
  if (gameUrl == null) {
    throw new Error('getGameUrl 실패')
  }

  console.log(gameUrl)

  let evolutionEntryUrl: string

  for (let i = 0; ; i++) {
    console.log('open honorlink count ' + i)

    try {
      await axios.get(gameUrl, { maxRedirects: 0 })
      break
    } catch (err) {
      if (err.response.status === 302) {
        const $ = cheerio.load(err.response.data)
        evolutionEntryUrl = $('a').text()
        break
      }
      printAxiosErrorLog(err)
    }

    if (i >= 4) {
      throw new Error('벤더 사 응답이 없습니다. 나중에 다시 시도해 주세요.')
    }
  }

  return connectEvolution(username, tableId, evolutionEntryUrl, 'honorlink')
}

export async function getSwixGameUrl(agentCode: string, userId: string): Promise<string> {
  const res = await axios.get(`https://token.blackmambalive.com/swix/token?username=${agentCode + userId}`)

  console.log(JSON.stringify(res.data))
  const { gameUrl } = res.data
  return gameUrl
}

export async function connectSwixCrawler(username: string, tableId: string) {
  console.log(`connectSwixCrawler username : ${username} tableId : ${tableId}`)

  const { agentCode, userId } = getUserInfo(username)
  const gameUrl = await getSwixGameUrl(agentCode, userId)
  if (gameUrl == null) {
    throw new Error('getGameUrl 실패')
  }

  return connectEvolution(username, tableId, gameUrl, 'swix')
}

export async function getUnionGameGameUrl(agentCode: string, userId: string): Promise<string> {
  const res = await axios.get(`https://token.blackmambalive.com/uniongame/token?username=${agentCode + userId}`)

  console.log(JSON.stringify(res.data))
  const { gameUrl } = res.data
  return gameUrl
}

export async function connectUniongameCrawler(username: string, tableId: string) {
  console.log(`connectUniongameCrawler username : ${username} tableId : ${tableId}`)

  const { agentCode, userId } = getUserInfo(username)
  const gameUrl = await getUnionGameGameUrl(agentCode, userId)
  if (gameUrl == null) {
    throw new Error('getGameUrl 실패')
  }

  return connectEvolution(username, tableId, gameUrl, 'uniongame')
}
