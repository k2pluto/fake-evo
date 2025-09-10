// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectIdColumn, Column, Entity, Index, ObjectId } from 'typeorm'

@Entity('fake_blacklist_user')
export class FakeBlackListUser {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  agentId: string

  @Column()
  @Index('username', { unique: true })
  username: string

  @Column()
  ip: string

  @Column()
  headers: string

  @Column()
  createdAt: Date

  @Column()
  updatedAt: Date
}
