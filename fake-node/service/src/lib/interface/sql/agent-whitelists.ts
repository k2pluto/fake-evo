import { Entity, Column, BaseEntity, PrimaryColumn } from 'typeorm'

@Entity('set_agent_whitelist')
export class AgentWhitelist extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 20, nullable: false, unique: true })
  agentId: string

  @Column({ type: 'varchar', length: 1000, nullable: false, default: '' })
  bo_whitelist: string

  @Column({ type: 'varchar', length: 1000, nullable: false, default: '' })
  api_whitelist: string
}
