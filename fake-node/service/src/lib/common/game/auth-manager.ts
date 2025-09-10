import { FindOneOptions, MoreThanOrEqual, FindOptionsWhere, UpdateResult } from 'typeorm'

import { GameMoneyField, User } from '../../interface/sql/user'
import { Agent } from '../../interface/sql/agent'

import { CommonReturnType } from '../types/common-return-type'
import { callSeamlessBalance } from '../../common/game/call-seamless'
import { PartialSQL } from '../../interface/sql'
import { WalletMode } from '../../common/types/wallet-mode'
import { MINUTE_MS } from '../../utility/helper'

export interface BalanceResult {
  status: CommonReturnType
  balance?: number
}

export function getUserInfo(username: string) {
  return {
    agentCode: username.substring(0, 3).toLowerCase(),
    userId: username.substring(3).toLowerCase(),
  }
}

export class AuthManager {
  constructor(public mainSQL: PartialSQL<'user' | 'agent'>) {}

  agentCache: {
    [agentCode: string]: {
      data: Agent
      expire: number
    }
  } = {}

  async getAgent(agentCode: string) {
    const cache = this.agentCache[agentCode]

    const now = new Date()
    if (cache != null && now != null && cache.expire > now.getTime()) {
      return cache.data
    }

    const expire = (now?.getTime() ?? Date.now()) + MINUTE_MS * 10
    console.log(`refresh agent`, agentCode, now?.toISOString(), expire, JSON.stringify(cache))
    const newData = await this.mainSQL.repos.agent.findOne({ where: { agentCode } })
    this.agentCache[agentCode] = {
      data: newData,
      expire,
    }
    return newData
  }

  async getUser(options: FindOneOptions<User>) {
    let user = await this.mainSQL.repos.user.findOne(options)

    if (user == null) {
      // 만약 user가 null 이면 한번 더 시도한다.
      console.log('cannot find user', options)
      user = await this.mainSQL.repos.user.findOne(options)
    }

    return user
  }

  async checkExist(username: string, gameToken?: string) {
    const { agentCode, userId } = getUserInfo(username)

    const user = await this.getUser({
      select: [GameMoneyField],
      where: {
        //gameToken:body.token,
        ...(gameToken != null && { gameToken }),
        agentCode,
        userId,
      },
    })

    return user != null
  }

  async checkAuth(
    username: string,
    gameToken?: string,
  ): Promise<{
    user?: User
    agent?: Agent
    status: CommonReturnType
  }> {
    const { agentCode, userId } = getUserInfo(username)

    const [agent, user] = await Promise.all([
      this.getAgent(agentCode),
      this.getUser({
        where: {
          agentCode,
          userId,
        },
      }),
    ])

    if (user == null || agent == null) {
      return {
        status: CommonReturnType.UserNotFound,
      }
    }

    if (gameToken != null && user.gameToken !== gameToken) {
      return {
        status: CommonReturnType.InvalidToken,
      }
    }

    return { agent, user, status: CommonReturnType.Success }
  }

  async checkAuthByToken(gameToken) {
    const user = await this.getUser({
      where: { gameToken },
    })

    if (user == null) {
      return {}
    }

    const agent = await this.getAgent(user.agentCode)

    return { agent, user }
  }

  async getUserAndAgent(options: FindOneOptions<User>) {
    const user = await this.getUser(options)

    if (user == null) {
      return {}
    }

    const agent = await this.getAgent(user.agentCode)

    return { agent, user }
  }

  async balance(
    agentCode: string,
    userId: string,
    gameToken?: string,
  ): Promise<
    BalanceResult & {
      user?: User
      agent?: Agent
    }
  > {
    const agent = await this.getAgent(agentCode)
    if (agent == null) {
      return {
        status: CommonReturnType.UserNotFound,
      }
    }

    const user = await this.getUser({
      select: [
        GameMoneyField,
        'agentCode',
        'agentId',
        'userId',
        'idx',
        'balanceVersion',
        'lockedBalance',
        'fakeBalance',
        'fakeMode',
        'gameToken',
        'type',
      ],
      where: {
        agentCode,
        userId,
      },
    })

    if (user == null) {
      return {
        status: CommonReturnType.UserNotFound,
      }
    }

    if (gameToken != null && user.gameToken !== gameToken) {
      return {
        status: CommonReturnType.InvalidToken,
      }
    }

    const { seamlessUrl, walletMode } = agent

    // seamlessUrl이 있으면 agent의 심리스 서버로 패킷을 날리고 받는다.
    if (walletMode === WalletMode.seamless) {
      if (seamlessUrl != null && seamlessUrl !== '') {
        return {
          status: CommonReturnType.InternalServerError,
        }
      }

      const res = await callSeamlessBalance(seamlessUrl, userId)
      return {
        ...res,
        user,
        agent,
      }
    }

    return {
      status: CommonReturnType.Success,
      balance: user.balance,
      user,
      agent,
    }
  }

  async getBalance(
    username: string,
    gameToken?: string,
  ): Promise<
    BalanceResult & {
      user?: User
      agent?: Agent
    }
  > {
    const { agentCode, userId } = getUserInfo(username)
    const agent = await this.getAgent(agentCode)
    if (agent == null) {
      return {
        status: CommonReturnType.UserNotFound,
      }
    }

    const user = await this.getUser({
      select: [
        GameMoneyField,
        'agentCode',
        'agentId',
        'userId',
        'idx',
        'balanceVersion',
        'lockedBalance',
        'fakeBalance',
        'fakeMode',
        'gameToken',
        'type',
      ],
      where: {
        agentCode,
        userId,
      },
    })

    if (user == null) {
      return {
        status: CommonReturnType.UserNotFound,
      }
    }

    if (gameToken != null && user.gameToken !== gameToken) {
      return {
        status: CommonReturnType.InvalidToken,
      }
    }

    const { seamlessUrl, walletMode } = agent

    // seamlessUrl이 있으면 agent의 심리스 서버로 패킷을 날리고 받는다.
    if (walletMode === WalletMode.seamless) {
      if (seamlessUrl != null && seamlessUrl !== '') {
        return {
          status: CommonReturnType.InternalServerError,
        }
      }

      const res = await callSeamlessBalance(seamlessUrl, userId)
      return {
        ...res,
        user,
        agent,
      }
    }

    return {
      status: CommonReturnType.Success,
      balance: user.balance,
      user,
      agent,
    }
  }

  async balanceByToken(gameToken: string): Promise<
    BalanceResult & {
      user?: User
      agent?: Agent
    }
  > {
    const user = await this.getUser({
      select: [GameMoneyField, 'agentCode', 'agentId', 'userId', 'idx', 'type', 'balanceVersion'],
      where: {
        //gameToken:body.token,
        gameToken,
      },
    })

    if (user == null) {
      return {
        status: CommonReturnType.UserNotFound,
      }
    }

    const { agentCode, userId } = user
    const agent = await this.getAgent(agentCode)

    if (agent == null) {
      return {
        status: CommonReturnType.UserNotFound,
      }
    }

    const { seamlessUrl, walletMode } = agent

    // seamlessUrl이 있으면 agent의 심리스 서버로 패킷을 날리고 받는다.
    if (walletMode === WalletMode.seamless) {
      if (seamlessUrl != null && seamlessUrl !== '') {
        return {
          status: CommonReturnType.InternalServerError,
        }
      }

      const res = await callSeamlessBalance(seamlessUrl, userId)
      return {
        ...res,
        user,
        agent,
      }
    }

    return {
      status: CommonReturnType.Success,
      balance: user.balance,
      user,
      agent,
    }
  }

  async balanceByUsername(username: string): Promise<
    BalanceResult & {
      user?: User
      agent?: Agent
    }
  > {
    const { userId, agentCode } = getUserInfo(username)

    return this.balance(agentCode, userId)
  }

  async lockBalance(agentCode: string, userId: string, vendor: string, lockedBalance: number) {
    const incrementCondition: FindOptionsWhere<User> = {
      agentCode,
      userId,
      lastJoinVendor: vendor,
      balance: MoreThanOrEqual(lockedBalance),
    }

    await this.unlockBalance(agentCode, userId)

    const result = await this.mainSQL.repos.user.update(incrementCondition, {
      lockedBalance: () => `lockedBalance + ${lockedBalance}`,
      balance: () => `balance - ${lockedBalance}`,
      lockedTime: new Date(),
    })

    if (result.affected === 0) {
      throw CommonReturnType.InsufficientBalance
    }

    return CommonReturnType.Success
  }

  async unlockBalance(agentCode: string, userId: string) {
    const incrementCondition: FindOptionsWhere<User> = {
      agentCode,
      userId,
    }

    const result = await this.mainSQL.repos.user.update(incrementCondition, {
      balance: () => `balance + lockedBalance`,
      lockedBalance: 0,
    })

    if (result.affected === 0) {
      throw CommonReturnType.InsufficientBalance
    }

    return CommonReturnType.Success
  }

  updateBalanceVersion(userIdx: number): Promise<UpdateResult> {
    return this.mainSQL.repos.user.increment({ idx: userIdx }, 'balanceVersion', 1)
  }
}
