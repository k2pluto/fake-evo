import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

export enum LogAgentBalanceType {
  agent_give_balance = 'agent_give_balance',
  agent_take_balance = 'agent_take_balance',
}

@Index('index_agentId_regDate', ['agentId', 'regDate'], { unique: false })
// @Index('index_type_trees1', ['type', 'trees.1'], { unique: false })
// @Index('index_type_trees2', ['type', 'trees.2'], { unique: false })
// @Index('index_type_trees3', ['type', 'trees.3'], { unique: false })
// @Index('index_type_trees4', ['type', 'trees.4'], { unique: false })
// @Index('index_type_trees5', ['type', 'trees.5'], { unique: false })
// @Index('index_type_trees6', ['type', 'trees.6'], { unique: false })
// @Index('index_type_trees7', ['type', 'trees.7'], { unique: false })
// @Index('index_type_trees8', ['type', 'trees.8'], { unique: false })
// @Index('index_type_trees9', ['type', 'trees.9'], { unique: false })

@Entity('log_agent_balance')
export class LogAgentBalance {
  // @ObjectIdColumn()
  // _id: string

  @ObjectIdColumn({ name: '_id' })
  id: string

  @Column()
  type: string

  @Index('index-agent')
  @Column()
  agentId: string

  @Index('index-userId')
  @Column()
  userId: string

  @Column()
  balance: number

  @Column()
  bonusBalance?: number

  @Column()
  affterBalance: number

  @Column()
  affterUserBalance: number

  @Column()
  receipt: string

  @Index('index-regDate')
  @Column()
  regDate: Date

  @Column()
  giveId: string

  @Column()
  targetId: string

  @Column()
  trees: unknown

  @Column()
  ms: string

  @Column()
  ip: string
}
