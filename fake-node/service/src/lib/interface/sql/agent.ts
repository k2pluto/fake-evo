import { Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from 'typeorm'

import { Md5 } from 'md5-typescript'
import { DecimalToNumberColumn } from '../../utility/typeorm-columns'
import { WalletMode } from '../../common/types/wallet-mode'
// import { Base } from './base';

export enum AgentStatus {
  used = 'used',
  stop = 'stop',
  remove = 'remove',
  wait = 'wait',
  reg = 'reg',
}

@Entity('info_agent')
export class Agent extends BaseEntity {
  @PrimaryGeneratedColumn()
  idx: number

  @Column({ type: 'varchar', length: 20, nullable: false, unique: true })
  agentId: string

  @Column({ type: 'varchar', length: 3, nullable: false, unique: true })
  agentCode: string

  @Index('index_agentTree')
  @Column({ type: 'varchar', length: 200 })
  agentTree: string

  @Column({ type: 'varchar', length: 100, default: '' })
  password: string

  @Column({ type: 'varchar', length: 20, default: '' })
  nick: string

  @Column({ type: 'decimal', nullable: true, default: 0 })
  level: number

  @DecimalToNumberColumn(12, 2, { default: 0 })
  balance: number

  @Column({ type: 'decimal', default: 0 })
  totalCharge: number

  @Column({ type: 'decimal', default: 0 })
  totalSubBalance: number

  @Column({ type: 'decimal', default: 0 })
  totalGive: number

  @DecimalToNumberColumn(10, 2, { default: 0 })
  percent: number

  @Index('index_agentkey', { unique: true })
  @Column({ type: 'varchar', length: 100, default: '' })
  apiToken: string

  @Column({ type: 'enum', enum: WalletMode, default: 'transfer' })
  walletMode: WalletMode

  @Column({ type: 'varchar', length: 200, default: null })
  seamlessUrl: string

  @Index('index_status')
  @Column({ type: 'enum', enum: AgentStatus, default: 'reg' })
  status: AgentStatus

  @Index()
  @Column({ type: 'varchar', length: 100 })
  session: string

  @Column({ type: 'datetime', nullable: true, default: null })
  regDate: Date

  @Column({ type: 'datetime', nullable: true, default: null })
  lastDate: Date

  @Column({ type: 'datetime', nullable: true, default: null })
  removeDate: Date

  @Column({ type: 'text', default: '' })
  message: string

  // before insert

  constructor(init?: Partial<Agent>) {
    super()
    Object.assign(this, init)
  }

  // @BeforeInsert()
  // async saveEncryptedPassword() {
  //   this.password = await Md5.init(`${this.password}5`)
  // }

  static makePasswordHash(password) {
    console.log(Md5.init(`${password}5`))
    return Md5.init(`${password}5`)
  }

  comparePassword(password: string): boolean {
    return Agent.makePasswordHash(password) === this.password
  }

  public ExLogBalance = () => {
    return {}
  }
}
