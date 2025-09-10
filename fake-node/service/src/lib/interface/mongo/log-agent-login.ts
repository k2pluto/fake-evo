import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

@Entity('log_agent_login')
export class LogAgentLogin {
  @ObjectIdColumn()
  _id: string

  @Index('idx-agentId')
  @Column()
  agentId: string

  // remove after 70 days
  @Index('idx-timestamp', { expireAfterSeconds: 60 * 60 * 24 * 70 })
  @Column()
  timestamp: Date

  @Column()
  status: string

  @Column()
  ms: string

  @Column()
  @Index('idx-ip')
  ip: string
}
