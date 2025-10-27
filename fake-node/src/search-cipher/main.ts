import axios, { Method } from 'axios'
import { WebSocket } from 'ws'

import tls from 'tls'

//tls.DEFAULT_MIN_VERSION = "TLSv1.3";
//tls.DEFAULT_MAX_VERSION = "TLSv1.3";
console.log(tls.DEFAULT_CIPHERS)

const connectVendor = 'swix'
const username = 'tttaa11'

let currentPreset = 0

const tlsSuiteBase = [
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'TLS_AES_128_GCM_SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'DHE-RSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-SHA256',
  'DHE-RSA-AES128-SHA256',
  'ECDHE-RSA-AES256-SHA384',
  'DHE-RSA-AES256-SHA384',
  'ECDHE-RSA-AES256-SHA256',
  'DHE-RSA-AES256-SHA256',
]

// 조합을 생성하는 함수
function getCombinations<T>(arr: T[], selectNumber) {
  const results: T[][] = []
  if (selectNumber === 1) return arr.map((value) => [value])

  arr.forEach((fixed, index, origin) => {
    const rest = origin.slice(index + 1)
    const combinations = getCombinations(rest, selectNumber - 1)
    const attached = combinations.map((combination) => [fixed, ...combination])
    results.push(...attached)
  })

  return results
}

const combinations = getCombinations(tlsSuiteBase, 7)
const tlsSuitesArr = combinations

updateTlsSuites()

export function updateTlsSuites(newPreset?: number) {
  currentPreset = newPreset ?? currentPreset
  if (currentPreset >= tlsSuitesArr.length) {
    currentPreset = 0
  }

  tls.DEFAULT_CIPHERS = tlsSuitesArr[currentPreset].join(':') + ':!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'

  console.log('updateTlsSuites', currentPreset, tls.DEFAULT_CIPHERS)
  currentPreset++
}

/*
'TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
TLS_AES_128_GCM_SHA256
ECDHE-RSA-AES128-GCM-SHA256
ECDHE-ECDSA-AES128-GCM-SHA256
ECDHE-RSA-AES256-GCM-SHA384
ECDHE-ECDSA-AES256-GCM-SHA384
DHE-RSA-AES128-GCM-SHA256
ECDHE-RSA-AES128-SHA256
DHE-RSA-AES128-SHA256
ECDHE-RSA-AES256-SHA384
DHE-RSA-AES256-SHA384
ECDHE-RSA-AES256-SHA256
DHE-RSA-AES256-SHA256
HIGH
!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA
*/

//const connectVendor = "evolution";

export function randomString(e = 10) {
  let t = ''
  for (; t.length < e; )
    t += Math.random()
      .toString(36)
      .substr(2, e - t.length)
  return t
}

const headers = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': 'Windows',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
}

interface ConnectEvoRes {
  sessionId: string
  evolutionCookie: string
}

function parseCookie(cookie: string) {
  const cookieObj: Record<string, string> = {}
  const cookieArr = cookie.split(';')
  for (const cookieStr of cookieArr) {
    const [key, value] = cookieStr.split('=')
    cookieObj[key] = value
  }
  return cookieObj
}

export interface CallEvoOptions {
  headers?: Record<string, string | string[]>
  responseType?: ResponseType
  method?: Method
  body?: any
  timeout?: number
}

export interface CallEvoResponse {
  data?: any
  recvHeaders?: Record<string, string | string[]>
  status: number
}

async function callEvo(
  urlstr: string,
  { headers, responseType, body, timeout, method }: CallEvoOptions = {},
): Promise<CallEvoResponse> {
  console.log("!!!!!!!!!!!!!!!!!!!!callEvo!!!!!!!!!!!!!!!!!!!")
  try {
    const res = await axios.get(urlstr, {
      headers,
      proxy: false,
      maxRedirects: 0,
      timeout: 5000,
    })

    return {
      data: res.data,
      recvHeaders: res.headers as Record<string, string | string[]>,
      status: res.status,
    }
  } catch (err) {
    const { response } = err
    if (response != null) {
      return {
        data: response.data,
        recvHeaders: response.headers as Record<string, string | string[]>,
        status: response.status,
      }
    } else if (err.code === 'ECONNABORTED') {
      // timeout 일 때
      return {
        status: 408, // timeout code
      }
    }
    return {
      status: 500,
    }
  }
}

async function connectEvo(evolutionEntryUrl: URL): Promise<ConnectEvoRes> {
  let sessionId = ''

  let evolutionCookie: string
  let evolutionHeaders: Record<string, string | string[]> = {}

  let accumSetCookies: Record<string, string> = {}

  try {
    for (let i = 0; i < 2; i++) {
      //console.log('connectEvolution', evolutionEntryUrl)
      console.log('connectEvolution', username, evolutionEntryUrl.host)
      const fetchRes = await callEvo(evolutionEntryUrl.toString(), {
        headers: {
          ...headers,
          cookie: evolutionCookie,
        },
        //timeout: 1,
        timeout: 2000,
        //timeout: 10000,
      })
      // const data = await callHttp2('https://google.com')

      if (fetchRes.status !== 302) {
        //console.log('connectEvolution_res error', username, JSON.stringify({ ...fetchRes, orgHeaders: headers }))
        console.log('connectEvolution_res error', fetchRes.status)
        return
      }
      //console.log('connectEvolution_res', username, JSON.stringify(fetchRes))

      evolutionHeaders = fetchRes.recvHeaders

      const setCookies = evolutionHeaders['set-cookie']

      for (let cookieStr of setCookies ?? []) {
        const cookieKey = cookieStr.split('=')[0]
        accumSetCookies[cookieKey] = cookieStr
      }

      if (setCookies == null) {
        const data = fetchRes.data
        console.log('callEntry error', data)
        return
      }

      evolutionCookie = typeof setCookies === 'string' ? setCookies : setCookies.join(';')
      const cookie = parseCookie(evolutionCookie)

      const resSessionId = cookie.EVOSESSIONID

      if (resSessionId != null && resSessionId !== '') {
        sessionId = resSessionId
        break
      } else {
        evolutionEntryUrl = new URL(evolutionEntryUrl.origin + (evolutionHeaders.location as string))
      }
    }
  } catch (err) {
    console.log('connectEvolution error', username)
    return
  }

  return { sessionId, evolutionCookie }
}

async function axiosTest() {
  console.log('axios main')

  //const tls = require("tls");

  //tls.DEFAULT_MIN_VERSION = "TLSv1.1";
  //tls.DEFAULT_MAX_VERSION = "TLSv1.2";
  //const httpAgent = new http.Agent({ keepAlive: true });
  //const httpsAgent = new https.Agent({ keepAlive: true });

  //delete axios.defaults.headers.common["Content-Type"];
  //delete axios.defaults.headers.common["Connection"];
  //delete axios.defaults.headers.common["Content-Encoding"];
  const timeout = 5000
  //const customAxios = axios;
  /*const customAxios = axios.create({
    httpAgent, // httpAgent: httpAgent -> for non es6 syntax
    httpsAgent,
  });*/

  try {
    const tokenRes = await axios.get(`https://token.blackmambalive.com/${connectVendor}/token?username=${username}`)
    const tokenData = tokenRes.data

    if (tokenData.status !== 0) {
      console.log('tokenData.status !== 0')
      return
    }

    console.log('tokenData', JSON.stringify(tokenData))

    const { gameUrl } = tokenData

    const evolutionUrl = new URL(gameUrl)

    let connectRes: ConnectEvoRes
    for (let i = 0; i < tlsSuitesArr.length; i++) {
      connectRes = await connectEvo(evolutionUrl)
      if (connectRes != null) {
        break
      }
      updateTlsSuites()
    }

    const { sessionId, evolutionCookie } = connectRes

    console.log('sessionId', sessionId)
    if (sessionId === '') {
      console.log('sessionId is empty')
      return
    }

    const setupRes = await axios.get(evolutionUrl.origin + '/setup', {
      headers: {
        ...headers,
        Cookie: evolutionCookie,
      },
      proxy: false,
      maxRedirects: 0,
    })

    const setupJson = await setupRes.data
    console.log('setupRes', setupJson)

    const { user_id: userId } = setupJson

    const websocketUrl = `wss://${evolutionUrl.host}/public/lobby/socket/v2/${userId}?messageFormat=json&device=Desktop&instance=${randomString(5)}-${userId}-&EVOSESSIONID=${sessionId}&client_version=6.20240620.70319.42334-3e0c49bf75`
    console.log('websocket url', websocketUrl)

    const evolutionWs = new WebSocket(websocketUrl, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
        origin: evolutionUrl.origin,
        'accept-encoding': 'gzip, deflate, br, zstd',
        cookie: evolutionCookie,
      },
    })

    const createTime = new Date()

    evolutionWs.on('open', () => {
      console.log('open lobby Websocket', new Date().getTime() - createTime.getTime() + 'ms')
      evolutionWs.send(
        JSON.stringify({
          id: randomString(10),
          type: 'lobby.initLobby',
          args: {
            version: 2,
          },
        }),
      )
    })
    evolutionWs.on('close', (code, reason) => {
      console.log(`close lobby Websocket`, code, reason.toString())
    })
    evolutionWs.on('message', (data) => {
      console.log(data.toString())
      console.log('message lobby Websocket exit')
      process.exit(0)
    })
    evolutionWs.on('error', (data) => {
      console.log(data.toString())
    })
  } catch (err) {
    console.log(err)
  }
}

axiosTest()
