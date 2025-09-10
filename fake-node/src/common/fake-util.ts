import { type BaccaratGameData } from './fake-packet-types'

const feeInfos: Record<
  string,
  {
    name: string
    rate: number
  }
> = {
  LightningBac0001: {
    name: 'Lightning',
    rate: 0.2,
  },
  gwbaccarat000001: {
    name: 'Lightning',
    rate: 0.2,
  },
  Japgwbaccarat001: {
    name: 'Lightning',
    rate: 0.2,
  },
  PTBaccarat000001: {
    name: 'Fee',
    rate: 0.2,
  },
  XXXtremeLB000001: {
    name: 'Fee',
    rate: 0.5,
  },
  peekbaccarat0001: {
    name: 'Fee',
    rate: 0.2,
  },
}

export const getFeeInfo = (tableId: string) => {
  return feeInfos[tableId]
}

const lightningTables: Record<string, boolean> = {
  LightningBac0001: true,
  gwbaccarat000001: true,
  Japgwbaccarat001: true,
  PTBaccarat000001: true,
  XXXtremeLB000001: true,
}

export const isLightningTable = (tableId: string) => {
  if (lightningTables[tableId]) {
    return true
  }

  return false
}

const peekTables: Record<string, boolean> = {
  peekbaccarat0001: true,
}

export const isPeekTable = (tableId: string) => {
  if (peekTables[tableId]) {
    return true
  }

  return false
}

export function makeContentResult(tableId: string, gameData: BaccaratGameData) {
  const { playerHand, bankerHand, lightningMultipliers, result } = gameData

  const outcome = result?.winner

  const resultObj = {
    player: playerHand,
    banker: bankerHand,
    outcome,
  }

  if (isLightningTable(tableId)) {
    const multiplierCards = {}
    lightningMultipliers.map((value) => (multiplierCards[value.card] = value.value))

    const multiplierCodes = {
      BAC_Banker: 1,
      BAC_BankerPair: 1,
      BAC_Player: 1,
      BAC_PlayerPair: 1,
      BAC_Tie: 1,
    }

    for (const lightningCard of lightningMultipliers) {
      for (const playerHandCard of playerHand.cards) {
        if (playerHandCard === lightningCard.card) {
          multiplierCodes.BAC_Player *= lightningCard.value
          multiplierCodes.BAC_PlayerPair *= lightningCard.value
          multiplierCodes.BAC_Tie *= lightningCard.value
        }
      }
      for (const bankerHandCard of bankerHand.cards) {
        if (bankerHandCard === lightningCard.card) {
          multiplierCodes.BAC_Banker *= lightningCard.value
          multiplierCodes.BAC_BankerPair *= lightningCard.value
          multiplierCodes.BAC_Tie *= lightningCard.value
        }
      }
    }

    Object.assign(resultObj, {
      multipliers: {
        betCodes: multiplierCodes,
        cards: multiplierCards,
      },
    })
  }

  return {
    ...resultObj,
    result: {
      ...resultObj,
    },
  }
}

export function recursionObject(obj: any, func: (parent, key) => void) {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      recursionObject(obj[key], func)
    } else {
      func(obj, key)
    }
  }
}

export function changePacketHostname(obj: any, hostname: string) {
  recursionObject(obj, (parent, key) => {
    const value = parent[key]
    if (typeof value !== 'string') return

    if (key === 'referer') {
      if (value.includes('localhost') && !value.includes('babylon')) {
        parent[key] = hostname
      }
      return
    }

    if (value.indexOf('https://') !== 0) return

    const url = new URL(value)
    if (url.hostname !== 'localhost' && !url.hostname.includes('babylon')) return

    url.hostname = hostname
    parent[key] = url.toString()
  })

  return obj
}
