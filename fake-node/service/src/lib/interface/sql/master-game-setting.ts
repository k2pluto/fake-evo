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

@Index('index_master_gameType', ['master', 'gameType'], { unique: true })
@Entity('info_master_game_setting')
export class MasterGameSetting extends BaseEntity {
  @PrimaryGeneratedColumn()
  idx: number

  @Index()
  @Column({ type: 'varchar', length: 20 })
  master: string

  @Index()
  @Column({ type: 'varchar', length: 20 })
  gameType: GameType

  @Column({ type: 'int', default: 0 })
  min_bet: number

  @Column({ type: 'int', default: 0 })
  max_bet: number

  @Column({ type: 'bool', default: true })
  allowBet: boolean

  constructor(init?: Partial<MasterGameSetting>) {
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
