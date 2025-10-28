import { parse as parseCookie } from 'cookie'

import _ from 'lodash'

import { mongoDB } from '../app'
import { errorToString, getLocalIp, getUserInfo } from '../../common/util'
import { type FakeLoginData } from '@service/src/lib/interface/mongo/fake-login-data'

import { callEvo } from './call-evo'
import { globalStore } from '../global-store'
import { tlsCurrentPreset } from './call-axios'

const localIp = getLocalIp()

export async function connectEvolution(
  evolutionEntryUrlStr: string,
  agentId: string,
  username: string,
  headers: Record<string, string | string[]>,
) {
  const { agentCode, userId } = getUserInfo(username)

  let evolutionEntryUrl = new URL(evolutionEntryUrlStr)
  const evolutionUrl = evolutionEntryUrl.origin

  //let evolutionCookie: string[] | string = headers.cookie
  const evolutionCookie = headers.cookie as string

  const evolutionAccumCookie: Record<string, string> = {}
  for (let i of evolutionCookie?.split('; ') ?? []) {
    const [key, value] = i.split('=')
    evolutionAccumCookie[key] = value
  }

  let evolutionHeaders: Record<string, string | string[]> = {}
  let sessionId: string

  let accumSetCookies: Record<string, string> = {}

  try {
    for (let i = 0; i < 2; i++) {
      //console.log('connectEvolution', evolutionEntryUrl)
      console.log('connectEvolution', username, evolutionEntryUrl.host)

      const currentCookie = Object.entries(evolutionAccumCookie)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')

      // Evolution 도메인으로 직접 연결한 것처럼 헤더 재구성 (프록시 증거 제거)
      const cleanHeaders = {
        host: evolutionEntryUrl.host,
        origin: evolutionUrl,  // Evolution origin (loginSwix와 동일하게)
        accept: headers['accept'],
        'accept-encoding': headers['accept-encoding'] ?? 'gzip, deflate, br',
        'accept-language': headers['accept-language'],
        'user-agent': headers['user-agent'],
        'sec-ch-ua': headers['sec-ch-ua'],
        'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'],
        'sec-ch-ua-platform': headers['sec-ch-ua-platform'],
        'sec-fetch-dest': headers['sec-fetch-dest'] ?? 'document',
        'sec-fetch-mode': headers['sec-fetch-mode'] ?? 'navigate',
        'sec-fetch-site': 'none',  // loginSwix와 동일하게 'none' 고정
        'sec-fetch-user': headers['sec-fetch-user'] ?? '?1',
        'upgrade-insecure-requests': '1',
        cookie: currentCookie,
      }

      console.log('===== connectEvolution: Sending headers to Evolution =====')
      console.log('Username:', username, 'URL:', evolutionEntryUrl.toString())
      console.log('Header keys:', Object.keys(cleanHeaders).join(', '))
      for (const key of ['host', 'origin', 'sec-fetch-site']) {
        console.log(`  ${key}: ${cleanHeaders[key]}`)
      }
      console.log('==========================================================')

      const fetchRes = await callEvo(evolutionEntryUrl.toString(), {
        headers: cleanHeaders,
        username,
        timeout: 2000,
      })
      // const data = await callHttp2('https://google.com')

      const data = fetchRes.data?.substring != null ? fetchRes.data.substring(0, 200) : fetchRes.data

      mongoDB.logFakeEntry
        .save({
          agentId,
          username,
          userId,
          internalIp: localIp,
          url: evolutionEntryUrl.toString(),
          data: data,
          sendHeaders: fetchRes.sendHeaders,
          recvHeaders: fetchRes.recvHeaders,
          status: fetchRes.status,
          entryTime: new Date(),
        })
        .catch((err) => {
          console.log('logFakeEntry error', errorToString(err))
        })

      if (fetchRes.status !== 302) {
        console.log(
          'connectEvolution_res_error',
          username,
          tlsCurrentPreset,
          fetchRes.status,
          JSON.stringify({
            ...fetchRes,
            orgHeaders: headers,
            data,
          }),
        )
        return {
          status: 103,
        }
      }
      console.log('connectEvolution_res', username, tlsCurrentPreset, JSON.stringify(fetchRes))

      evolutionHeaders = fetchRes.recvHeaders

      const setCookies = evolutionHeaders['set-cookie']

      for (let cookieStr of setCookies ?? []) {
        const [key, value] = cookieStr.split('=')
        accumSetCookies[key] = cookieStr
        evolutionAccumCookie[key] = value.split(';')[0]
      }

      if (setCookies == null) {
        const data = fetchRes.data
        console.log('callEntry error', data)
        return {
          status: 104,
        }
      }

      const evolutionCookie = typeof setCookies === 'string' ? setCookies : setCookies.join(';')
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
    console.log('connectEvolution error', username, errorToString(err))
    return {
      status: 103,
    }
  }

  console.log('sessionId : ' + sessionId)
  if (sessionId == null) {
    console.log('connectEvolution_fail : ' + sessionId)
  }

  evolutionHeaders['set-cookie'] = Object.values(accumSetCookies)

  await mongoDB.fakeLoginData.updateOne(
    { username },
    {
      $set: {
        regDate: new Date(),
        agentCode,
        userId,
        evolutionUrl,
        evolutionHeaders,
        sessionId,
      } as Partial<FakeLoginData>,
    },
    {
      upsert: true,
    },
  )

  // evolutionCookie의 EVOSESSIONID와 loginData의 data.session_id 값은 같은 값이다.
  const setCookies = evolutionHeaders['set-cookie']
  if (_.isArray(setCookies)) {
    let hasCdnCookie = false

    //for (const setCookie of setCookies ?? []) {
    for (let i = 0; i < setCookies.length; i++) {
      const setCookie = setCookies[i]

      if (setCookie.includes('cdn')) {
        hasCdnCookie = true
      }

      if (setCookie.includes('Domain=.evo-games.com;')) {
        setCookies[i] = setCookie.replace('Domain=.evo-games.com;', '')
      }
    }

    if (!hasCdnCookie) {
      setCookies.push(`cdn=${globalStore.getCdn()}; Secure; SameSite=None`)
    }
  }

  return {
    status: 0,
    data: { sessionId, url: evolutionUrl, headers: evolutionHeaders },
  }
}
