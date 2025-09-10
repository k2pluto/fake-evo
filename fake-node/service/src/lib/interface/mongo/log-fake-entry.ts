import { Entity, ObjectIdColumn, Column, ObjectId, Index } from 'typeorm'

@Entity('log_fake_entry')
export class LogFakeEntry {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  @Index('idx_agentId')
  agentId: string

  @Column()
  @Index('idx_username')
  username: string

  @Column()
  @Index('idx_userId')
  userId: string

  @Column()
  internalIp: string

  @Column()
  url: string

  @Column()
  data: any

  @Column()
  sendHeaders: any

  @Column()
  recvHeaders: any

  @Column()
  @Index('idx_status')
  status: any

  @Column()
  @Index('idx_entryTime', { expireAfterSeconds: 60 * 60 * 24 * 70 })
  entryTime: Date
}
