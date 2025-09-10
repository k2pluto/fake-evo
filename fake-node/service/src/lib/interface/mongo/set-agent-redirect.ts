import { Entity, Column, Index, BaseEntity, ObjectIdColumn } from 'typeorm'
import { ObjectId } from 'mongodb'

@Entity('set_agent_redirect')
@Index('agentCode_redirectFrom', ['agentCode', 'redirectFrom'], { unique: true })
export class AgentRedirectSetting extends BaseEntity {
  @ObjectIdColumn()
  _id: ObjectId

  @Index('agentCode')
  @Column()
  agentCode: string

  @Index('group')
  @Column()
  group: boolean

  //이 코드로 들어오면
  @Index('redirectFrom')
  @Column()
  redirectFrom: string

  //이 코드로 나가게
  @Column()
  redirectTo: string

  //접속할 페이크 벤더
  @Column()
  fakeVendor?: string

  //리디렉트 파라미터
  @Column()
  redirectParam: string

  @Column()
  entryDomainSettings: {
    [entryDomain: string]: {
      redirectDomain?: string
      redirectTo?: string
    }
  }
}
