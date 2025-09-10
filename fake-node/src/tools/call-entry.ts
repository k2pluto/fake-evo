import { errorToString } from '../common/util'
import { callHttp2 } from '../common/call-http2'

export async function callEntry() {
  const evolutionEntryUrlStr =
    'https://tmkrst8.evo-games.com/entry?params=Y2FzaW5vX2lkPXRta3JzdDgwMDAwMDAwMDEKc2lnbmF0dXJlPUFhTlNOalBEakU1UXlGR2E5dlpibmhkS1ltOWM3UjN3Q1RkRTFHczgzejlhMmpwVU81S0QzbURhT0hGbVFISXJSdFVqYzVDZWZTZ1JzYko4X1A3VVVnCnVhX2xhdW5jaF9pZD0xN2I4NjZiYjg1ZTA3Nzc4ZjkyMmFmZWUKZ2FtZUludGVyZmFjZT12aWV3MQpzaXRlPTIKandzaD1leUpyYVdRaU9pSXhOamd5TkRFeU1UUTNPVGMwSWl3aVlXeG5Jam9pUlZNeU5UWWlmUQpwbGF5X21vZGU9cmVhbF9tb25leQpjYXRlZ29yeT10b3BfZ2FtZXMK&JSESSIONID=rnpt7vre2xyaa7oxrx27z7fixvztdyrg83b0d013'

  let evolutionEntryUrl = new URL(evolutionEntryUrlStr)

  let evolutionCookie = ''
  let evolutionHeaders = {}
  let sessionId: string
  try {
    for (let i = 0; i < 2; i++) {
      const data = await callHttp2(evolutionEntryUrl.toString())
      //const data = await callHttp2('https://google.com')
      console.log(data)

      if (data.status !== 302) {
        console.log('callEntry error', data)
        return {
          status: 103,
        }
      }

      evolutionHeaders = data.headers
      evolutionCookie = evolutionHeaders['set-cookie'][0]

      const setCookieArr = evolutionCookie.split('; ')

      const setCookies: Record<string, string> = {}
      for (const i of setCookieArr) {
        const [key, value] = i.split('=')
        setCookies[key] = value
      }

      if (setCookies['EVOSESSIONID'] != null && setCookies['EVOSESSIONID'] !== '') {
        sessionId = setCookies['EVOSESSIONID']
        break
      } else {
        evolutionEntryUrl = new URL(evolutionEntryUrl.origin + evolutionHeaders['location'])
      }
    }
  } catch (err) {
    if (err.response?.status === 302) {
      evolutionHeaders = err.response.headers
      const setCookies: string[] = evolutionHeaders['set-cookie']
      evolutionCookie = setCookies.join(';')
    } else {
      console.log('connectEvolution error', errorToString(err))
      return {
        status: 103,
      }
    }
  }
  console.log(sessionId)
}

export async function main() {
  await callEntry()

  return
}

main()
