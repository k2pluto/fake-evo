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

@Index('index_master_date', ['agentId', 'date'], { unique: false })
@Entity('calculate-agent')
export class CalculateAgent {
  @ObjectIdColumn()
  _id: string

  @ObjectIdColumn({ name: '_id' })
  id: string

  @Column()
  @Index()
  agentId: string

  @Column()
  @Index()
  strDate: string

  @Column()
  @Index()
  date: Date

  @Column()
  time: Date

  @Column()
  inUserBalance: number

  @Column()
  inAgentBalance: number

  @Column()
  isFisish: string

  @Column()
  changeBalance: number // 총판 알 충전

  @Column()
  exchangeBalance: number // 총판 알 환전

  @Column()
  detail: any // 총판 알 환전

  @Column((type) => Bets)
  total: Bets

  @Column()
  bet: [string, Bets]
}
