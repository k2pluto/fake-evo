import { BaccaratReceiveRouter } from './baccarat/router-game-baccarat'
import { DragonTigerReceiveRouter } from './router-game-dragontiger'

import { authManager, mongoDB } from '../app'
import { type BalanceUpdated, type SettingsData, type WidgetAvailableTables } from '../../common/fake-packet-types'
import { type User } from '@service/src/lib/interface/sql/user'
import { type ReceiveRouterType } from '../module/types'
import { config } from '../config'

export async function balanceChange(
  item: {
    balance?: number
    balances?: Array<{ id: string; version: number; amount: number }>
  },
  user: User,
) {
  const { balance, balances } = item
  const balanceRes = await authManager.balance(user.agentCode, user.userId)

  if (balanceRes?.balance != null) {
    // 소숫점 밸런스는 문제를 일으켜서 정수로 바꾼다.
    const userBalance = Math.floor(balanceRes.balance + balanceRes.user.lockedBalance)
    if (balance != null) {
      item.balance = userBalance
    }

    if (balances != null) {
      item.balances[0].amount = userBalance
    }

    // user.balance 를 업데이트 해줘야 settlement후의 금액이 제대로 맞게 나온다.
    user.balance = userBalance
  }
}

export interface BalancePacket {
  args: {
    balance?: number
    balances?: Array<{ id: string; version: number; amount: number }>
    bets?: {
      balance?: number
      balances?: Array<{ id: string; version: number; amount: number }>
    }
    state?: {
      balance?: number
      balances?: Array<{ id: string; version: number; amount: number }>
    }
  }
}

export async function balanceProcess(packet: BalancePacket, user: User) {
  const { balance, balances, bets, state } = packet?.args ?? {}
  if (balance != null || balances?.[0] != null) {
    // 바카라 룰렛
    await balanceChange(packet.args, user)
  } else if (bets != null) {
    // 용호, 축구스튜디오
    const { balance, balances } = bets
    if (balance != null || balances?.[0] != null) {
      await balanceChange(packet.args.bets, user)
    }
  } else if (state != null) {
    // 크레이지벳, 모노폴리 라이브, 드림캐쳐
    const { balance, balances } = state
    if (balance != null || balances?.[0] != null) {
      await balanceChange(packet.args.state, user)
    }
  }
}

const balanceUpdated: ReceiveRouterType = async (packet: BalanceUpdated, { socketData: { user } }) => {
  console.log(
    `balanceUpdated ${user.agentCode + user.userId} ${packet?.args?.tableId} : ${user.balance} ${JSON.stringify(
      packet,
    )}`,
  )

  return packet
}

const settingsData: ReceiveRouterType = async (packet: SettingsData, { socketData: { user } }) => {
  const { key, data } = packet.args

  if (key === 'generic.common' && data.lastSelectedChips != null) {
    const loginData = await mongoDB.fakeLoginData.findOne({
      where: {
        username: user.agentCode + user.userId,
      },
    })

    data.lastSelectedChips = { ...data.lastSelectedChips, ...loginData?.lastSelectedChips }
  }

  return packet
}

const widgetAvailableTables: ReceiveRouterType = async (packet: WidgetAvailableTables, { socketData }) => {
  for (const table of packet.args.availableTables) {
    const tableData = socketData.getTable(table.tableId)
    tableData.config = table.config
  }

  return packet
}

export default {
  balanceUpdated,
  'settings.data': settingsData,
  'widget.availableTables': widgetAvailableTables,
  ...BaccaratReceiveRouter,
  ...(config.fakeDragonTiger ? DragonTigerReceiveRouter : {}),
}
