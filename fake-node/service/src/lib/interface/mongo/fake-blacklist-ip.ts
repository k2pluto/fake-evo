// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectIdColumn, Column, Entity, Index, ObjectId } from 'typeorm'

@Entity('fake_blacklist_ip')
export class FakeBlackListIp {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  @Index('ip', { unique: true })
  ip: string

  @Column()
  createdAt: Date

  @Column()
  updatedAt: Date
}
