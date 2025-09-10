// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectIdColumn, Column, Entity, Index, ObjectId } from 'typeorm'

@Entity('fake_table_data')
export class FakeTableData {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  @Index('tableId')
  tableId: string

  @Column()
  tableName: string

  @Column()
  gameId: string

  @Column()
  gameData: any

  @Column()
  betting: 'BetsOpen' | 'BetsClosed'

  @Column()
  dealing: 'Idle' | 'Dealing' | 'Finished' | 'Lightning'

  @Column()
  eventTime: Date

  //정산된 시간
  @Column()
  settlementTime: Date

  //게임결과를 보고 정산처리에 얼마나 걸렸는지 계산된 밀리초
  @Column()
  settlementElapsedMs: number

  @Column()
  @Index('updatedAt')
  updatedAt: Date

  @Column()
  updatedVendor: { [vendor: string]: Date }
}
