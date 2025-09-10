import { Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from 'typeorm'

// export enum BalanceStatus {
//   cansel = 'cansel',
//   stop = 'stop',
//   already = 'already',
//   wait = 'wait',
//   reg = 'reg',
// }

// export enum BalanceType {
//   deposit = 'deposit',
//   withdraw = 'withdraw',
// }

export enum NoticeUserDel {
  Y = 'y',
  N = 'n',
}

// @Index('index_company_game1', ['company','game'], { unique: false })
@Entity('set_betlimit')
export class BetLimit extends BaseEntity {
  // export class User  {
  @PrimaryGeneratedColumn()
  idx: number

  @Index('index-agent')
  @Column({ type: 'nvarchar', length: 100, unique: true })
  agent: string

  @Column({ type: 'decimal', default: 0 })
  minBet: number

  @Column({ type: 'decimal', default: 0 })
  maxBet: number

  @Column({ type: 'decimal', default: 0 })
  minTie: number

  @Column({ type: 'decimal', default: 0 })
  maxTie: number

  @Column({ type: 'decimal', default: 0 })
  minpair: number

  @Column({ type: 'decimal', default: 0 })
  maxpair: number

  // @Column({ type: 'decimal', default: 0 })
  // ignoredCount: number
}
