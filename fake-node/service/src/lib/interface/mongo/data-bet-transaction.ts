import { ObjectIdColumn, Column, Index, ObjectId } from 'typeorm'
import { BetData } from './data-bet-data'

export type BetTransactionType =
  | 'BET' // 베팅 트랜잭션
  | 'TIP' // 팁 트랜잭션
  | 'GIVE' // 게임사에서 프로모션 돈을 줄 때 받는 트랜잭션
  | 'JACKPOT' // 잭팟
  | 'BONUS' // 게임 스핀중에 보너스
  | 'ADJUST' // 게임사에서 유저의 돈을 조절할 때 받는 트랜잭션
  | 'SETTLE' // 마감 트랜잭션
  | 'BETNSETTLE' // 베팅과 동시에 마감 트랜잭션
  | 'CANCELBETNSETTLE' // 베팅과 동시에 마감 트랜잭션 취소
  | 'ROLLBACKSETTLE' // 마감 롤백 트랜잭션
  | 'RESETTLE' // 재마감 트랜잭션
  | 'CANCELBET' // 베팅 취소 트랜잭션
  | 'VOIDSETTLE' // 베팅 마감 둘다 취소
  | 'CANCELROUND' // 라운드취소 (베팅 마감 둘다 취소)
  | 'ROLLBACK' // 트랙잭션 롤백
export type BetTransactionStatus = 'CREATED' | 'OK' | 'ROLLBACK' | 'ERROR'

export class BetTransaction {
  @ObjectIdColumn()
  _id: ObjectId

  @Index('transaction_agent')
  @Column()
  agentCode: string

  @Index('transaction_userId')
  @Column()
  userId: string

  // 트랜잭션 Id (한 트랜잭션에 여러개의 베팅 디테일이 넘어 올수도 있기 때문에 유니크가 아님)
  @Index('transaction_transId')
  @Column()
  transId: string

  @Index('transaction_orgId')
  @Column()
  orgId: string

  // 요약 Id
  @Index('transaction_summaryId')
  @Column()
  summaryId: string

  @Column()
  gameId: string

  @Column()
  roundId: string

  @Index('transaction_thirdParty')
  @Column()
  thirdParty: string

  @Index('transaction_vendor')
  @Column()
  vendor: string

  @Column()
  brand: string

  // Bet Id
  @Index('transaction_betId')
  @Column()
  betId: string

  @Index('transaction_type')
  @Column()
  type: BetTransactionType

  @Index('transaction_status')
  @Column()
  status: BetTransactionStatus

  @Index('transaction_statusCode')
  @Column()
  statusCode: number

  @Column()
  amount: number

  @Column()
  incFields?: BetData

  @Column()
  beforeBalance: number

  @Column()
  afterBalance: number

  @Index('transaction_createdAt')
  @Column()
  createdAt: Date
}
