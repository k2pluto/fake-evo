// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { Column, Entity, Index, ObjectIdColumn } from 'typeorm'
import { ObjectId } from 'mongodb'

@Entity('fake_domain')
export class FakeDomain {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  @Index('idx_domainName')
  domainName: string

  @Column()
  @Index('idx_redirectServer')
  redirectServer: string
}
