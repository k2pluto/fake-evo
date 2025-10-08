import axios, { type AxiosResponse } from 'axios'
import { request as undiciRequest, Agent } from 'undici'
import { gunzip, brotliDecompress } from 'zlib'
import { promisify } from 'util'
import { execFile } from 'child_process'
import path from 'path'

import tls from 'tls'
import { type CallEvoOptions, type CallEvoResponse } from './call-evo'
import { shuffleArray } from '@service/src/lib/utility/util'
import parser from 'ua-parser-js'
import { getOrCreateBrowserAgent } from './browser-tls-agent'

const gunzipAsync = promisify(gunzip)
const brotliDecompressAsync = promisify(brotliDecompress)
const execFileAsync = promisify(execFile)

// curl-impersonate 경로 설정
// 컴파일 위치: fake-node/dist/src/fake-api/module/
// 타겟 위치: fake-node/curl-impersonate-chrome
const CURL_IMPERSONATE_PATH = path.join(__dirname, './curl-impersonate-chrome')

// Chrome 116 TLS cipher suites
const CHROME_116_CIPHERS = 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA:AES256-SHA'

// 사용할 HTTP 클라이언트 선택 ('curl-impersonate' | 'undici' | 'axios' | 'custom-agent')
const HTTP_CLIENT_MODE: 'curl-impersonate' | 'undici' | 'axios' | 'custom-agent' = 'custom-agent'

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

// ==========================================
// curl-impersonate 함수
// ==========================================
async function callCurlImpersonate(
  urlstr: string,
  { headers, responseType, body, timeout, method, username }: CallEvoOptions,
): Promise<CallEvoResponse> {
  const url = new URL(urlstr)

  // 프록시 헤더 제거 목록
  const proxyHeadersToRemove = [
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-real-ip',
    'cf-connecting-ip',
    'cf-ipcountry',
    'cf-ray',
    'cf-visitor',
    'cdn-loop',
    'via',
  ]

  // Build curl headers
  const curlHeaders: string[] = []
  const sendHeaders: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    // 프록시 헤더 제거
    if (proxyHeadersToRemove.includes(key.toLowerCase())) {
      continue
    }

    if (value && key.toLowerCase() !== 'content-length') {
      let headerValue = Array.isArray(value) ? value.join(', ') : String(value)

      // host 헤더는 실제 URL의 host로 교체
      if (key.toLowerCase() === 'host') {
        headerValue = url.host
      }

      curlHeaders.push('-H', `${key}: ${headerValue}`)
      sendHeaders[key] = headerValue
    }
  }

  // Build curl arguments with Chrome 116 TLS fingerprinting (TLS 1.3 강제)
  const curlArgs = [
    '--ciphers', CHROME_116_CIPHERS,
    '--http2',
    '--http2-no-server-push',
    '--compressed',
    '--tlsv1.3',                    // TLS 1.3 강제
    '--tls-max', '1.3',             // 최대 버전도 1.3으로 제한
    '--alps',
    '--tls-permute-extensions',
    '--cert-compression', 'brotli',
    ...curlHeaders,
    '-v', '-s', '-S', '-i',
    ...(timeout ? ['--max-time', String(Math.ceil(timeout / 1000))] : []),
  ]

  if (method === 'POST' && body) {
    curlArgs.push('-X', 'POST', '-d', body)
  }

  curlArgs.push(urlstr)

  console.log('=== CURL-IMPERSONATE REQUEST ===')
  console.log('URL:', urlstr)
  console.log('Method:', method ?? 'GET')
  console.log('Headers:', JSON.stringify(sendHeaders, null, 2))

  try {
    const { stdout, stderr } = await execFileAsync(CURL_IMPERSONATE_PATH, curlArgs, {
      maxBuffer: 1024 * 1024 * 10,
      timeout: timeout || 10000,
    }) as { stdout: string; stderr: string }

    // Parse HTTP response from stdout
    const lines = stdout.split('\r\n')
    const statusLine = lines[0]
    const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)/)

    if (!statusMatch) {
      throw new Error('Failed to parse HTTP status from curl output')
    }

    const status = parseInt(statusMatch[1])
    console.log('curl-impersonate status:', status)

    // Parse headers
    let headerEndIndex = 0
    const recvHeaders: Record<string, string | string[]> = {}

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line === '') {
        headerEndIndex = i
        break
      }

      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase()
        const value = line.substring(colonIndex + 1).trim()

        if (recvHeaders[key]) {
          if (Array.isArray(recvHeaders[key])) {
            (recvHeaders[key] as string[]).push(value)
          } else {
            recvHeaders[key] = [recvHeaders[key] as string, value]
          }
        } else {
          recvHeaders[key] = value
        }
      }
    }

    // Extract body
    const bodyLines = lines.slice(headerEndIndex + 1)
    const bodyText = bodyLines.join('\r\n')

    let responseData: any = bodyText

    // Handle response type
    if (responseType === 'arraybuffer') {
      responseData = Buffer.from(bodyText, 'binary')
    }

    // HTML 응답에서 WebSocket URL을 프록시 서버로 리디렉션
    if (typeof responseData === 'string' && recvHeaders['content-type']?.includes('text/html')) {
      const evolutionHost = url.host
      const proxyHost = headers['host'] as string

      responseData = responseData
        .replace(new RegExp(`wss://${evolutionHost}/public/`, 'g'), `wss://${proxyHost}/public/`)
        .replace(new RegExp(`ws://${evolutionHost}/public/`, 'g'), `ws://${proxyHost}/public/`)
    }

    console.log('curl-impersonate success:', status, url.host)

    // Clean up headers
    delete recvHeaders['content-encoding']
    delete recvHeaders['access-control-allow-origin']
    delete recvHeaders['cross-orgin-resource-policy']

    return {
      data: responseData,
      recvHeaders,
      sendHeaders,
      status,
    }

  } catch (curlError: any) {
    console.log('curl-impersonate error:', curlError.message)
    throw curlError
  }
}

// ==========================================
// Custom HTTPS Agent 함수 (Browser-specific TLS fingerprint)
// ==========================================
async function callCustomAgent(
  urlstr: string,
  { headers, responseType, body, timeout, method }: CallEvoOptions,
  newHeaders: Record<string, string | string[]>,
): Promise<CallEvoResponse> {
  console.log('=== CUSTOM AGENT REQUEST ===')
  console.log('URL:', urlstr)
  console.log('Method:', method ?? 'GET')
  console.log('Headers:', JSON.stringify(newHeaders, null, 2))

  const url = new URL(urlstr)
  const userAgent = (headers['user-agent'] || newHeaders['user-agent']) as string
  const customAgent = getOrCreateBrowserAgent(url.host, userAgent)

  // Use axios with custom agent
  let res: AxiosResponse
  try {
    if (method === 'POST') {
      res = await axios.post(urlstr, body, {
        headers: newHeaders,
        responseType,
        httpsAgent: customAgent,
        timeout,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400, // 2xx, 3xx are valid
      })
    } else {
      res = await axios(urlstr, {
        headers: newHeaders,
        responseType,
        method: method ?? 'GET',
        httpsAgent: customAgent,
        timeout,
        proxy: false,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400, // 2xx, 3xx are valid
      })
    }
  } catch (axiosError) {
    // Handle 3xx redirects as success (when validateStatus doesn't catch it)
    if (axiosError.response && axiosError.response.status >= 300 && axiosError.response.status < 400) {
      res = axiosError.response
    } else {
      throw axiosError
    }
  }

  console.log('=== CUSTOM AGENT RESPONSE ===')
  console.log('Status:', res.status)
  console.log('Response headers:', JSON.stringify(res.headers, null, 2))

  // HTML 응답에서 WebSocket URL을 프록시 서버로 리디렉션
  if (typeof res.data === 'string' && res.headers['content-type']?.includes('text/html')) {
    const evolutionHost = new URL(urlstr).host
    const proxyHost = headers['host'] as string

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
}

// ==========================================
// undici 함수 (HTTP/2 지원)
// ==========================================
async function callUndici(
  urlstr: string,
  { headers, responseType, body, timeout, method }: CallEvoOptions,
  newHeaders: Record<string, string | string[]>,
): Promise<CallEvoResponse> {
  console.log('=== UNDICI HTTP/2 REQUEST ===')
  console.log('URL:', urlstr)
  console.log('Method:', method ?? 'GET')
  console.log('Headers being sent:', JSON.stringify(newHeaders, null, 2))

  // HTTP/2 전용 agent 생성 (TLS 1.3 강제)
  const http2Agent = new Agent({
    allowH2: true,
    pipelining: 1,
    connect: {
      rejectUnauthorized: false,
      // TLS 1.3 설정 (Node.js tls.connect 옵션)
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      ciphers: CHROME_116_CIPHERS,
    },
  })

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
}

// ==========================================
// axios 함수 (Fallback)
// ==========================================
async function callAxiosBackend(
  urlstr: string,
  { headers, responseType, body, timeout, method }: CallEvoOptions,
  newHeaders: Record<string, string | string[]>,
): Promise<CallEvoResponse> {
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
}

export async function callAxios(
  urlstr: string,
  options: CallEvoOptions,
): Promise<CallEvoResponse> {
  const { headers, username } = options

  // ==========================================
  // MODE 1: curl-impersonate (TLS 1.3 강제)
  // ==========================================
  if (HTTP_CLIENT_MODE === 'curl-impersonate') {
    try {
      return await callCurlImpersonate(urlstr, options)
    } catch (curlError) {
      console.log('curl-impersonate failed, fallback to undici')
      // curl 실패시 undici로 fallback
    }
  }

  // ==========================================
  // MODE 2: undici/axios (기존 방식)
  // ==========================================
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

    // custom-agent 모드 (Chrome-like TLS fingerprint)
    if (HTTP_CLIENT_MODE === 'custom-agent') {
      try {
        return await callCustomAgent(urlstr, options, newHeaders)
      } catch (customAgentError) {
        console.log('=== CUSTOM AGENT ERROR ===')
        console.log('Error message:', customAgentError.message)
        console.log('Error code:', customAgentError.code)
        console.log('Error stack:', customAgentError.stack)
        console.log('Falling back to axios...')
      }
    }

    // undici 모드 또는 curl-impersonate 실패시 시도
    if (HTTP_CLIENT_MODE === 'undici' || HTTP_CLIENT_MODE === 'curl-impersonate') {
      try {
        return await callUndici(urlstr, options, newHeaders)
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
    }

    // axios fallback
    return await callAxiosBackend(urlstr, options, newHeaders)

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
