// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { Entity, Index, Column } from 'typeorm'

import { BetData } from './data-bet-data'

// 베팅 요약 콜렉션

@Index('agent_userId', ['agentCode', 'userId'], { unique: false })
@Index('agent_userId_betTime', ['agentCode', 'userId', 'betTime'], { unique: false })
@Index('agent_userId_summaryId', ['agentCode', 'userId', 'summaryId'], { unique: true })
@Index('agentCode_historyStatus', ['agentCode', 'historyStatus'], { unique: false })
@Index('agentCode_historyStatus_id_betTime_vendor', ['agentCode', 'historyStatus', '_id', 'betTime', 'vendor'], {
  unique: false,
})
@Index('agentCode_betTime_historyStatus', ['agentCode', 'betTime', 'historyStatus'], { unique: false })
@Index('agentCode_betTime_historyStatus_vendor', ['agentCode', 'betTime', 'historyStatus', 'vendor'], {
  unique: false,
})
// pluto apihistory v2 에서 사용
@Index('agentCode_vendor_historyTime', ['agentCode', 'vendor', 'historyTime'], {
  unique: false,
})
// 사용안되서 삭제
// @Index('vendor_tableName', ['vendor', 'tableName'], { unique: false })
@Index('vendor_historyStatus_isStream', ['vendor', 'historyStatus', 'isStream'], { unique: false })
// @Index('agent_userId_matchIdx', ['agentCode', 'userId', 'matchIdx'], { unique: false })

@Entity('bet_data_sport')
export class BetDataSport extends BetData {
  @Column()
  matchIdx: string[]

  @Column()
  purchaseId: string
}
// }
