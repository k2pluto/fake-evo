import { ApiStatusCode } from '../../common/types/status-code'
import { Entity, ObjectIdColumn, Column, ObjectId, Index } from 'typeorm'

@Entity('log_master')
export class LogMaster {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  @Index()
  type: string

  @Column()
  @Index()
  ip: string

  @Column()
  url: string

  @Column()
  body: any

  @Column()
  @Index()
  masterId: string

  @Column()
  status: ApiStatusCode

  @Column()
  createdAt: Date
}
