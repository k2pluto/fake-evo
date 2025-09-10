import { Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from 'typeorm'

import { type GameType } from '../../common/types/common'

// export enum UserType {
//   User = 'user',
//   UserBase = 'userbase',
// }

// export enum BetLimitType {
//   SportCross = 'sportcross',
//   SportLive = 'sportlive',
//   SportSpecial = 'sportspecial',
//   Powerball = 'powerball ',
// }

@Index('index_agentCode_gameType', ['agentCode', 'gameType'], { unique: true })
@Entity('set_agent_game_type')
export class AgentGameTypeSetting extends BaseEntity {
  @PrimaryGeneratedColumn()
  idx: number

  @Index()
  @Column({ type: 'varchar', length: 20 })
  agentCode: string

  @Index()
  @Column({ type: 'varchar', length: 20 })
  gameType: GameType

  @Column({ type: 'int', default: 0 })
  min_bet: number

  @Column({ type: 'int', default: 0 })
  max_bet: number

  @Column({ type: 'bool', default: true })
  allowBet: boolean

  constructor(init?: Partial<AgentGameTypeSetting>) {
    super()

    Object.assign(this, init)
  }

  IsMaxBalance = (balance) => {
    return balance > this.max_bet
  }

  IsMinBalance = (balance) => {
    return balance < this.min_bet
  }

  // Level = () => {
  //   return this.agentTree.split('|').length;
  // };

  //   IsBenefit = () => {
  //     return this.percent > 0
  //   }

  //   MakeRewardBalance = balance => {
  //     return Math.trunc(Math.floor(balance * Number(this.percent)) / 100)
  //   }

  //   IsFriendWinBenefit = () => {
  //     return this.percent > 0
  //   }
}
