import { Entity, ObjectIdColumn, Column, Index } from 'typeorm'

@Index('index_nameEn_brand', ['nameEn', 'brand'], { unique: false })
@Index('index_brand_code_used', ['brand', 'code', 'used'], { unique: false })
@Index('index_vendor_code', ['vendor', 'code'], { unique: false })
@Index('index_vendor_imgUrl_used', ['vendor', 'imgUrl', 'used'], { unique: false })
// slot과 casino 게임들을 같이 취급해야 되서 클래스 명에 Slot 을 제거
@Entity('data_game_info')
export class GameInfo {
  @ObjectIdColumn()
  _id: string

  @Column()
  imgUrl: string

  // 게임마다 playUrl이 달라질 때 사용한다 (예:나가 게임즈. 재미니 게이밍)
  @Column()
  playUrl: string

  //실행할 때 사용하는 코드값
  @Column()
  code: string

  @Column()
  nameEn: string

  @Column()
  nameKo: string

  // thirdParty 를 사용하지 않는 이유는 thirdparty 로 입력하는 사람들이 많을 것 같은 이유
  // 실행하는 vendor 이름
  @Column()
  @Index('index_vendor')
  vendor: string

  // 화면상으로 구분하는 brand 이름
  @Column()
  brand: string

  @Column()
  @Index('index_used')
  used: 'y' | 'n'

  @Column()
  order: number

  //베팅 히스토리에서 참조하는 ID값
  @Column()
  historyId: string

  @Column()
  @Index('index_createdAt')
  createdAt: Date
}
// }
