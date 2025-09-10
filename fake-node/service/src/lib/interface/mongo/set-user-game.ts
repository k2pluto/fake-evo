import { Entity, Column, Index, BaseEntity, ObjectIdColumn } from 'typeorm'
import { ObjectId } from 'mongodb'

@Entity('set_user_game')
@Index('agentCode_userId', ['agentCode', 'userId'], { unique: true })
export class UserGameSetting extends BaseEntity {
  @ObjectIdColumn()
  _id: ObjectId

  @Index()
  @Column()
  agentCode: string

  @Index()
  @Column()
  userId: string

  // 게임 타입별 베팅 한도
  @Column()
  betLimitByGameType: {
    [id: string]: {
      minBet?: number
      maxBet?: number
      maxWin?: number
      allowBet?: boolean
    }
  }

  // 테이블별 베팅 한도
  /*@Column()
  betLimitByTable: {
    [id: string]: {
      minBet: number
      maxBet: number
      allowBet: boolean
    }
  }*/
}
