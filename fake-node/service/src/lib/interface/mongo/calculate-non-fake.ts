import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

@Entity('calculate-non-fake')
export class CalculateNonFake {
  @ObjectIdColumn()
  _id: string

  @Column()
  @Index()
  date: Date

  @Column()
  tables: any

  @Column()
  agents: any

  @Column()
  users: any

  @Column()
  lastCalcTime: Date
}
