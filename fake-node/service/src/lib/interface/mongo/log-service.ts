import { Entity, ObjectIdColumn, Column, ObjectId, Index } from 'typeorm'

export enum LogBalanceType {
  admin_give_balance = 'admin_give_balance',
  admin_buy_balance = 'admin_buy_balance',
  admin_cancel_win = 'admin_cancel_win',
  admin_cancel_lose = 'admin_cancel_lose',

  admin_end_win = 'admin_end_win',
  admin_end_lose = 'admin_end_lose',
}

@Entity('log_service')
export class LogService {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  @Index()
  uuid: string

  @Column()
  @Index()
  type: string

  @Column()
  @Index()
  lastStep: string

  @Column()
  stepLog: {
    [key: string]: {
      url?: string
      parameters?: string
      message?: string
      response?: any
      error?: any
      elapsed?: number
    }
  }

  @Column()
  @Index('agentId')
  agentId: string

  @Column()
  @Index('agentCode')
  agentCode: string

  @Column()
  userId: string

  @Column()
  @Index('idx_vendor')
  vendor: string

  @Column()
  gameCode: string

  @Column()
  device: string

  @Column()
  query: string

  // @Column()
  // ip: string

  @Column()
  @Index()
  error: boolean

  @Column()
  status: number

  @Column()
  message?: string

  @Column()
  reg: string

  @Column()
  ip: string

  // 서비스를 처리하기 위해 걸린 시간
  @Column()
  elapsed: number

  @Column()
  @Index()
  timestamp: Date
}
