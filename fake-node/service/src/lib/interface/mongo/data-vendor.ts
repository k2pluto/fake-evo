// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectIdColumn, Column, Entity, Index } from 'typeorm'
import { type GameType } from '../../common/types/common'

// 키 벨류 콜렉션
@Entity('data_vendor')
export class DataVendor {
  @ObjectIdColumn()
  _id: string

  @Column()
  @Index('index_code')
  code: string

  @Column()
  nameEn: string

  @Column()
  nameKo: string

  @Column()
  nameManage: string

  @Column()
  gameType: GameType

  @Column()
  provider?: string

  @Column()
  desc?: string

  @Column()
  @Index('index_used')
  used: 'y' | 'n'

  @Column()
  @Index('index_show')
  show: 'y' | 'n'

  @Column()
  @Index('index_order')
  order: number
}
