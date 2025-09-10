import { MINUTE_MS } from '../../utility/helper'
import { MongoBet } from '../../interface/mongo'
import { AgentGameSetting, AgentVendorSetting } from '../../interface/mongo/set-agent-game'
import { UserGameSetting } from '../../interface/mongo/set-user-game'

import { DataVendor } from '../../interface/mongo/data-vendor'
import { GameInfo } from '../../interface/mongo/data-game-info'
import { SimpleAgent } from '../../interface/sql'

export const agentGameSettingCache: {
  [agentId: string]: {
    data: AgentGameSetting
    expire: number
  }
} = {}

export function clearAgentGameSettingExpiredCache(now: Date) {
  for (const key in agentGameSettingCache) {
    if (agentGameSettingCache[key].expire < now.getTime()) {
      delete agentGameSettingCache[key]
    }
  }
}

//테스트를 쉽게 하기 위해서 now 를 인자로 받음

export async function getAgentGameSetting(mongoBet: MongoBet, agentId: string, now?: Date) {
  const cache = agentGameSettingCache[agentId]

  if (cache != null && now != null && cache.expire > now.getTime()) {
    return cache.data
  }

  const expire = (now?.getTime() ?? Date.now()) + MINUTE_MS * 5

  const newData = await mongoBet.agentGameSetting.findOne({ where: { agentId } })

  ///console.log(`refresh agentGameSettingCache`, agentId, now?.toISOString(), expire, JSON.stringify(newData))

  agentGameSettingCache[agentId] = {
    data: newData,
    expire,
  }

  return newData
}

//테스트를 쉽게 하기 위해서 now 를 인자로 받음

export async function getAgentGameSettingTree(mongoBet: MongoBet, agent: SimpleAgent, now?: Date) {
  const agentTrees = agent.agentTree?.split('|').filter((value) => value !== '') ?? []

  const agentGameSettings: AgentGameSetting[] = []

  let mergedVendorSettings: {
    [vendorCode: string]: AgentVendorSetting
  } = {}

  for (const agentId of agentTrees) {
    const agentGameSetting = await getAgentGameSetting(mongoBet, agentId, now)
    if (agentGameSetting == null) {
      console.log(`getAgentGameSettingTree agentGameSetting is null ${agentId}`)
      continue
    }

    agentGameSettings.push(agentGameSetting)

    const { vendorGameSettings } = agentGameSetting

    if (vendorGameSettings == null) {
      continue
    }

    mergedVendorSettings = {
      ...mergedVendorSettings,
      ...vendorGameSettings,
    }
  }

  return {
    agentGameSettings,
    mergedVendorSettings,
  }
}

const userGameSettingCache: {
  [username: string]: {
    data: UserGameSetting
    expire: number
  }
} = {}

export function clearUserGameSettingExpiredCache() {
  for (const key in userGameSettingCache) {
    if (userGameSettingCache[key].expire < Date.now()) {
      delete userGameSettingCache[key]
    }
  }
}

export async function getUserGameSetting(mongoBet: MongoBet, agentCode: string, userId: string) {
  const username = agentCode + userId
  const cache = userGameSettingCache[username]
  if (cache != null && cache.expire > Date.now()) {
    return cache.data
  }

  const newData = await mongoBet.userGameSetting.findOne({ where: { agentCode, userId } })

  const expire = Date.now() + MINUTE_MS * 5

  console.log(`refresh userGameSettingCache`, agentCode + userId, expire, JSON.stringify(newData))

  userGameSettingCache[username] = {
    data: newData,
    expire,
  }

  clearUserGameSettingExpiredCache()

  return newData
}

export const vendorSettingCache: {
  [vendorCode: string]: {
    data: DataVendor
    expire: number
  }
} = {}

//테스트를 쉽게 하기 위해서 now 를 인자로 받음

export async function getVendorSetting(mongoBet: MongoBet, vendorCode: string, now: Date) {
  const cache = vendorSettingCache[vendorCode]
  if (cache != null && cache.expire > now.getTime()) {
    return cache.data
  }

  const expire = (now?.getTime() ?? Date.now()) + MINUTE_MS * 5

  const newData = await mongoBet.vendor.findOne({ where: { code: vendorCode } })
  console.log(`refresh vendorSettingCache`, vendorCode, expire, JSON.stringify(newData))

  vendorSettingCache[vendorCode] = {
    data: newData,
    expire,
  }

  return newData
}

export const gameSettingCache: {
  [gameCode: string]: {
    data: GameInfo
    expire: number
  }
} = {}

export async function getGameSetting(mongoBet: MongoBet, vendorCode: string, gameId: string, now: Date) {
  const key = vendorCode + '-' + gameId
  const cache = gameSettingCache[key]
  if (cache != null && cache.expire > now.getTime()) {
    return cache.data
  }

  const expire = (now?.getTime() ?? Date.now()) + MINUTE_MS * 5

  const newData = await mongoBet.gameInfo.findOne({ where: { vendor: vendorCode, code: gameId } })
  console.log(`refresh gameSettingCache`, key, expire, JSON.stringify(newData))

  gameSettingCache[key] = {
    data: newData,
    expire,
  }

  return newData
}
