// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

// var isEqual = require('lodash.isequal');

@Index('index_agentId', ['agentId'], { unique: true })
@Entity('lock')
export class Lock {
  @ObjectIdColumn({ name: '_id' })
  id: string

  @Column()
  public agentId: string

  @Column()
  public count: number
}
