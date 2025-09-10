import { Entity, ObjectIdColumn, Column, ObjectId, Index } from 'typeorm'

@Entity('log_fake_connection')
export class LogFakeConnection {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  @Index('idx_username')
  username: string

  @Column()
  url: string

  @Column()
  @Index('idx_ip')
  ip: string

  @Column()
  userAgent: any

  @Column()
  @Index('idx_connection_time')
  connectionTime: Date
}
