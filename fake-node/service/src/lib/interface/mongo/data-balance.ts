import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

export enum LogBalanceType {
  agent_give_balance = 'agent_give_balance',
  admin_give_balance = 'admin_give_balance',

  balance_charge_apply = 'balance_charge_apply',
  balance_charge_cancel = 'balance_charge_cancel',
  balance_charge_wait = 'balance_charge_wait',
  balance_charge_success = 'balance_charge_success',

  admin_buy_balance = 'admin_buy_balance',
  admin_cancel_win = 'admin_cancel_win',
  admin_cancel_lose = 'admin_cancel_lose',

  admin_end_win = 'admin_end_win',
  admin_end_lose = 'admin_end_lose',

  user_balance_in_game = 'user_balance_in_game',
  user_balance_out_game = 'user_balance_out_game',
}

@Index('index_agentId_code', ['agentId', 'receipt'], { unique: true })
@Index('index_agentId_type', ['agentId', 'type'], { unique: false })
// @Index('index_type_trees1', ['type', 'trees.1'], { unique: false })
// @Index('index_type_trees2', ['type', 'trees.2'], { unique: false })
// @Index('index_type_trees3', ['type', 'trees.3'], { unique: false })
// @Index('index_type_trees4', ['type', 'trees.4'], { unique: false })
// @Index('index_type_trees5', ['type', 'trees.5'], { unique: false })
// @Index('index_type_trees6', ['type', 'trees.6'], { unique: false })
// @Index('index_type_trees7', ['type', 'trees.7'], { unique: false })
// @Index('index_type_trees8', ['type', 'trees.8'], { unique: false })
// @Index('index_type_trees9', ['type', 'trees.9'], { unique: false })

@Entity('balance')
export class Balance {
  @ObjectIdColumn()
  _id: string

  @Column()
  type: string

  @Index('index-agent')
  @Column()
  agentId: string

  @Column()
  balance: number

  @Column()
  affterBalance: number

  @Column()
  receipt: string

  @Column()
  regDate: string

  @Column()
  setDate: string

  @Column()
  giveId: string

  @Column()
  targetId: string

  @Column()
  ms: string

  @Column()
  trees: unknown
}
