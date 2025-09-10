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

@Entity('calculate-fake')
export class CalculateFake {
  @ObjectIdColumn()
  _id: string

  @ObjectIdColumn({ name: '_id' })
  id: string

  @Column()
  @Index()
  date: Date

  @Column()
  table: any // 총판 알 환전

  @Column()
  org: any // 총판 알 환전

  @Column()
  fake: any // 총판 알 환전

  @Column()
  agent: any // 총판 알 환전

  @Column()
  lastCalcTime: Date

  @Column()
  calc: {
    totalBetMoney: number
    totalWinMoney: number
    totalWinCount: number
    totalLoseCount: number
    totalCount: number
    orgBetMoney: number
    orgWinMoney: number
    orgWinCount: number
    orgLoseCount: number
    orgCount: number
    fakeBetMoney: number
    fakeWinMoney: number
    fakeWinCount: number
    fakeLoseCount: number
    fakeCount: number
  }
}
