// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectIdColumn, Column, Index, Entity } from 'typeorm'
import { ObjectId } from 'mongodb'

@Index('summaryId_userId_agentCode', ['summaryId', 'userId', 'agentCode'], { unique: false })
@Entity('fake_bet_data')
export class FakeBetData {
  @ObjectIdColumn()
  _id: ObjectId

  @Index('bet_vendorCode')
  @Column()
  vendor: string

  @Index('bet_agentCode')
  @Column()
  agentCode: string

  @Index('bet_userID')
  @Column()
  userId: string

  // bet-data의 summaryId
  @Index('bet_summaryId')
  @Column()
  summaryId: string

  @Index('bet_vendorRoundId')
  @Column()
  vendorRoundId: string

  // username-vendor-tableId-roundId 구조
  @Index('bet_searchId')
  @Column()
  searchId: string

  @Column()
  roundId: string

  @Column()
  gameId: string

  @Index('bet_betTime')
  @Column()
  betTime: Date

  @Column()
  updatedAt: Date

  @Index('bet_tableId')
  @Column()
  tableId: string

  // 에볼루션에 가짜로 작게 올리는 금액
  @Column()
  betFake: { [key: string]: number }

  // 유저가 실제 베팅한 금액
  @Column()
  betOrg: { [key: string]: number }

  // 심리스에서 계산된 페이크 금액
  @Column()
  calculatedFake: { [key: string]: number }

  // 심리스에서 계산된 실제 금액
  @Column()
  calculatedOrg: { [key: string]: number }

  // 디버깅용 베팅할 때의 betLimits
  @Column()
  betLimits: {
    [spot: string]: { min: number; max: number }
  }

  @Column()
  saveBet: { [timestamp: string]: unknown }

  // 리핏 찍었을 때 클라이언트에서 CLIENT_BET_CHIP 패킷으로 온 데이터를 저장
  @Column()
  repeatData: { [key: string]: number }
}
// }
