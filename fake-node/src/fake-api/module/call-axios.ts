import axios, { type AxiosResponse } from 'axios'

import tls from 'tls'
import { type CallEvoOptions, type CallEvoResponse } from './call-evo'
import { shuffleArray } from '@service/src/lib/utility/util'
import parser from 'ua-parser-js'

//console.log(tls.DEFAULT_CIPHERS.replaceAll(':', '\n'))

// tls.DEFAULT_MAX_VERSION = 'TLSv1.2'
//tls.DEFAULT_CIPHERS = 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4'
//tls.DEFAULT_CIPHERS = 'TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'
//tls.DEFAULT_CIPHERS = 'TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'

//tls.DEFAULT_CIPHERS = 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'

//현재 7개의 조합에 30번째 부터 되고
//8개의 조합에 1번째 부터 됨
//let currentPreset = 0
export let tlsCurrentPreset = 30

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

// 7개의 숫자를 뽑는 모든 조합 생성
//const combinations = getCombinations(tlsSuiteBase, 5)
const combinations = getCombinations(tlsSuiteBase, 7)
//const combinations = getCombinations(tlsSuiteBase, 8)

/*const tlsSuitesArr = [
  'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA',
  'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA',
  'TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA',
  'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA',
  'TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:!aNULL:!MD5:!PSK:!SRP:!CAMELLIA',
]
shuffleArray(tlsSuitesArr)*/

/*const newCombi = combinations.map((combi) => combi.join(':'))

const index = newCombi.indexOf(
  'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256',
)*/

const tlsSuitesArr = combinations

updateTlsSuites()

export function updateTlsSuites(newPreset?: number) {
  tlsCurrentPreset = newPreset ?? tlsCurrentPreset
  if (tlsCurrentPreset >= tlsSuitesArr.length) {
    tlsCurrentPreset = 0
  }

  tls.DEFAULT_CIPHERS = tlsSuitesArr[tlsCurrentPreset].join(':') + ':!aNULL:!MD5:!PSK:!SRP:!CAMELLIA'

  console.log('updateTlsSuites', tlsCurrentPreset, tls.DEFAULT_CIPHERS)
  tlsCurrentPreset++
  //currentPreset += 10
}

const osToPlatfrom = {
  'Mac OS': 'macOS',
  Windows: 'Windows',
}

const referers = [
  'https://www.lo601.com/',
  'https://www.lo602.com/',
  'https://www.lo603.com/',
  'https://www.lo604.com/',
  'https://www.lo605.com/',
  'https://www.lo606.com/',
  'https://www.lo607.com/',
  'https://www.lo608.com/',
  'https://www.lo609.com/',
  'https://www.lo610.com/',
]

function stringToHashNumber(str: string) {
  if (str == null) return 0
  let hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash
}

export async function callAxios(
  urlstr: string,
  { headers, responseType, body, timeout, method, username }: CallEvoOptions,
): Promise<CallEvoResponse> {
  let newHeaders: Record<string, string | string[]> = {}
  try {
    const url = new URL(urlstr)

    const userAgent = parser(headers['user-agent'] as string)

    const cookies: Record<string, string> = {}

    if (headers.cookie != null) {
      for (const cookie of (headers.cookie as string).split(';')) {
        const [key, value] = cookie.split('=')
        cookies[key] = value
      }
    }

    const newCookie = cookies['EVOSESSIONID'] != null ? headers.cookie + '; ' + 'Domain=.evo-games.com' : headers.cookie

    const referer = referers[stringToHashNumber(username) % referers.length]

    newHeaders = {
      host: url.host,
      ...(headers.origin != null && { origin: url.origin }),
      ...(headers.referer != null && { referer }),

      accept: headers['accept'],
      'accept-encoding': headers['accept-encoding'],
      'accept-language': headers['accept-language'],
      'content-type': headers['content-type'],
      priority: headers['priority'],

      'user-agent': headers['user-agent'],
      cookie: newCookie,

      'sec-ch-ua': headers['sec-ch-ua'],
      'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'],
      'sec-ch-ua-platform': headers['sec-ch-ua-platform'],
      'sec-fetch-dest': headers['sec-fetch-dest'] ?? 'document',
      'sec-fetch-mode': headers['sec-fetch-mode'] ?? 'navigate',
      'sec-fetch-site': headers['sec-fetch-site'] ?? 'none',
      'sec-fetch-user': headers['sec-fetch-user'] ?? '?1',
    } as Record<string, string | string[]>

    for (const key in newHeaders) {
      if (newHeaders[key] === undefined) {
        delete newHeaders[key]
      }
    }

    if (userAgent.browser.name === 'Edge') {
      newHeaders = {
        ...newHeaders,
        'sec-ch-ua':
          (headers['sec-ch-ua'] as string) ??
          `""Not)A;Brand";v="99", "Microsoft Edge";v="${userAgent.browser.major}", "Chromium";v="${userAgent.browser.major}"`,
        'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'] ?? '?0',
        'sec-ch-ua-platform': headers['sec-ch-ua-platform'] ?? osToPlatfrom[userAgent.os.name],
      }
    }

    let res: AxiosResponse
    if (method === 'POST') {
      res = await axios.post(urlstr, body, {
        headers: newHeaders,
        responseType,
        method: method,
        timeout,
        maxRedirects: 0,
      })
    } else {
      res = await axios(urlstr, {
        headers: newHeaders,
        responseType,
        method: method ?? 'GET',
        timeout,
        proxy: false,
        maxRedirects: 0,
      })
    }
    const headerObj = res.headers as Record<string, string | string[]>

    delete headerObj['content-encoding']
    delete headerObj['access-control-allow-origin']
    delete headerObj['cross-orgin-resource-policy']

    return {
      data: res.data,
      recvHeaders: headerObj as any,
      sendHeaders: newHeaders,
      status: res.status,
    }
  } catch (err) {
    const { response } = err
    if (response != null) {
      return {
        data: response.data,
        recvHeaders: response.headers,
        sendHeaders: newHeaders,
        status: response.status,
      }
    } else if (err.code === 'ECONNABORTED') {
      // timeout 일 때
      return {
        sendHeaders: newHeaders,
        status: 408, // timeout code
      }
    }
    throw err
  }
}
