// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectIdColumn, Column, Entity } from 'typeorm'

// 키 벨류 콜렉션
@Entity('data_store')
export class DataStore {
  @ObjectIdColumn()
  _id: string

  @Column()
  data: unknown
}
// }
