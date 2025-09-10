import os from 'os'
import CryptoJS = require('crypto-js')
import { type EvolutionConfigData } from '@service/src/lib/interface/mongo/data-evolution-table'
import { FastifyRequest } from 'fastify'

export const SECOND_MS = 1000

export const MINUTE_MS = 60_000

export async function sleep<T>(ms: number, returnValue?: T) {
  return await new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(returnValue)
    }, ms)
  })
}

export function printMemoryUsage() {
  const mem = process.memoryUsage()
  for (const key in mem) {
    mem[key] = `${(mem[key] / 1024 / 1024).toFixed(1)}MB`
  }
  return JSON.stringify(mem)
}

export async function timeoutPromise<T>(promise: Promise<T>, ms: number) {
  return await new Promise((resolve, reject) => {
    promise.then(resolve).catch(reject)
    setTimeout(reject, ms)
  })
}

export function errorToObj(err) {
  if (err?.response != null) {
    return {
      error: err.toString(),
      message: err.response.data,
    }
  } else if (err instanceof Error) {
    return {
      error: err.message,
      stack: err.stack,
    }
  }
  return {
    error: err,
  }
}

export function errorToString(err) {
  return JSON.stringify(errorToObj(err))
}

export function getUserInfo(username: string) {
  return {
    agentCode: username.substring(0, 3).toLowerCase(),
    userId: username.substring(3).toLowerCase(),
  }
}

export function generateSortedQueryString(
  unsortedDict: Record<string, string | { toString: () => string }> | unknown,
): string {
  const sort = Object.entries(unsortedDict).sort((obj1, obj2) => {
    if (obj1 > obj2) {
      return 1
    }

    if (obj1 < obj2) {
      return -1
    }

    return 0
  })

  return sort.map((value) => `${value[0]}=${value[1].toString()}`).join('&')
}

export function querystring(dict: Record<string, string | { toString: () => string }>): string {
  return Object.entries(dict)
    .map((value) => `${value[0]}=${value[1]?.toString() ?? ''}`)
    .join('&')
}

export function randomString(e = 10) {
  let t = ''
  for (; t.length < e; )
    t += Math.random()
      .toString(36)
      .substr(2, e - t.length)
  return t
}
export function randomHexString(e = 10) {
  let t = ''
  for (; t.length < e; )
    t += Math.random()
      .toString(16)
      .substr(2, e - t.length)
  return t
}
export function randomNumberString(e = 10) {
  let t = ''
  for (; t.length < e; )
    t += Math.random()
      .toString(10)
      .substr(2, e - t.length)
  return t
}

export function makeInstanceId(userId: string, tableId?: string, vtId?: string) {
  const o = randomString(5)
  const e = userId || '0'
  const t = vtId || tableId || ''
  let s = 127
  for (const i of e + t + o) s = (s + ~~parseInt(i, 36)) % 36
  return `${o}${s.toString(36)}-${e}-${t}`
}

console.log(randomNumberString(4))

const iv = CryptoJS.enc.Hex.parse('0000000000000000')
const key = CryptoJS.enc.Utf8.parse('B105E792F4F848C8AC83B550B3871C8A')

export function DecryptData(value: string) {
  return CryptoJS.AES.decrypt(value, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    keySize: 256 / 32,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8)
}

export function EncryptData(value: any) {
  const plaintext = typeof value === 'object' ? JSON.stringify(value) : value
  const cipher = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    keySize: 256 / 32,
    padding: CryptoJS.pad.Pkcs7,
  })
  return cipher.toString()
}

export function printAxiosErrorLog(err) {
  let errObj
  if (err.stack) {
    errObj = {
      message: err.toString(),
      stack: err.stack,
    }
  } else {
    const responseData = err?.response?.data
    errObj = {
      message: err.toString(),
      ...(responseData != null && { responseData }),
      obj: err,
    }
  }
  console.log(JSON.stringify(errObj))
}

export const formatMemoryUsage = (data) => `${Math.round((data / 1024 / 1024) * 100) / 100} MB`

export function getBaccaratLimits(configData: EvolutionConfigData) {
  const {
    player_min_bet,
    player_max_bet,
    banker_min_bet,
    banker_max_bet,
    tie_min_bet,
    tie_max_bet,
    player_pair_min_bet,
    player_pair_max_bet,
    banker_pair_min_bet,
    banker_pair_max_bet,
    either_pair_min_bet,
    either_pair_max_bet,
    perfect_pair_min_bet,
    perfect_pair_max_bet,
    player_bonus_min_bet,
    player_bonus_max_bet,
    banker_bonus_min_bet,
    banker_bonus_max_bet,
    super_six_min_bet,
    super_six_max_bet,
    tie_reductions,
  } = configData ?? {}

  let tieMin = Number(tie_min_bet)
  let tieMax = Number(tie_max_bet)

  if (tie_reductions != null) {
    const tie_reduction_ratio = Number(tie_reductions.split(':')?.[1])
    tieMin = tieMin * tie_reduction_ratio
    tieMax = tieMax * tie_reduction_ratio
  }

  return {
    ...(player_min_bet != null && {
      Player: {
        min: Number(player_min_bet),
        max: Number(player_max_bet),
      },
    }),
    ...(banker_min_bet != null && {
      Banker: {
        min: Number(banker_min_bet),
        max: Number(banker_max_bet),
      },
    }),
    ...(tie_min_bet != null && {
      Tie: {
        min: tieMin,
        max: tieMax,
      },
    }),
    ...(player_pair_min_bet != null && {
      PlayerPair: {
        min: Number(player_pair_min_bet),
        max: Number(player_pair_max_bet),
      },
    }),
    ...(banker_pair_min_bet != null && {
      BankerPair: {
        min: Number(banker_pair_min_bet),
        max: Number(banker_pair_max_bet),
      },
    }),
    ...(either_pair_min_bet != null && {
      EitherPair: {
        min: Number(either_pair_min_bet),
        max: Number(either_pair_max_bet),
      },
    }),
    ...(perfect_pair_min_bet != null && {
      PerfectPair: {
        min: Number(perfect_pair_min_bet),
        max: Number(perfect_pair_max_bet),
      },
    }),
    ...(player_bonus_min_bet != null && {
      PlayerBonus: {
        min: Number(player_bonus_min_bet),
        max: Number(player_bonus_max_bet),
      },
    }),
    ...(banker_bonus_min_bet != null && {
      BankerBonus: {
        min: Number(banker_bonus_min_bet),
        max: Number(banker_bonus_max_bet),
      },
    }),
    ...(super_six_min_bet != null && {
      SuperSix: {
        min: Number(super_six_min_bet),
        max: Number(super_six_max_bet),
      },
    }),
  }
}

export function getLocalIp() {
  const networkInterfaces = os.networkInterfaces()

  for (const [interfaceName, interfaceInfo] of Object.entries(networkInterfaces)) {
    for (const addressInfo of interfaceInfo) {
      if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
        return addressInfo.address
      }
    }
  }
}

export function getFastifyIp(req: FastifyRequest) {
  return req.headers['x-forwarded-for']?.toString() ?? req.ip
}
