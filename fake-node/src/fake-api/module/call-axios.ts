import axios, { type AxiosResponse } from 'axios'
import { request as undiciRequest, Agent } from 'undici'
import { gunzip, brotliDecompress } from 'zlib'
import { promisify } from 'util'
import { execFile } from 'child_process'
import path from 'path'

import tls from 'tls'
import { type CallEvoOptions, type CallEvoResponse } from './call-evo'
import { shuffleArray } from '@service/src/lib/utility/util'
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
  if (method === 'POST' && body) {
    const bodyPreview = typeof body === 'string' ? body.substring(0, 500) : JSON.stringify(body).substring(0, 500)
    console.log('POST Body:', bodyPreview)
  }

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
  console.log('Req url :', urlstr)
  console.log('Status:', res.status)
  console.log('Response headers:', JSON.stringify(res.headers, null, 2))

  // JWT videoToken 추적 로그 (string, object, Buffer 모두 지원)
  let dataStr = ''
  if (typeof res.data === 'string') {
    dataStr = res.data
  } else if (Buffer.isBuffer(res.data)) {
    dataStr = res.data.toString('utf-8')
  } else if (typeof res.data === 'object') {
    dataStr = JSON.stringify(res.data)
  }

  if (dataStr) {
    const videoTokenMatch = dataStr.match(/videoToken[=:]([^&"\s,}]+)/i)
    if (videoTokenMatch) {
      console.log('🔍 JWT videoToken FOUND in custom-agent response!')
      console.log('   URL:', urlstr)
      console.log('   Token preview:', videoTokenMatch[1].substring(0, 50) + '...')
      try {
        const parts = videoTokenMatch[1].split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          console.log('   JWT payload dlh:', payload.dlh)
          console.log('   JWT payload sub:', payload.sub)
          if (payload.exp) {
            const expDate = new Date(payload.exp * 1000)
            const now = new Date()
            const diffSeconds = Math.floor((expDate.getTime() - now.getTime()) / 1000)
            console.log(`   JWT payload exp: ${payload.exp} (${expDate.toISOString()}, expires in ${diffSeconds}s)`)
          }
        }
      } catch (e) {
        console.log('   (Failed to decode JWT)')
      }
    }
  }

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

  // JWT videoToken 추적 로그 (압축 해제 전 확인)
  try {
    const rawDataStr = rawData.toString('utf-8')
    const videoTokenMatch = rawDataStr.match(/videoToken[=:]([^&"\s,}]+)/i)
    if (videoTokenMatch) {
      console.log('🔍 JWT videoToken FOUND in undici response!')
      console.log('   URL:', urlstr)
      console.log('   Token preview:', videoTokenMatch[1].substring(0, 50) + '...')
      try {
        const parts = videoTokenMatch[1].split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          console.log('   JWT payload dlh:', payload.dlh)
          console.log('   JWT payload sub:', payload.sub)
          if (payload.exp) {
            const expDate = new Date(payload.exp * 1000)
            const now = new Date()
            const diffSeconds = Math.floor((expDate.getTime() - now.getTime()) / 1000)
            console.log(`   JWT payload exp: ${payload.exp} (${expDate.toISOString()}, expires in ${diffSeconds}s)`)
          }
        }
      } catch (e) {
        console.log('   (Failed to decode JWT)')
      }
    }
  } catch (e) {
    // Buffer to string 실패시 무시
  }

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

  // JWT videoToken 추적 로그 (string, object, Buffer 모두 지원)
  let dataStr = ''
  if (typeof res.data === 'string') {
    dataStr = res.data
  } else if (Buffer.isBuffer(res.data)) {
    dataStr = res.data.toString('utf-8')
  } else if (typeof res.data === 'object') {
    dataStr = JSON.stringify(res.data)
  }

  if (dataStr) {
    const videoTokenMatch = dataStr.match(/videoToken[=:]([^&"\s,}]+)/i)
    if (videoTokenMatch) {
      console.log('🔍 JWT videoToken FOUND in axios response!')
      console.log('   URL:', urlstr)
      console.log('   Token preview:', videoTokenMatch[1].substring(0, 50) + '...')
      try {
        const parts = videoTokenMatch[1].split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          console.log('   JWT payload dlh:', payload.dlh)
          console.log('   JWT payload sub:', payload.sub)
          if (payload.exp) {
            const expDate = new Date(payload.exp * 1000)
            const now = new Date()
            const diffSeconds = Math.floor((expDate.getTime() - now.getTime()) / 1000)
            console.log(`   JWT payload exp: ${payload.exp} (${expDate.toISOString()}, expires in ${diffSeconds}s)`)
          }
        }
      } catch (e) {
        console.log('   (Failed to decode JWT)')
      }
    }
  }

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
  const { headers, username, evolutionUrl } = options

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

    const fixEvourl = 'https://babylonvg.evo-games.com'
    // Evolution 메인 도메인 (비디오 서버 요청이라도 Origin은 메인 도메인)
    const mainOrigin = evolutionUrl || fixEvourl

    // 디버깅: 도메인 변환 확인
    console.log(`🔍 callAxios Header processing:`)
    console.log(`   Request URL: ${urlstr}`)
    console.log(`   Evolution domain: ${mainOrigin}`)

    // 받은 헤더를 그대로 복사하되, 도메인만 fake-node → Evolution으로 변경
    newHeaders = { ...headers } as Record<string, string | string[]>

    // Cloudflare/Caddy/Proxy가 추가한 헤더들 제거 (프록시 사용 흔적 제거)
    delete newHeaders['x-forwarded-for']
    delete newHeaders['x-forwarded-host']
    delete newHeaders['x-forwarded-proto']
    delete newHeaders['x-real-ip']
    delete newHeaders['via']
    delete newHeaders['cdn-loop']
    delete newHeaders['cf-connecting-ip']
    delete newHeaders['cf-ipcountry']
    delete newHeaders['cf-ray']
    delete newHeaders['cf-visitor']
    delete newHeaders['cf-worker']
    delete newHeaders['cf-request-id']

    // 필수: host는 요청 대상 서버로 변경
    newHeaders.host = url.host

    // 원본 fake-node 도메인 추출 (예: babylondg.soft-evo-games.com)
    const fakeNodeDomain = headers.host as string

    // 모든 헤더를 순회하면서 fake-node 도메인을 Evolution 도메인으로 교체
    for (const key in newHeaders) {
      const value = newHeaders[key]

      // string 타입 헤더만 처리
      if (typeof value === 'string' && value.includes('soft-evo-games.com')) {
        // URL 형태인지 확인 (http:// 또는 https://)
        if (value.startsWith('http://') || value.startsWith('https://')) {
          try {
            const headerUrl = new URL(value)
            if (headerUrl.hostname.includes('soft-evo-games.com')) {
              // 도메인만 교체, 경로는 유지
              const newValue = value.replace(headerUrl.origin, mainOrigin)
              newHeaders[key] = newValue
              console.log(`   ✏️ ${key}: ${value} → ${newValue}`)
            }
          } catch (e) {
            // URL 파싱 실패시 단순 문자열 교체
            const newValue = value.replace(fakeNodeDomain, new URL(mainOrigin).hostname)
            newHeaders[key] = newValue
            console.log(`   ✏️ ${key}: ${value} → ${newValue}`)
          }
        } else {
          // URL이 아닌 경우 도메인만 교체
          const newValue = value.replace(fakeNodeDomain, new URL(mainOrigin).hostname)
          if (newValue !== value) {
            newHeaders[key] = newValue
            console.log(`   ✏️ ${key}: ${value} → ${newValue}`)
          }
        }
      }

      // string[] 배열 타입 헤더 처리
      if (Array.isArray(value)) {
        newHeaders[key] = value.map(v => {
          if (typeof v === 'string' && v.includes('soft-evo-games.com')) {
            return v.replace(fakeNodeDomain, new URL(mainOrigin).hostname)
          }
          return v
        })
      }
    }

    // origin이 없는 경우: manifest-ws2.json 요청에는 추가하지 않음 (브라우저 동작과 일치)
    // Real browsers do NOT send origin header for cross-origin GET requests to CDN
    // Adding origin causes Akamai to detect proxy/bot and issue short-lived tokens (20 sec instead of 24 hours)
    // if (!newHeaders.origin && url.pathname.includes('manifest-ws2.json')) {
    //   newHeaders.origin = mainOrigin
    //   console.log(`   ✏️ Origin: (none) → ${mainOrigin} [manifest-ws2 required]`)
    // }

    // sec-fetch-site 수정: same-origin 또는 none은 봇 감지됨, cross-site로 변경 (HAR 동작과 일치)
    // Browser sends same-origin when requesting fake-node, but Evolution expects cross-site
    // live1.egcvi.com requests may have 'none', which also needs to be changed to 'cross-site'
    if (newHeaders['sec-fetch-site'] === 'same-origin' || newHeaders['sec-fetch-site'] === 'none') {
      const oldValue = newHeaders['sec-fetch-site']
      newHeaders['sec-fetch-site'] = 'cross-site'
      console.log(`   ✏️ sec-fetch-site: ${oldValue} → cross-site [Akamai bot detection fix]`)
    }

    // origin 추가: cross-site 요청에는 origin이 필요함 (HAR 동작과 일치)
    // Browser automatically adds origin for cross-site fetch requests
    // In fake-node environment, browser doesn't add origin (same domain), so we must add it
    if (newHeaders['sec-fetch-site'] === 'cross-site' && !newHeaders['origin']) {
      newHeaders['origin'] = mainOrigin
      console.log(`   ✏️ origin: (none) → ${mainOrigin} [cross-site requires origin]`)
    }

    // user-agent 복원: callAxios 처리 중 user-agent가 누락되는 경우 복원 (HAR 기준)
    // HAR shows user-agent is critical for Akamai authentication
    if (!newHeaders['user-agent'] && headers['user-agent']) {
      newHeaders['user-agent'] = headers['user-agent']
      console.log(`   ✏️ user-agent: restored from original headers`)
    }

    // accept-encoding 수정: HAR에서는 "gzip, deflate, br, zstd"를 사용
    // custom-agent는 "gzip, br"만 보내는데, 이것은 Akamai에서 봇으로 감지됨
    if (newHeaders['accept-encoding'] === 'gzip, br') {
      newHeaders['accept-encoding'] = 'gzip, deflate, br, zstd'
      console.log(`   ✏️ accept-encoding: gzip, br → gzip, deflate, br, zstd [HAR match]`)
    }

    // sec-fetch-storage-access 추가: HAR에서 egcvi.com 요청은 이 헤더를 가짐
    // Chrome이 자동으로 추가하는 헤더, 없으면 봇으로 감지될 수 있음
    if (url.hostname.includes('egcvi.com') && newHeaders['sec-fetch-site'] === 'cross-site' && !newHeaders['sec-fetch-storage-access']) {
      newHeaders['sec-fetch-storage-access'] = 'none'
      console.log(`   ✏️ sec-fetch-storage-access: (none) → none [egcvi.com cross-site]`)
    }

    // undefined 값 제거
    for (const key in newHeaders) {
      if (newHeaders[key] === undefined) {
        delete newHeaders[key]
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
