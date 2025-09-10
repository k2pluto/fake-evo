// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectIdColumn, Column, Entity, Index } from 'typeorm'

export enum ServerType {
  FakeSeamless = 'fake-seamless',
  FakeApiBlue = 'fake-api-blue',
  FakeApiGreen = 'fake-api-green',
}

// 서버
@Entity('data_server_info')
export class ServerInfo {
  @ObjectIdColumn()
  _id: string

  @Column()
  @Index('index_type')
  type: ServerType

  @Column()
  @Index('index_updatedAt')
  updatedAt: Date

  @Column()
  info: unknown
}
