import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

@Index('thirdParty_Code', ['thirdParty'], { unique: true })
// slot과 casino 게임들을 같이 취급해야 되서 클래스 명에 Slot 을 제거
@Entity('histroy_key')
export class HistroyKey {
  @ObjectIdColumn()
  _id: string

  @Index('idx_thirdParty')
  @Column()
  thirdParty: string

  //베팅 히스토리에서 참조하는 ID값
  @Column()
  historyId: string
}
// }
