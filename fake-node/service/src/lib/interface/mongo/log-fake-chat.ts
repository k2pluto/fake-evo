import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

@Entity('log_fake_chat')
export class LogFakeChat {
  @ObjectIdColumn()
  _id: string

  @Column()
  @Index('idx_username')
  username: string

  @Column()
  @Index('idx_tableId')
  tableId: string

  @Column()
  @Index('idx_type')
  type: 'send' | 'receive'

  @Column()
  chat: string

  @Column()
  @Index('idx_chat_time')
  chatTime: Date
}
