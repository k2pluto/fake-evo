import { Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from 'typeorm'

@Index('index_session_regDate', ['session', 'regDate'], { unique: false })
@Entity('info_session')
export class Session extends BaseEntity {
  @PrimaryGeneratedColumn()
  idx: number

  @Index('index_agentId')
  @Column({ type: 'varchar', length: 20, nullable: false, unique: false })
  agentId: string

  @Index('index_session')
  @Column({ type: 'varchar', length: 100 })
  session: string

  @Index('index_regDate')
  @Column({ type: 'datetime', nullable: true, default: null })
  regDate: Date

  // before insert

  constructor(init?: Partial<Session>) {
    super()
    Object.assign(this, init)
  }
}
