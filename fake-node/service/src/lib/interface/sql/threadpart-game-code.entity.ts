import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm'

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
@Entity('set_threadpart_game_code')
export class ThreadpartGameCode extends BaseEntity {
  // export class User  {

  @PrimaryGeneratedColumn()
  idx: number

  // @Index()
  // @Index('ThreadpartGameCode-agentId')
  // @Column({ type: 'nvarchar', length: 20, default: '' })
  // agentId: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  company: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  apiurl: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  launchrurl: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  histroyurl: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  apiID: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  apiPW: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  operatorid: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  walletId: string

  @Column({ type: 'nvarchar', length: 1024, default: '' })
  token: string

  // @Column({ type: 'nvarchar', length: 1, default: 'n' })
  // combination: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  histroyCode: string

  // @Column({ type: 'decimal', default: 0 })
  // ignoredCount: number
}
