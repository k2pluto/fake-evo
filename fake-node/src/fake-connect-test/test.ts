import axios from 'axios'
import { WebSocket } from 'ws'

import tls from 'tls'

//tls.DEFAULT_MIN_VERSION = "TLSv1.3";
//tls.DEFAULT_MAX_VERSION = "TLSv1.3";
console.log(tls.DEFAULT_CIPHERS)

const version = 0 as number
const connectVendor = 'swix'
const username = 'tttaa11'

if (version === 1) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256'
} else if (version === 2) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 3) {
  tls.DEFAULT_CIPHERS =
    'TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 4) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 5) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 6) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 7) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 8) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 9) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 10) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 11) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 12) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 13) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 14) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
} else if (version === 15) {
  tls.DEFAULT_CIPHERS =
    'TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
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

export async function axiosTest() {
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

  try {
    const tokenRes = await axios.get(`https://token.blackmambalive.com/${connectVendor}/token?username=${username}`)
    const tokenData = tokenRes.data

    if (tokenData.status !== 0) {
      console.log('tokenData.status !== 0')
      return
    }

    console.log('tokenData', JSON.stringify(tokenData))

    const { gameUrl } = tokenData

    const evolutionUrl = new URL(gameUrl as string)

    let sessionId = ''

    let cookieString = ''
    try {
      console.log('evolutionUrl', evolutionUrl.toString())
      //요청헤더에 파라미터 입력하기 위해서
      //에보 주소
      //파라미터를 고정해서 분리
      const slicestr = evolutionUrl.toString()
      const s_authority = slicestr.substring(slicestr.indexOf('https://') + 8, slicestr.indexOf('/', 9))
      console.log('authority', s_authority)
      const s_path = slicestr.substring(slicestr.indexOf('/entry'))
      console.log('path', s_path)

      const evolutionRes = await axios.get(evolutionUrl.toString(), {
        headers,
        proxy: false,
        maxRedirects: 0,
      })

      console.log(evolutionRes.status, evolutionRes.statusText)
    } catch (err) {
      console.log('err', err.response?.status, err.response?.statusText)
      if (err.response?.status === 302) {
        const location = err.response.headers.get('location')
        if (location == null) {
          console.log('location is null')
          return
        }
        const newEvolutionRes = await fetch(evolutionUrl.origin + location, {
          redirect: 'manual',
        })

        const setCookies = newEvolutionRes.headers.get('set-cookie')

        const cookies: string[] = []

        for (const setCookie of setCookies?.split(',') ?? []) {
          const [keyValue] = setCookie.split(';')
          const [key, value] = keyValue.split('=')
          cookies.push(keyValue)
          if (key === 'EVOSESSIONID') {
            sessionId = value
          }
        }

        cookieString = cookies.join('; ')

        const newLocation = newEvolutionRes.headers.get('location')

        console.log(newEvolutionRes.status, newEvolutionRes.statusText, newLocation)
      } else {
        console.log('evolution connection error', err)
        return
      }
    }

    if (sessionId === '') {
      console.log('sessionId is empty')
      return
    }

    console.log('sessionId', sessionId)

    const setupRes = await axios.get(evolutionUrl.origin + '/setup', {
      headers: {
        'Cache-Control': 'max-age=0',
        Host: evolutionUrl.host,
        Origin: evolutionUrl.origin,
        Cookie: cookieString,
      },
      proxy: false,
      maxRedirects: 0,
    })

    const setupJson = await setupRes.data
    console.log('setupRes', setupJson)

    const { user_id: userId } = setupJson

    const websocketUrl = `wss://${evolutionUrl.host}/public/lobby/socket/v2/${userId}?messageFormat=json&device=Desktop&instance=${randomString(5)}-${userId}-&EVOSESSIONID=${sessionId}&client_version=6.20240620.70319.42334-3e0c49bf75`
    console.log('websocket url', websocketUrl)

    const evolutionWs = new WebSocket(websocketUrl)

    evolutionWs.on('open', () => {
      console.log('open lobby Websocket')
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
    })
    evolutionWs.on('error', (data) => {
      console.log(data.toString())
    })
  } catch (err) {
    console.log(err)
  }
}

axiosTest()
