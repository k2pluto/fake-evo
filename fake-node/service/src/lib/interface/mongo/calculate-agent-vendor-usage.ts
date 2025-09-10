import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

@Entity('calculate-agent-vendor-usage')
export class CalculateAgentVendorUsage {
  @ObjectIdColumn()
  _id: string

  @Column()
  day: number

  @Column()
  @Index('dateTime')
  dateTime: Date

  @Column()
  lastCalcTime: Date

  @Column()
  @Index('agentId')
  agentId: string

  @Column()
  @Index('agentCode')
  agentCode: string

  @Column()
  vendorUsages: Record<
    string,
    {
      amountBet: number
      amountWin: number
    }
  >
}
