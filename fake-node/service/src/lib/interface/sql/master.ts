import { Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from 'typeorm'

import { Md5 } from 'md5-typescript'
// import { Base } from './base';

export enum MasterStatus {
  used = 'used',
  stop = 'stop',
  remove = 'remove',
  wait = 'wait',
  reg = 'reg',
}

@Entity('info_master')
export class Master extends BaseEntity {
  @PrimaryGeneratedColumn()
  idx: number

  @Index()
  @Column({ type: 'varchar', length: 20, nullable: false, unique: true })
  masterId: string

  @Column({ type: 'varchar', length: 100, default: '' })
  password: string

  @Index()
  @Column({ type: 'varchar', length: 100 })
  session: string

  @Column({ type: 'datetime', nullable: true, default: null })
  regDate: Date

  @Column({ type: 'datetime', nullable: true, default: null })
  lastDate: Date

  constructor(init?: Partial<Master>) {
    super()
    Object.assign(this, init)
  }

  // @BeforeInsert()
  // async saveEncryptedPassword() {
  //   this.password = await Md5.init(`${this.password}5`)
  // }

  static makePasswordHash(password) {
    console.log(Md5.init(`23${password}15`))
    return Md5.init(`23${password}15`)
  }

  comparePassword(password: string): boolean {
    return Master.makePasswordHash(password) === this.password
  }

  public ExLogBalance = () => {
    return {}
  }
}
