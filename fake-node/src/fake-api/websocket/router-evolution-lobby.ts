import { config } from '..//config'
import { authManager, mongoDB } from '../app'

import { type SocketData } from './socket-data'

import { globalStore } from '../global-store'

async function lobbyBalanceUpdated(packet, { user }: SocketData) {
  const balanceRes = await authManager.balance(user.agentCode, user.userId)

  if (balanceRes?.balance != null) {
    // 소숫점 밸런스는 문제를 일으켜서 정수로 바꾼다.
    const userBalance = Math.floor(balanceRes.balance + balanceRes.user.lockedBalance)
    packet.args.balance = userBalance
    packet.args.balances.combined = userBalance
  }

  return packet
}
export async function lobbyConfigs(packet: {
  args: {
    configs: Record<string, any>
  }
  type: 'lobby.configs'
}) {
  for (const key of Object.keys(packet.args.configs)) {
    if (key !== 'DragonTiger00001:qlunn4btk3rprty3') {
      delete packet.args.configs[key]
    }
  }
  // packet.args.infos = []

  return packet
}
export async function lobbyInfos(packet: {
  args: {
    infos: Record<string, any>
  }
  type: 'lobby.infos'
}) {
  // packet.args.infos = []

  return packet
}
export async function lobbyCategories(packet: {
  args: {
    categories: Array<{
      id: string
      special: false
      tables: string[]
    }>
  }
  type: 'lobby.categories'
}) {
  // 여기서 슬롯을 안나오게 막는다.
  packet.args.categories = (packet.args.categories ?? []).filter((value) => value.id !== 'slots')

  // 여기서 특정한 테이블들을 삭제한다.
  const category = packet.args.categories.find((value) => value.id === 'roulette')

  if (category != null) {
    const index = category.tables.findIndex((value) => value === 'DoubleBallRou001')

    category.tables.splice(index, 1)
  }

  return packet
}

export async function lobbyVideo(
  packet: {
    args: {
      table: string // '48z5pjps3ntvqc1b:qmi4f75w4zgoarpo'
      video: {
        aFlvs: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ss_med_audioonly/manifest-ws.json'
        aHlsS: string // '/app/11/gen1_ss_low_audioonly/playlist.m3u8'
        fbs: string // 'wss://live1-ufb.egcvi.com/ws/video/11/gen1_ss_med'
        sbn: string // 'gen1_ss'
        ssd: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ss_auto/manifest-ws.json'
        v1d: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ssi_auto/manifest-ws.json'
        v1m: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ss_auto/manifest-ws.json'
        v2d: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ss_auto/manifest-ws.json'
        vmh: string // 'live1.egcvi.com'
      }
    }
    type: 'lobby.video'
  },
  { user, selfUrl }: SocketData,
) {
  // 여기서 슬롯을 안나오게 막는다.

  const streamHost1 = packet.args.video.vmh

  if (streamHost1 != null && streamHost1 !== globalStore.getStreamHost1()) {
    globalStore.setStreamHost1(streamHost1)
  }

  // 사용자가 Evolution 영상 서버에 직접 연결 (URL 교체하지 않음)
  console.log('lobbyVideo - Evolution original vmh:', packet.args.video.vmh)

  /*await mongoDB.fakeLoginData.updateOne(
    {
      username: user.agentCode + user.userId,
    },
    {
      $set: {
        streamHost1,
      },
    },
  )*/

  return packet
}
export async function lobbyPreview(
  packet: {
    args: {
      table: string // '48z5pjps3ntvqc1b:qmi4f75w4zgoarpo'
      stream: {
        aFlvs: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ss_med_audioonly/manifest-ws.json'
        aHlsS: string // '/app/11/gen1_ss_low_audioonly/playlist.m3u8'
        fbs: string // 'wss://live1-ufb.egcvi.com/ws/video/11/gen1_ss_med'
        sbn: string // 'gen1_ss'
        ssd: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ss_auto/manifest-ws.json'
        v1d: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ssi_auto/manifest-ws.json'
        v1m: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ss_auto/manifest-ws.json'
        v2d: string // 'https://live1.egcvi.com/cdn/app/11/amlst:gen1_ss_auto/manifest-ws.json'
        vmh: string // 'live1.egcvi.com'
      }
    }
    type: 'lobby.preview'
  },
  socketData: SocketData,
) {
  // 여기서 슬롯을 안나오게 막는다.
  const { selfUrl } = socketData

  const streamHost1 = packet.args.stream.vmh

  socketData.lobbyVmh = streamHost1

  // 이렇게 넣어도 로컬에서 테스트 할때는 프리뷰가 안나온다.
  //packet.args.stream.vmh = config.VIDEO_HOST
  packet.args.stream.vmh = new URL(selfUrl).host

  for (const key in packet.args.stream) {
    packet.args.stream[key] = packet.args.stream[key].replace('https://' + streamHost1, selfUrl)
  }

  return packet
}

export default {
  'lobby.balanceUpdated': lobbyBalanceUpdated,
  // ['lobby.configs']: lobbyConfigs,
  // ['lobby.infos']: lobbyInfos,
  'lobby.categories': lobbyCategories,
  //...(config.proxyVideo === true && { 'lobby.video': lobbyVideo }),
  ...(config.proxyVideo === true && { 'lobby.video': lobbyVideo, 'lobby.preview': lobbyPreview }),
} as Record<string, (packet: unknown, socketData?: SocketData) => Promise<unknown>>
