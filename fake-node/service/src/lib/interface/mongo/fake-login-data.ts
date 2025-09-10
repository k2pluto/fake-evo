// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectIdColumn, Column, Entity, Index } from 'typeorm'

// 키 벨류 콜렉션
@Entity('fake_login_data')
export class FakeLoginData {
  @ObjectIdColumn()
  _id: string

  @Index('username', { unique: true })
  @Column()
  username: string

  @Column()
  regDate: Date

  @Column()
  @Index('agentCode')
  agentCode: string

  @Column()
  @Index('userId')
  userId: string

  @Column()
  data: unknown

  @Column()
  @Index('sessionId')
  sessionId: string

  @Column()
  evolutionUrl: string

  @Column()
  evolutionEntryUrl: string

  @Column()
  streamHost1: string

  @Column()
  streamHost2: string

  @Column()
  evolutionHeaders: { [key: string]: string | string[] }

  @Column()
  lastSelectedChips: { [gameType: string]: number }
}
