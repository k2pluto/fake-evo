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
@Entity('set_games')
export class ThreadpartGames extends BaseEntity {
  // export class User  {
  @PrimaryGeneratedColumn()
  idx: number

  @Index('index-gamecode')
  @Column({ type: 'nvarchar', length: 255, unique: true })
  gameCode: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  gameType: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  company: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  gameId: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  nameEn: string

  @Column({ type: 'nvarchar', length: 255, default: '' })
  nameKo: string

  @Column({ type: 'nvarchar', length: 1, default: 'Y' })
  used: string

  @Column({ type: 'datetime', nullable: true, default: null })
  regDate: string

  // @Column({ type: 'decimal', default: 0 })
  // ignoredCount: number
}
