import { addDays, format, parse, startOfDay } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

import axios from 'axios'
import _ from 'lodash'

import { authManager, isLambda, mainSQL, mongoDB, vendorCode } from '../app'
import {
  errorToString,
  getBaccaratLimits,
  getLocalIp,
  getUserInfo,
  printAxiosErrorLog,
  querystring,
} from '../../common/util'
import { makeParticipants } from '../../common/settle'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'
import { DAY_MS, MINUTE_MS } from '@service/src/lib/utility/helper'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { type FastifyReply, type FastifyRequest } from 'fastify'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { config } from '../config'
import { makeContentResult } from '../websocket/util'
import { evolutionTableInfos } from '@service/src/lib/common/data/evolution-tables'

import { type LaunchAPIResult } from '../../token-generator/module/controller'
import { connectEvolution } from './connect-evolution'
import { FakeApiStatus } from './types'
import { type FakeUserTableConfig } from '@service/src/lib/interface/mongo/fake-user-table-config'
import {
  type EvolutionConfigData,
  type DataEvolutionTable,
} from '@service/src/lib/interface/mongo/data-evolution-table'
import { callEvo } from './call-evo'
import { updateTlsSuites } from './call-axios'
import { getEvolutionUrl } from './util'

import fs from 'fs'
import { match } from 'assert'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

// curl-impersonate 경로
// 빌드 후: /home/evoserverXX/out/main.js
// curl 위치: /home/evoserverXX/curl_chrome116
// 따라서 out 디렉토리 기준 상대 경로: ../curl_chrome116
const CURL_CHROME_PATH = path.join(__dirname, '../curl_chrome116')

// curl-impersonate로 요청하는 함수
async function curlImpersonate(url: string, headers: Record<string, string | string[]>, followRedirects: boolean = false) {
  const args = [
    url,
    '-v', // verbose
    '--http2', // HTTP/2 사용
    '--compressed', // gzip/brotli 자동 처리
  ]

  // 리다이렉트 처리
  if (!followRedirects) {
    args.push('--max-redirs', '0') // 리다이렉트 따라가지 않음 - 302를 그대로 받음
  }

  // 헤더 추가
  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      const headerValue = Array.isArray(value) ? value.join(', ') : value
      args.push('-H', `${key}: ${headerValue}`)
    }
  }

  try {
    console.log('🌐 Using curl-impersonate:', CURL_CHROME_PATH)
    console.log('URL:', url)
    console.log('Headers:', headers)
    console.log('Follow redirects:', followRedirects)

    const { stdout, stderr } = await execFileAsync(CURL_CHROME_PATH, args, {
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })

    console.log('curl stderr (headers/status):', stderr)

    // stderr에서 HTTP 상태코드와 헤더 파싱
    const statusMatch = stderr.match(/< HTTP\/\d\.\d (\d+)/)
    const status = statusMatch ? parseInt(statusMatch[1]) : 200

    const locationMatch = stderr.match(/< [Ll]ocation: (.+)/)
    const location = locationMatch ? locationMatch[1].trim() : undefined

    console.log('curl status:', status)
    console.log('curl location:', location)

    return {
      status,
      headers: {
        location,
      },
      data: stdout,
    }
  } catch (err) {
    // curl이 --max-redirs 0으로 302를 받으면 에러가 발생할 수 있음
    // 하지만 stderr에 응답이 있으므로 파싱 시도
    console.log('curl exit with error (may be 302 redirect):', err.code)

    if (err.stderr) {
      console.log('Parsing stderr for 302 response...')
      const statusMatch = err.stderr.match(/< HTTP\/\d\.\d (\d+)/)
      const status = statusMatch ? parseInt(statusMatch[1]) : 0

      const locationMatch = err.stderr.match(/< [Ll]ocation: (.+)/)
      const location = locationMatch ? locationMatch[1].trim() : undefined

      console.log('Parsed status:', status)
      console.log('Parsed location:', location)

      // 302인 경우 정상 응답으로 처리
      if (status === 302 && location) {
        return {
          status,
          headers: {
            location,
          },
          data: err.stdout || '',
        }
      }
    }

    console.error('❌ curl-impersonate error:', err)
    throw err
  }
}

export const fakeCasinoId = 'babylonagst30001'
export const fakeServerHost = 'evotrf.ximaxmanager.com'

export type FastifyHeaders = Record<string, string | string[]>

const fakeSockerUrls = {
  blue: 'babylonbbo.evo-game.co',
  green: 'babylonbbs.evo-game.co',
  lemon: 'babylonbbl.evo-game.co',
  tomato: 'babylonbbt.evo-game.co',
  gold: 'babylongld.evo-game.co',
  silver: 'babylonslv.evo-game.co',
  grape: 'babylongrap.evo-game.co',
  apple: 'babylongapp.evo-game.co',
  naver: '101.101.208.17',
}

const wsHost = fakeSockerUrls[process.env.STAGE_ENV] ?? 'localhost'

console.log(`wsHost(${process.env.STAGE_ENV}) : ${wsHost}`)

const tableInfos: Record<
  string,
  {
    name: string
    nameKo?: string
    gameType?: string
    type?: string
    gameTypeUnified?: string
    gameSubType?: string
    description?: string
  }
> = {}

async function getTableInfo(tableId: string) {
  let tableInfo = tableInfos[tableId]
  if (tableInfo == null) {
    tableInfo = evolutionTableInfos[tableId]

    tableInfos[tableId] = tableInfo
  }
  if (tableInfo == null) {
    tableInfo = await mongoDB.dataEvolutionTable.findOne({ where: { _id: tableId } })

    tableInfos[tableId] = tableInfo
  }

  return tableInfo
}

export async function getBlackmambaGameUrl(
  agentCode: string,
  userId: string,
  vendor: string,
  subDomain?: string,
): Promise<LaunchAPIResult> {
  const user = await mainSQL.repos.user.findOne({ where: { agentCode, userId } })
  if (user == null) {
    return
  }

  const res = await axios.get(
    `https://${subDomain ?? 'token'}.blackmambalive.com/${vendor}/token?username=${agentCode + userId}`,
  )
  return res.data

  // const { gameUrl } = res.data
  // return gameUrl
}

export async function loginAlpha(username: string) {
  try {
    const { agentCode, userId } = getUserInfo(username)

    let res: LaunchAPIResult
    for (let i = 0; ; i++) {
      console.log('get gameurl count ' + i)
      res = await getBlackmambaGameUrl(agentCode, userId, 'alpha')
      if (res != null) {
        break
      }

      if (i >= 2) {
        throw res
      }
    }

    console.log(JSON.stringify(res))

    let evolutionEntryUrl: string

    let lastRes: any

    for (let i = 0; ; i++) {
      console.log('open alpha count ' + i)

      try {
        await axios.get(res.gameUrl, {
          maxRedirects: 0,
          headers: {
            Accept: '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': '',
            Origin: 'https://api.alpha333.com',
            Referer: 'https://api.alpha333.com/',
            'sec-ch-ua': '"Microsoft Edge";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
            'sec-ch-ua-mobile': '70',
            'sec-ch-ua-platform': 'intel05',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'user-agent':
              'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.1661.51',
          },
          responseType: 'arraybuffer',
        })
        break
      } catch (err) {
        if (err.response.status === 302) {
          evolutionEntryUrl = err.response.headers.location
          break
        }
        lastRes = err.response
        printAxiosErrorLog(err)
      }

      if (i >= 2) {
        throw {
          status: 102,
          content: lastRes.data,
          headers: lastRes.headers,
          message: 'open api error',
        }
      }
    }
    console.log(evolutionEntryUrl)

    return res

    // return connectEvolution(evolutionEntryUrl, username)
  } catch (err) {
    printAxiosErrorLog(err)
    if (err?.status != null) {
      throw err
    }
    throw {
      status: 100,
      error: err.toString(),
    }
  }
}

export async function loginUnionGame(username: string) {
  try {
    const { agentCode, userId } = getUserInfo(username)

    let res: LaunchAPIResult
    for (let i = 0; ; i++) {
      console.log('get gameurl count ' + i)
      res = await getBlackmambaGameUrl(agentCode, userId, 'uniongame')
      if (res.gameUrl != null) {
        break
      }

      if (i >= 2) {
        throw res
      }
    }

    console.log(JSON.stringify(res))

    return res

    // return connectEvolution(res.gameUrl, username)
  } catch (err) {
    printAxiosErrorLog(err)
    if (err?.status != null) {
      throw err
    }
    throw {
      status: 100,
      error: err.toString(),
    }
  }
}

export async function loginEvolutionOriginal(username: string) {
  try {
    const { agentCode, userId } = getUserInfo(username)

    let res: LaunchAPIResult
    for (let i = 0; ; i++) {
      console.log('get gameurl count ' + i)
      res = await getBlackmambaGameUrl(agentCode, userId, 'evolution')
      if (res.gameUrl != null) {
        break
      }

      if (i >= 2) {
        throw res
      }
    }

    console.log(JSON.stringify(res))

    return res

    // return connectEvolution(res.gameUrl, username)
  } catch (err) {
    printAxiosErrorLog(err)
    if (err?.status != null) {
      throw err
    }
    throw {
      status: 100,
      error: err.toString(),
    }
  }
}

export async function loginSwix(username: string, headers: Record<string, string | string[]>) {
  try {
    const { agentCode, userId } = getUserInfo(username)

    let res: LaunchAPIResult
    for (let i = 0; ; i++) {
      console.log('get gameurl count ' + i)
      res = await getBlackmambaGameUrl(agentCode, userId, 'swix')
      if (res.gameUrl != null) {
        break
      }

      if (i >= 2) {
        throw res
      }
    }

    console.log('===== loginSwix: Fetching Swix page =====')
    console.log('Swix URL:', res.gameUrl)

    // Swix 페이지도 curl-impersonate로 요청 (Cloudflare 우회)
    const swixHeaders = {
      'user-agent': headers['user-agent'] as string,
      'accept': headers['accept'] as string,
      'accept-language': headers['accept-language'] as string,
      'accept-encoding': 'gzip, deflate, br',
    }
    const swixRes = await curlImpersonate(res.gameUrl, swixHeaders)

    console.log('Swix response status:', swixRes.status)
    console.log('Swix response headers:', JSON.stringify(swixRes.headers))

    // Swix에서 받은 쿠키 추출 (curl stderr에서 set-cookie 파싱 필요)
    const swixCookies = undefined // curl-impersonate는 set-cookie를 헤더로 파싱 안함
    console.log('Swix cookies:', swixCookies)

    const matchRes = swixRes.data.match(/https:\/\/play[^"]*"/g)

    if (matchRes == null || matchRes.length === 0) {
      console.log('❌ No Evolution URL found in Swix response')
      console.log('Swix response data preview:', typeof swixRes.data === 'string' ? swixRes.data.substring(0, 500) : JSON.stringify(swixRes.data))
      throw {
        status: 100,
        message: 'swix game url not found',
      }
    }

    const linkUrl = matchRes[0].substring(0, matchRes[0].length - 1)
    console.log('✅ Extracted Evolution URL:', linkUrl)

    // Evolution 도메인으로 직접 연결한 것처럼 헤더 재구성 (프록시 증거 모두 제거)
    const url = new URL(linkUrl)

    // Swix 쿠키를 Evolution 도메인용 쿠키로 변환
    let cookieHeader = ''
    if (swixCookies && swixCookies.length > 0) {
      // Set-Cookie 헤더에서 쿠키 이름=값만 추출
      cookieHeader = swixCookies
        .map(cookie => {
          const match = cookie.match(/^([^=]+=[^;]+)/)
          return match ? match[1] : ''
        })
        .filter(Boolean)
        .join('; ')
      console.log('Cookie header to send:', cookieHeader)
    }

    const newHeaders = {
      host: url.host,                                      // Evolution host
      origin: url.origin,                                  // Evolution origin
      accept: headers['accept'],
      'accept-encoding': headers['accept-encoding'] ?? 'gzip, deflate, br',
      'accept-language': headers['accept-language'],
      'user-agent': headers['user-agent'],
      'sec-ch-ua': headers['sec-ch-ua'],
      'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'],
      'sec-ch-ua-platform': headers['sec-ch-ua-platform'],
      'sec-fetch-dest': headers['sec-fetch-dest'] ?? 'document',
      'sec-fetch-mode': headers['sec-fetch-mode'] ?? 'navigate',
      'sec-fetch-site': 'none',                            // 직접 연결
      'sec-fetch-user': headers['sec-fetch-user'] ?? '?1',
      'upgrade-insecure-requests': '1',
      'connection': 'keep-alive',
      ...(cookieHeader && { cookie: cookieHeader }),       // Swix에서 받은 쿠키 포함
      // 프록시 증거 제거: x-forwarded-*, x-real-ip, cf-*, cdn-loop, via, referer 제외
    }

    console.log('===== loginSwix: Sending headers to Evolution =====')
    console.log('URL:', linkUrl)
    console.log('Header keys:', Object.keys(newHeaders).join(', '))
    for (const key of ['host', 'origin', 'referer', 'x-forwarded-host', 'x-real-ip', 'user-agent', 'sec-fetch-site']) {
      if (newHeaders[key]) console.log(`  ${key}: ${newHeaders[key]}`)
    }
    console.log('===================================================')

    // curl-impersonate 사용 (Cloudflare 봇 감지 우회)
    // followRedirects = false: 302 리다이렉트를 받아야 함
    const linkRes = await curlImpersonate(linkUrl, newHeaders, false)

    console.log('linkRes.status:', linkRes.status)
    console.log('linkRes.headers.location:', linkRes.headers.location)
    console.log('linkRes.data preview:', JSON.stringify(linkRes.data).substring(0, 500))

    const gameUrl = linkRes.headers.location as string

    if (!gameUrl) {
      console.log('❌ No location header in Swix response')
      console.log('Full response headers:', JSON.stringify(linkRes.headers))
      console.log('Full response data:', typeof linkRes.data === 'string' ? linkRes.data.substring(0, 1000) : JSON.stringify(linkRes.data))
      throw {
        status: 100,
        message: 'Swix did not return a valid redirect URL',
      }
    }

    res.gameUrl = gameUrl
    res.status = 0

    console.log('✅ Swix gameUrl:', gameUrl)

    return res
    // return connectEvolution(res.gameUrl, username)
  } catch (err) {
    printAxiosErrorLog(err)
    if (err?.status != null) {
      throw err
    }
    throw {
      status: 100,
      error: err.toString(),
    }
  }
}

function loginVendor(username: string, headers: Record<string, string | string[]>) {
  if (vendorCode === VendorCode.FakeAlpha_Cider_Evolution) {
    return loginAlpha(username)
  } else if (vendorCode === VendorCode.FakeUnionGame_Cool_Evolution) {
    return loginUnionGame(username)
  } else if (vendorCode === VendorCode.FakeChoi_Evolution) {
    return loginEvolutionOriginal(username)
  } else {
    return loginSwix(username, headers)
  }
}

interface EntryGameOptions {
  username?: string
  authToken?: string
  ip: string
  headers: Record<string, string>
  reply: FastifyReply
}

export async function entryGame(options: EntryGameOptions) {
  const { authToken, ip, reply, headers } = options
  let returnValue: {
    status: number
    message: string
    content?: any
    headers?: Record<string, string>
  }

  const loginLogData: {
    url?: string
    response?: any
    error?: any
  } = {}

  let agentCode: string
  let userId: string

  try {
    console.log('===== entryGame START =====')
    console.log('Options:', { username: options.username, authToken: options.authToken, ip: options.ip })

    console.log(`Calling ${authToken != null ? 'balanceByToken' : 'balanceByUsername'}`)
    const balanceRes = await (authToken != null
      ? authManager.balanceByToken(authToken)
      : authManager.balanceByUsername(options.username))

    console.log('balanceRes:', JSON.stringify(balanceRes))
    console.log('balanceRes.status:', balanceRes.status)
    console.log('CommonReturnType.Success:', CommonReturnType.Success)

    if (balanceRes.status !== CommonReturnType.Success) {
      console.log('❌ Balance check failed - throwing 4444 error')
      throw {
        status: 4444,
        message: '파라미터 에러입니다. 다시 한번 확인해 주세요.',
      }
    }
    console.log('✅ Balance check passed')

    const userInfo = balanceRes.user
    const { agentCode, userId, agentId } = userInfo

    if (balanceRes.balance != null) {
      // 여기서 fakeBalance 를 미리 업데이트 해야 심리스 밸런스에서도 바로 적용이 된다.
      await mainSQL.repos.user.update({ agentCode, userId }, { fakeBalance: balanceRes.balance })
    }

    const username = agentCode + userId

    let launchRes = await loginVendor(username, headers)
    if (launchRes.status !== 0) {
      throw {
        status: 5555,
        message: '벤더사 오류입니다. 잠시 후에 다시 접속 바랍니다.',
      }
    }

    loginLogData.response = launchRes

    console.log(JSON.stringify(launchRes))

    // 블랙리스트 유저인지 확인
    /*const blacklistUser = await mongoDB.fakeBlacklistUser.findOne({ where: { username } })
    if (blacklistUser != null) {
      await mainSQL.repos.user.update({ agentCode, userId }, { fakeMode: false })

      console.log('entryGame_blacklist', username, JSON.stringify(blacklistUser))

      // 블랙 걸린 애들은 정품으로 리디렉션 시킴
      return await reply.redirect(launchRes.gameUrl)
    }*/

    for (let i = 0; i < 3; i++) {
      const connectRes = await connectEvolution(launchRes.gameUrl, agentId, username, headers)

      if (connectRes.status !== 0) {
        // TLS를 바꾸고 몇번 더 시도한다.
        updateTlsSuites()
        continue
      }

      // 에볼루션 연결이 ㅅ공하면 fakeMode 를 true 로 바꾸고 lockedBalance 를 0으로 초기화
      await mainSQL.repos.user.update({ agentCode, userId }, { fakeMode: true, lockedBalance: 0 })

      console.log('entryGame success', username, JSON.stringify(connectRes))

      const location = connectRes.data.headers.location as string

      if (location != null) {
        return await reply.headers(connectRes.data.headers).redirect(location)
      }

      return await reply.headers(connectRes.data.headers).redirect(`/`)
    }

    // 페이크 접속이 안되면 블랙리스트에 추가한다. (봇일 가능성이 높다.)
    // 단, 모니터링/헬스체크/prefetch 요청은 제외
    const userAgent = headers['user-agent'] as string
    const purpose = headers['purpose'] as string
    const secPurpose = headers['sec-purpose'] as string

    const isMonitoringRequest = userAgent === 'node' ||
                               userAgent?.includes('curl') ||
                               userAgent?.includes('wget') ||
                               headers['cdn-loop']?.includes('cloudflare')

    const isPrefetchRequest = purpose === 'prefetch' ||
                             secPurpose?.includes('prefetch') ||
                             secPurpose?.includes('prerender')

    if (!isMonitoringRequest && !isPrefetchRequest) {
      console.log(`🚨 Adding user ${username} to blacklist due to fake connection failure`)
      console.log(`   User-Agent: ${userAgent}, Purpose: ${purpose || secPurpose}`)
      await mongoDB.fakeBlacklistUser.updateOne(
        { username },
        {
          $setOnInsert: {
            createdAt: new Date(),
          },
          $set: { agentId, username, headers, ip, updatedAt: new Date() },
        },
        { upsert: true },
      )
    } else {
      const reason = isMonitoringRequest ? 'monitoring' : 'prefetch'
      console.log(`✅ Skipping blacklist for ${reason} request: ${userAgent || purpose || secPurpose}`)
    }

    // 이미 세션이 지나갔으므로 한번 더 벤더사 로긴을 시도한다.
    launchRes = await loginVendor(username, headers)
    if (launchRes.status !== 0) {
      throw {
        status: 5555,
        message: '벤더사 오류입니다. 잠시 후에 다시 접속 바랍니다.',
      }
    }

    loginLogData.response = launchRes

    return await reply.redirect(launchRes.gameUrl)
    // return reply.headers(connectRes.data.headers).redirect(connectRes.data.headers.location)
  } catch (err) {
    console.log('entryGame error', agentCode + userId, errorToString(err))
    if (err.status != null) {
      loginLogData.error = err

      returnValue = err
    } else if (err?.response != null) {
      loginLogData.error = {
        message: err.toString(),
        data: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
      }
      returnValue = {
        status: 6666,
        message: '네트워크 에러 입니다. 잠시 후에 다시 접속 바랍니다.',
      }
    } else {
      loginLogData.error = {
        message: err.toString(),
        stack: err.stack,
      }
      returnValue = {
        status: 7777,
        message: '알수없는 에러 입니다. 잠시 후에 다시 접속 바랍니다.',
      }
    }
  } finally {
    await mongoDB.logService.save({
      type: 'fake_entry',
      stepLog: {
        login: loginLogData,
      },
      agentCode,
      userId,
      ip,
      error: loginLogData.error != null,
      gameCompany: loginLogData.response,
      timestamp: new Date(),
    })
  }

  if (returnValue.content != null) {
    console.log('return api error ' + agentCode + userId)
    console.log(returnValue.headers)
    console.log(returnValue.content.toString())
    return await reply.headers({ ...(returnValue.headers ?? {}) }).send(returnValue.content)
  }
  return returnValue
}

export async function configService(req: FastifyRequest, reply: FastifyReply) {
  const { table_id } = req.query as {
    table_id: string
  }
  const { EVOSESSIONID } = req.cookies as { EVOSESSIONID: string }

  if (EVOSESSIONID == null) {
    return { status: FakeApiStatus.DataNotFound, ms: 'authorization failed' }
  }

  const userInfo = await mongoDB.fakeLoginData.findOne({ where: { sessionId: EVOSESSIONID } })
  if (userInfo == null) {
    return { status: FakeApiStatus.DataNotFound, ms: 'authorization failed' }
  }

  const { agentCode, userId } = userInfo
  let url: string
  try {
    console.log(`evolution config ${agentCode + userId}`)

    const evolutionTable = await mongoDB.dataEvolutionTable.findOne({ where: { _id: table_id } })

    let dbConfigData = evolutionTable?.configData

    const username = agentCode + userId

    const loginData = await mongoDB.fakeLoginData.findOne({ where: { username } })
    if (loginData == null) {
      return {
        status: 100,
        message: 'User not found',
      }
    }

    const query = req.query as Record<string, string>

    if (query.origin != null) {
      //이번에 새로 생긴 url 확인
      query.origin = loginData.evolutionUrl
    }

    const qs = querystring(req.query as Record<string, string>)

    url = `${loginData.evolutionUrl}/config?${qs}`
    const configRes = await callEvo(url, {
      headers: req.headers,
      username,
      timeout: 2000,
    })

    console.log(`evolution config_res`, agentCode + userId, configRes.status, JSON.stringify(configRes.recvHeaders))
    if (configRes.status !== 200) {
      return await reply.status(configRes.status).headers(configRes.recvHeaders).send(configRes.data)
    }

    let apiConfigData: EvolutionConfigData

    // JSON 응답 데이터를 파싱
    if (typeof configRes?.data === 'string') {
      try {
        apiConfigData = JSON.parse(configRes.data) as EvolutionConfigData
      } catch (parseError) {
        console.log(`evolution config JSON parse error`, agentCode + userId, parseError.message)
        return { status: FakeApiStatus.InternalServerError, message: 'Invalid JSON response from Evolution server' }
      }
    } else {
      apiConfigData = configRes?.data as EvolutionConfigData
    }

    // db에 값이 없을 때만 db에 insert 한다.
    // 옛날 클라이언트 버전에서 새로운 config 값이 에러를 일으 킬 수 있기 때문이다.
    if (dbConfigData == null && apiConfigData?.table_id != null) {
      mongoDB.dataEvolutionTable
        .updateOne(
          { _id: table_id },
          {
            $set: {
              //configData: apiConfigData,
              name: apiConfigData.aams_game_name,
              nameKo: apiConfigData.table_name_ko,
              provider: apiConfigData.provider,
              gameType: apiConfigData.aams_game_name,
              gameTypeUnified: apiConfigData.game_type,
              ...(apiConfigData.gameSubType != null && { gameSubType: apiConfigData.gameSubType }),
            } as DataEvolutionTable,
          },
          { upsert: true },
        )
        .catch((err) => {
          console.log(errorToString(err))
        })
      dbConfigData = apiConfigData
    }

    const baccaratLimit = getBaccaratLimits(apiConfigData)

    // 유저별로 다른 페이크 벤더로 접속할 경우가 있어서 이렇게 변경
    await mongoDB.fakeUserTableConfig
      .updateOne(
        { userId, agentCode, tableId: table_id },
        {
          $setOnInsert: {
            createdAt: new Date(),
          },
          $set: {
            configData: apiConfigData,
            baccaratLimit,
          } as FakeUserTableConfig,
        },
        { upsert: true },
      )
      .catch((err) => {
        console.log(errorToString(err))
      })

    // console.log(JSON.stringify(configRes))

    apiConfigData.casinoId = fakeCasinoId
    apiConfigData.serverHost = fakeServerHost

    console.log()

    return await reply.headers(configRes.recvHeaders).send(apiConfigData)
  } catch (err) {
    console.log(`evolution config error`, agentCode + userId, url, JSON.stringify(req.headers), errorToString(err))

    if (err.response != null) {
      return await reply.status(err.response.status).send(err.response.data)
    }
  }
  return {
    status: 1,
  }
}

export async function setup(req: FastifyRequest, reply: FastifyReply) {
  const { EVOSESSIONID } = req.cookies as { EVOSESSIONID: string }

  if (EVOSESSIONID == null) {
    return { status: FakeApiStatus.DataNotFound, ms: 'authorization failed' }
  }

  const evolutionUrl = config.EVOLUTION_URL ?? (await getEvolutionUrl(EVOSESSIONID))

  if (evolutionUrl == null) {
    return { status: FakeApiStatus.DataNotFound, ms: 'authorization failed' }
  }

  try {
    const url = `${evolutionUrl}/setup`

    const setupRes = await callEvo(url, {
      headers: req.headers,
    })

    const setupData = setupRes.data

    const setupHeaders = setupRes.recvHeaders

    delete setupHeaders['access-control-allow-origin']
    delete setupHeaders['content-encoding']

    if (_.isObject(setupRes.data) === false) {
      console.log('setupData is not object', setupData, JSON.stringify(setupRes.recvHeaders))
      return await reply.headers(setupHeaders).send(setupData)
    }

    setupData.casino_id = fakeCasinoId

    const sendData = { ...setupData, ...(isLambda && { wsHost }) }

    return await reply.headers(setupHeaders).send(sendData)
    // reply.headers(setupHeaders)
    // return sendData
  } catch (err) {
    console.log(`setup ${errorToString(err)}`)
    if (err.response != null) {
      return await reply.status(err.response.status).send(err.response.data)
    }
  }

  return {
    status: 1,
  }
}
export async function playerHistoryDays(
  agentCode: string,
  userId: string,
  url: string,
  headers: Record<string, string | string[]>,
) {
  const loginData = await mongoDB.fakeLoginData.findOne({ where: { agentCode, userId } })
  if (loginData == null) {
    return null
  }

  try {
    const res = await callEvo(`${loginData.evolutionUrl}${url}`, {
      headers,
    })

    const datas = res.data as Array<{
      date: string // '20230511';
      stake: string // '₩ 0.00'
      payout: string // '₩ 0.00'
      balances: unknown // {}
    }>

    const now = new Date()

    const evolutionDays = datas.filter((value) => {
      const date = parse(value.date, 'yyyyMMdd', now)
      return now.getTime() - date.getTime() < DAY_MS * 7
    })

    const today = startOfDay(now)

    const promises: Array<{
      date: string
      evolutionDay?: {
        date: string // '20230511';
        stake: string // '₩ 0.00'
        payout: string // '₩ 0.00'
        balances: unknown // {}
      }
      promise?: Promise<BetDataCasino>
    }> = []
    for (let dayAgo = 0; dayAgo < 7; dayAgo++) {
      // UTC 시간으로 맞춰둔다.
      const dayAgoTime = addDays(today, -dayAgo)

      const startDate = dayAgoTime
      startDate.setTime(startDate.getTime() - startDate.getTimezoneOffset() * 60_000)
      const endDate = addDays(today, 1)

      const dateStr = format(startDate, 'yyyyMMdd')

      const evolutionDay = evolutionDays.find((value) => value.date === dateStr)

      if (evolutionDay != null) {
        promises.push({
          date: dateStr,
          evolutionDay,
        })
      } else {
        const promise = mongoDB.betDataCasino.findOne({
          where: {
            agentCode,
            userId,
            vendor: vendorCode,
            betStatus: 'SETTLE',
            betTime: { $gte: startDate, $lt: endDate } as any,
          },
        })
        promises.push({
          date: dateStr,
          promise,
        })
      }
    }

    const result = []
    for (const promiseDate of promises) {
      if (promiseDate.evolutionDay != null) {
        result.push(promiseDate.evolutionDay)
      } else if (promiseDate.promise != null) {
        const betData = await promiseDate.promise
        if (betData != null) {
          result.push({
            date: promiseDate.date,
            stake: '₩ 0.00',
            payout: '₩ 0.00',
            balances: {},
          })
        }
      }
    }

    return result
  } catch (err) {
    console.log(errorToString(err))
  }
}
export async function playerHistoryDay(
  agentCode: string,
  userId: string,
  dayParam: string,
  url: string,
  headers: FastifyHeaders,
) {
  const loginData = await mongoDB.fakeLoginData.findOne({ where: { agentCode, userId } })
  if (loginData == null) {
    return null
  }

  const now = new Date()

  const startDate = parse(dayParam, 'yyyyMMdd', now)

  // UTC 시간으로 맞춰둔다.
  startDate.setTime(startDate.getTime() - startDate.getTimezoneOffset() * 60_000)

  const endDate = addDays(startDate, 1)

  // 앞뒤로 5분을 좀더 여유 두면서 크롤링 한다.
  startDate.setTime(startDate.getTime() - MINUTE_MS * 5)
  endDate.setTime(endDate.getTime() + MINUTE_MS * 5)

  const [fakeDataArr, orgRes] = await Promise.all([
    mongoDB.betDataCasino.find({
      select: ['tableId', 'roundId', 'fakeRoundId', 'amountBet', 'amountWin', 'betTime', 'updatedAt', 'betStatus'],
      where: {
        vendor: vendorCode,
        userId,
        agentCode,
        betTime: { $gte: startDate, $lt: endDate } as any,
        isFakeBet: true,
      },
      order: { betTime: -1 },
    }),
    callEvo(`${loginData.evolutionUrl}${url}`, {
      headers,
    }),
  ])

  const orgData = orgRes.data as Array<{
    id: string
    type: string
    gameType: string
    subType: string
    stake: string
    payout: string
    time: string
    description: string
    settleTime: string
    tableName: string
    balanceId: 'combined'
  }>

  const fakeDatas: Record<string, BetDataCasino> = {}
  for (const fakeData of fakeDataArr) {
    fakeDatas[fakeData.fakeRoundId] = fakeData
  }

  let newData = []

  if (config.fake100Percent) {
    const tempData = []

    for (const orgHistory of orgData ?? []) {
      const fakeData = fakeDatas[orgHistory.id]

      if (fakeData != null) {
        if (fakeData.betStatus !== 'SETTLE') {
          continue
        }

        orgHistory.stake = `₩ ${fakeData.amountBet}`
        orgHistory.payout = `₩ ${fakeData.amountWin}`
      }

      tempData.push({ ...orgHistory, sortTime: new Date(orgHistory.time) })
    }

    for (const data of fakeDataArr) {
      const tableInfo = await getTableInfo(data.tableId)
      tempData.push({
        id: data.fakeRoundId ?? data.roundId,
        type: tableInfo?.gameTypeUnified ?? '',
        gameType: tableInfo?.gameTypeUnified ?? '',
        // 서브타입을 넣어줘야 풍성한 바카라와 라이트닝 바카라 이름이 나온다.
        subType: tableInfo?.gameSubType ?? '',
        stake: `₩ ${data.amountBet}`,
        payout: `₩ ${data.amountWin}`,
        time: formatInTimeZone(data.betTime, 'UTC', 'yyyy-MM-dd HH:mm:ss'),
        description: tableInfo?.description ?? tableInfo?.gameType,
        settleTime: formatInTimeZone(data.betTime, 'UTC', 'yyyy-MM-dd HH:mm:ss'),
        tableName: tableInfo?.gameType,
        balanceId: 'combined',
        sortTime: new Date(data.betTime),
      })
    }

    tempData.sort((a, b) => b.sortTime.getTime() - a.sortTime.getTime())

    newData = tempData.map((value) => {
      const { sortTime, ...remainData } = value
      return remainData
    })
  } else {
    // 가끔 orgData에 없는 fakeData가 있어서 이렇게 처리한다.
    const tempData = []

    for (const orgHistory of orgData ?? []) {
      const fakeData = fakeDatas[orgHistory.id]

      // 페이크 데이터가 있으면 무시한다. 페이크 데이터가 없는 히스토리만 여기에서 넣는다.
      if (fakeData != null) {
        continue
      }

      tempData.push({ ...orgHistory, sortTime: new Date(orgHistory.time + ' UTC') })
    }

    for (const data of fakeDataArr) {
      if (data.betStatus !== 'SETTLE') {
        // 마감이 안된 데이터가 있으면 무시한다.
        continue
      }

      const tableInfo = await getTableInfo(data.tableId)
      tempData.push({
        id: data.fakeRoundId ?? data.roundId,
        type: tableInfo?.gameTypeUnified ?? '',
        gameType: tableInfo?.gameTypeUnified ?? '',
        // 서브타입을 넣어줘야 풍성한 바카라와 라이트닝 바카라 이름이 나온다.
        subType: tableInfo?.gameSubType ?? '',
        stake: `₩ ${data.amountBet}`,
        payout: `₩ ${data.amountWin}`,
        time: formatInTimeZone(data.betTime, 'UTC', 'yyyy-MM-dd HH:mm:ss'),
        description: tableInfo?.description ?? tableInfo?.gameType,
        settleTime: formatInTimeZone(data.updatedAt, 'UTC', 'yyyy-MM-dd HH:mm:ss'),
        tableName: tableInfo?.gameType,
        balanceId: 'combined',
        sortTime: new Date(data.betTime),
      })
    }

    tempData.sort((a, b) => b.sortTime.getTime() - a.sortTime.getTime())

    newData = tempData.map((value) => {
      const { sortTime, ...remainData } = value
      return remainData
    })
  }

  return newData
}

export async function fetchHistoryGame(
  agentCode: string,
  userId: string,
  gameId: string,
  queryStr: string,
  headers: FastifyHeaders,
) {
  const loginData = await mongoDB.fakeLoginData.findOne({ where: { agentCode, userId } })
  if (loginData == null) {
    return null
  }

  return await callEvo(`${loginData.evolutionUrl}/api/player/history/game/${gameId}?${queryStr}`, {
    headers,
  })
}

export async function playerHistoryGame(
  agentCode: string,
  userId: string,
  gameId: string,
  queryStr: string,
  headers: FastifyHeaders,
) {
  const betData = await mongoDB.betDataCasino.findOne({
    where: { vendor: vendorCode, userId, agentCode, fakeRoundId: gameId },
  })

  if (betData == null || !betData.isFakeBet) {
    const historyGameRes = await fetchHistoryGame(agentCode, userId, gameId, queryStr, headers)
    return historyGameRes.data
  }

  let result = betData?.content?.result?.result
  const oldParticipants = betData?.content?.participants
  let participants = oldParticipants

  if (result == null || participants == null) {
    try {
      const gameData = await mongoDB.fakeGameData.findOne({ where: { gameId } })

      if (gameData == null) {
        throw new Error('fakeGameData not found')
      }

      if (gameData.dealing === 'Cancelled') {
        throw new Error('round is cancelled')
      }

      result = makeContentResult(betData.tableId, gameData)

      const { betSettled } = betData

      if (betData.isFakeBet && betSettled != null) {
        participants = [makeParticipants(agentCode + userId, betSettled)]
      }

      mongoDB.betDataCasino
        .updateOne(
          {
            vendor: vendorCode,
            userId,
            agentCode,
            fakeRoundId: gameId,
          } as Partial<BetDataCasino>,
          {
            $set: {
              ...(oldParticipants == null && { 'content.participants': participants }),
              'content.result': {
                ...result,
                result: {
                  ...result,
                },
              },
            },
          },
        )
        .catch((err) => {
          console.log(errorToString(err))
        })
    } catch (err) {
      console.log(errorToString(err))
    }
  }

  const tableInfo = await getTableInfo(betData.tableId)

  return {
    id: betData.roundId,
    parentId: '',
    startedAt: betData.betTime.toISOString(),
    settledAt: betData.updatedAt.toISOString(),
    status: 'Resolved',
    type: tableInfo?.gameTypeUnified ?? '',
    gameType: tableInfo?.gameTypeUnified ?? '',
    gameSubType: tableInfo?.gameSubType ?? '',
    table: { id: betData.tableId, name: tableInfo?.nameKo ?? tableInfo?.name ?? '' },
    result,
    participants,
    dealer: {
      uid: 'tts133850_______',
      name: 'Rothy',
    },
  }
}
