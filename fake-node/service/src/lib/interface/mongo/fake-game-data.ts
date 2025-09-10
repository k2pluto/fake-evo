// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectId } from 'mongodb'
import { ObjectIdColumn, Column, Entity, Index } from 'typeorm'

export interface BaccaratResult {
  bankerPair: boolean
  bankerScore: number
  natural: boolean
  playerPair: boolean
  playerScore: number
  winner: string
}

export interface BaccaratHand {
  cards: string[] // ['8D, '5C', 'JS']
  score: number // 3
}

export interface LightningMultiplier {
  card: string // '7D'
  value: number // 5
}

export type BettingStateType = 'BetsOpen' | 'BetsClosed' | 'Cancelled'
export type DealingStateType = 'Idle' | 'Dealing' | 'Finished' | 'Lightning' | 'Cancelled'

// 키 벨류 콜렉션
@Entity('fake_game_data')
@Index('gameId_tableId', ['gameId', 'tableId'], { unique: true })
@Index('tableId_updatedAt', ['tableId', 'updatedAt'])
@Index('betting_bettingProceed', ['betting', 'bettingProceed'])
@Index('dealing_settlementProceed', ['dealing', 'settlementProceed'])
@Index('betResolved_trySettlement_settlementProceed', ['betResolved', 'trySettlement', 'settlementProceed'])
export class FakeGameData {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  @Index('gameId')
  gameId: string

  @Column()
  @Index('tableId')
  tableId: string

  @Column()
  gameNumber: string

  @Column()
  result: BaccaratResult

  @Column()
  gameData: any

  @Column()
  winningSpots: string[]

  @Column()
  withLightning: boolean

  @Column()
  playerHand: BaccaratHand

  @Column()
  bankerHand: BaccaratHand

  @Column()
  redEnvelopePayouts: { [key: string]: number }

  @Column()
  lightningMultipliers: LightningMultiplier[]

  //@Column()
  //multipliers: { [spot: string]: number }

  @Column()
  packet: { [id: string]: unknown }

  @Column()
  betResolved: boolean

  @Column()
  betting: BettingStateType

  @Column()
  dealing: DealingStateType

  @Column()
  resultTime: Date

  @Column()
  bettingProceed: boolean

  @Column()
  bettingProceedTime: Date

  @Column()
  trySettlement: boolean

  @Column()
  settlementProceed: boolean

  @Column()
  settlementProceedTime: Date

  @Column()
  settlementError: string

  @Column()
  @Index('updatedAt')
  updatedAt: Date
}
