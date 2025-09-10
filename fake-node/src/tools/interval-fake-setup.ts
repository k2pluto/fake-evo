import { getUserInfo, sleep } from '../common/util'
import axios from 'axios'

const cookies: { [username: string]: string } = {}

async function connectEvolution(username: string, evolutionEntryUrl: string) {
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

  console.log(JSON.stringify(setup.data))
}

export async function getSwixGameUrl(agentCode: string, userId: string): Promise<string> {
  const res = await axios.get(`https://token.blackmambalive.com/swix/token?username=${agentCode + userId}`)

  console.log(JSON.stringify(res.data))
  const { gameUrl } = res.data
  return gameUrl
}

export async function connectSwixCrawler(username: string) {
  console.log(`connectSwixCrawler username : ${username}`)

  const { agentCode, userId } = getUserInfo(username)
  const gameUrl = await getSwixGameUrl(agentCode, userId)
  if (gameUrl == null) {
    throw new Error('getGameUrl 실패')
  }

  return connectEvolution(username, gameUrl)
}

async function main() {
  console.log('main')

  while (true) {
    try {
      await connectSwixCrawler('texaa2233')
    } catch (err) {
      console.log(err)
    }

    await sleep(60_000)
  }
}

/*setInterval(() => {
  console.log('interval')
}, 10000) */

main()
