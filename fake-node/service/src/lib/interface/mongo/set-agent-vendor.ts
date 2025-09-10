import { Entity, Column, Index, BaseEntity, ObjectIdColumn } from 'typeorm'
import { ObjectId } from 'mongodb'

@Entity('set_agent_vendor')
@Index('agentCode_vendor', ['agentCode', 'vendor'], { unique: true })
export class AgentVendorSetting extends BaseEntity {
  @ObjectIdColumn()
  _id: ObjectId

  @Index('agentCode')
  @Column()
  agentCode: string

  @Column()
  vendor: string

  @Column()
  used: boolean

  // 벤더별 셋팅
  @Column()
  config: unknown
}
