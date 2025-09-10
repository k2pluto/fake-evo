import { BeforeInsert, Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from 'typeorm'
import { DecimalToNumberColumn } from '../../utility/typeorm-columns'
// import * as argon2 from "argon2";

export type UserStatus = 'used' | 'stop' | 'remove' | 'reg' | 'wait'

export enum UserType {
  Admin = 'admin',
  User = 'user',
}

export const GameMoneyField = 'balance'

@Index('index_agent_userId', ['agentId', 'userId'], { unique: true })
@Index('index_agent_userId_balance', ['agentId', 'userId', 'balance'], { unique: false })
@Index('index_agentCode_userId', ['agentCode', 'userId'])
@Index('index_agentCode_userId_gameToken', ['agentCode', 'userId', 'gameToken'])
@Index('index_agentCode_userId_balance', ['agentCode', 'userId', 'balance'])
@Entity('info_user')
export class User extends BaseEntity {
  // export class User  {
  @PrimaryGeneratedColumn()
  idx: number
  // @hashKey()

  @Column({ type: 'nvarchar', length: 20, default: '' })
  @Index()
  userId: string

  @Column({ type: 'nvarchar', length: 20, default: '' })
  nick: string

  // @Column({ type: 'bigint', default: 0 })
  @DecimalToNumberColumn(12, 2, { default: 0 })
  balance: number

  // 베팅 중인 머니 페이크에서 사용할려고 했다가 지금은 사용하지 않는다.
  @DecimalToNumberColumn(12, 2, { default: 0 })
  bettingMoney: number

  // 페이크에서 사용하는 컬럼
  @DecimalToNumberColumn(12, 2, { default: 0 })
  fakeBalance: number

  // 보너스 밸런스
  @DecimalToNumberColumn(12, 2, { default: 0 })
  bonusBalance: number

  // 잠긴 밸런스 메가홀덤에서 사용
  @DecimalToNumberColumn(12, 2, { default: 0 })
  lockedBalance: number

  // 밸런스를 잠근 시간.
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lockedTime: Date

  // Booongo 에서만 사용
  @Column({ type: 'int', default: 0 })
  balanceVersion: number

  @Column({ type: 'nvarchar', length: 20, nullable: false, default: '' })
  @Index()
  agentId: string

  @Column({ type: 'varchar', length: 3, nullable: false })
  @Index()
  agentCode: string

  @Index()
  @Column({ type: 'nvarchar', length: 200, default: '' })
  agentTree: string

  @Column({ type: 'nvarchar', length: 200, default: '' })
  agentTreeKo: string

  @Column({ type: 'datetime' })
  regDate: Date

  @Index()
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastDate: Date

  @Column({ type: 'nvarchar', length: 100, default: '' })
  joinGame: string

  @Index()
  @Column({ type: 'nvarchar', length: 20, default: '' })
  lastJoinVendor: string

  // thirdParty 에서 받은 토큰
  // @Column({ type: 'varchar', length: 1500, default: '', charset: 'latin1' })
  @Column({ type: 'varchar', length: 200, default: '' })
  @Index('index_gameToken')
  gameToken: string

  // refresh-token으로 발급한 토큰
  @Column({ type: 'nvarchar', length: 100, default: '' })
  @Index()
  apiToken: string

  // fakeMode가 true 일 때는 심리스에서 fakeBalance를 써야한다.
  @Column({ type: 'boolean', default: false })
  fakeMode: boolean

  @Index('index_type')
  @Column({ type: 'enum', enum: UserType, default: UserType.User })
  type: UserType

  // @Index()
  // @Column({ type: 'nvarchar', length: 200, default: '' })
  // agentParents: string

  // @Index()
  // @Column({ type: 'nvarchar', length: 200, default: '' })
  // agentParentsKo: string

  constructor(init?: Partial<User>) {
    super()
    Object.assign(this, init)
  }

  @BeforeInsert()
  async hashPassword() {
    // this.password = await argon2.hash(this.password);
  }

  // IsFriend = () => {
  //   return this.friendId != null && this.friendId !== ''
  // }

  getGameMoney() {
    return this[GameMoneyField]
  }

  HavaBalance(_balance) {
    return this.balance - _balance < 0
  }

  IsNull() {
    return this.idx === 0
  }

  IsBenefitPW() {
    // return this.rollingPWNor > 0

    return false
  }
}
