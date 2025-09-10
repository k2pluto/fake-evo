// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { Column, Entity, Index, ObjectIdColumn } from 'typeorm'
import { type EvolutionConfigData } from './data-evolution-table'

// 있을 수 있기 때문에 유저별로 따로 만들었다.
@Index('agentCode_userId_tableId', ['agentCode', 'userId', 'tableId'], { unique: true })
@Entity('fake_user_table_config')
export class FakeUserTableConfig {
  @ObjectIdColumn()
  _id: string

  @Column()
  agentCode: string

  @Column()
  userId: string

  @Column()
  tableId: string

  @Column()
  createdAt: Date

  // config api에서 받아온 데이터
  @Column()
  configData: EvolutionConfigData

  @Column()
  baccaratLimit: any
}
