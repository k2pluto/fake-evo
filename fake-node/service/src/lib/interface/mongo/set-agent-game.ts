import { Entity, Column, Index, BaseEntity, ObjectIdColumn } from 'typeorm'
import { ObjectId } from 'mongodb'
import { BetSettingConfig } from '../../common/types/bet-setting-config'

export interface AgentVendorSetting {
  used?: boolean
  config?: unknown
  gameSettings?: { [gameId: string]: BetSettingConfig }
}

@Entity('set_agent_game')
export class AgentGameSetting extends BaseEntity {
  @ObjectIdColumn()
  _id: ObjectId

  @Index('agentCode')
  @Column()
  agentCode: string

  @Index('agentId')
  @Column()
  agentId: string

  // 게임 타입별 베팅 한도
  @Column()
  betLimitByGameType: {
    [id: string]: BetSettingConfig
  }

  // 테이블별 베팅 한도
  @Column()
  betLimitByTable: {
    [id: string]: BetSettingConfig
  }

  // 게임 별 베팅 셋팅
  @Column()
  vendorGameSettings?: {
    [vendorCode: string]: AgentVendorSetting
  }
}
