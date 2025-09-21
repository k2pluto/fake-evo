import axios, { type AxiosResponse } from 'axios'
import { request as undiciRequest, Agent } from 'undici'
import { gunzip, brotliDecompress } from 'zlib'
import { promisify } from 'util'

import tls from 'tls'
import { type CallEvoOptions, type CallEvoResponse } from './call-evo'
import { shuffleArray } from '@service/src/lib/utility/util'
import parser from 'ua-parser-js'

const gunzipAsync = promisify(gunzip)
const brotliDecompressAsync = promisify(brotliDecompress)

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

    const newCookie = headers.cookie

    const referer = referers[stringToHashNumber(username) % referers.length]

    newHeaders = {
      host: url.host,
      ...(headers.origin != null && { origin: url.origin }),
      ...(headers.referer != null && { referer }),

      accept: headers['accept'],
      'accept-encoding': headers['accept-encoding'] ?? 'gzip, deflate, br',
      'accept-language': headers['accept-language'],
      'content-type': headers['content-type'],
      priority: headers['priority'],
      'connection': 'keep-alive',
      'upgrade-insecure-requests': '1',
      'te': 'trailers',

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

    // HTTP/2 지원을 위한 undici 시도 (Akamai Bot Manager 우회)
    console.log('=== UNDICI HTTP/2 REQUEST ===')
    console.log('URL:', urlstr)
    console.log('Method:', method ?? 'GET')
    console.log('Headers being sent:', JSON.stringify(newHeaders, null, 2))

    // HTTP/2 전용 agent 생성
    const http2Agent = new Agent({
      allowH2: true,
      pipelining: 1,
      connect: {
        rejectUnauthorized: false,
      },
    })

    try {
      const undiciRes = await undiciRequest(urlstr, {
        method: method ?? 'GET',
        headers: newHeaders,
        body: method === 'POST' ? body : undefined,
        bodyTimeout: timeout,
        headersTimeout: timeout,
        dispatcher: http2Agent,
      })

      console.log('=== UNDICI RESPONSE ===')
      console.log('Status:', undiciRes.statusCode)
      console.log('HTTP Version:', (undiciRes.context as any)?.httpVersion)
      console.log('Response headers:', JSON.stringify(Object.fromEntries(Object.entries(undiciRes.headers)), null, 2))

      let rawData = Buffer.from(await undiciRes.body.arrayBuffer())

      // 압축 해제 처리
      const contentEncoding = undiciRes.headers['content-encoding'] as string
      if (contentEncoding === 'gzip') {
        rawData = Buffer.from(await gunzipAsync(rawData))
      } else if (contentEncoding === 'br') {
        rawData = Buffer.from(await brotliDecompressAsync(rawData))
      }

      let responseData = responseType === 'arraybuffer'
        ? rawData
        : rawData.toString('utf-8')

      // HTML 응답에서 WebSocket URL을 프록시 서버로 리디렉션
      if (typeof responseData === 'string' && undiciRes.headers['content-type']?.includes('text/html')) {
        const evolutionHost = new URL(urlstr).host
        const proxyHost = headers['host'] as string

        // Evolution WebSocket URL을 프록시 서버로 변경
        responseData = responseData
          .replace(new RegExp(`wss://${evolutionHost}/public/`, 'g'), `wss://${proxyHost}/public/`)
          .replace(new RegExp(`ws://${evolutionHost}/public/`, 'g'), `ws://${proxyHost}/public/`)
      }

      console.log('Response data preview:', typeof responseData === 'string' ? responseData.substring(0, 200) : 'Binary data')

      const headerObj = Object.fromEntries(Object.entries(undiciRes.headers))
      delete headerObj['content-encoding']
      delete headerObj['access-control-allow-origin']
      delete headerObj['cross-orgin-resource-policy']

      return {
        data: responseData,
        recvHeaders: headerObj,
        sendHeaders: newHeaders,
        status: undiciRes.statusCode,
      }
    } catch (undiciError) {
      console.log('=== UNDICI ERROR ===')
      console.log('Error message:', undiciError.message)
      console.log('Error code:', undiciError.code)
      console.log('Error stack:', undiciError.stack)
      console.log('Falling back to axios...')

      if (undiciError.code === 'UND_ERR_BODY_TIMEOUT' || undiciError.code === 'UND_ERR_HEADERS_TIMEOUT') {
        return {
          sendHeaders: newHeaders,
          status: 408,
        }
      }
    }

    console.log('=== AXIOS FALLBACK REQUEST ===')
    console.log('URL:', urlstr)
    console.log('Method:', method ?? 'GET')
    console.log('Headers being sent:', JSON.stringify(newHeaders, null, 2))

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

    console.log('=== AXIOS RESPONSE ===')
    console.log('Status:', res.status)
    console.log('Response headers:', JSON.stringify(res.headers, null, 2))

    // HTML 응답에서 WebSocket URL을 프록시 서버로 리디렉션
    if (typeof res.data === 'string' && res.headers['content-type']?.includes('text/html')) {
      const evolutionHost = new URL(urlstr).host
      const proxyHost = headers['host'] as string

      // Evolution WebSocket URL을 프록시 서버로 변경
      res.data = res.data
        .replace(new RegExp(`wss://${evolutionHost}/public/`, 'g'), `wss://${proxyHost}/public/`)
        .replace(new RegExp(`ws://${evolutionHost}/public/`, 'g'), `ws://${proxyHost}/public/`)
    }

    console.log('Response data preview:', typeof res.data === 'string' ? res.data.substring(0, 200) : 'Binary data')

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
    console.log('=== AXIOS ERROR ===')
    console.log('Error message:', err.message)
    console.log('Error code:', err.code)

    const { response } = err
    if (response != null) {
      console.log('Error response status:', response.status)
      console.log('Error response headers:', JSON.stringify(response.headers, null, 2))
      console.log('Error response data preview:', typeof response.data === 'string' ? response.data.substring(0, 200) : 'Binary data')

      return {
        data: response.data,
        recvHeaders: response.headers,
        sendHeaders: newHeaders,
        status: response.status,
      }
    } else if (err.code === 'ECONNABORTED') {
      console.log('Request timed out')
      return {
        sendHeaders: newHeaders,
        status: 408, // timeout code
      }
    }
    console.log('Throwing error:', err)
    throw err
  }
}
