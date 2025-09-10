import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

export class Bets {
  @Column()
  realBetCount: number

  @Column()
  realWinCount: number

  @Column()
  realBetBalance: number

  @Column()
  realWinBalance: number

  @Column()
  betCount: number

  @Column()
  winCount: number

  @Column()
  betBalance: number

  @Column()
  winBalance: number
}

@Entity('calculate-manager')
export class CalculateManager {
  @ObjectIdColumn()
  _id: string

  @Column()
  @Index()
  strDate: string

  @Column()
  @Index()
  date: Date

  @Column()
  inUserBalance: number

  @Column()
  inAgentBalance: number

  @Column()
  changeBalance: number // 총판 알 충전

  @Column()
  exchangeBalance: number // 총판 알 환전

  @Column((type) => Bets)
  total: Bets

  @Column()
  bet: [string, Bets]
}
