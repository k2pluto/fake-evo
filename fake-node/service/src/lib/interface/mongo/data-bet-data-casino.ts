// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { Entity, Index } from 'typeorm'

import { BetData } from './data-bet-data'

// 베팅 요약 콜렉션

@Index('agent_userId', ['agentCode', 'userId'], { unique: false })
@Index('agent_userId_betTime', ['agentCode', 'userId', 'betTime'], { unique: false })
@Index('agent_userId_summaryId', ['agentCode', 'userId', 'summaryId'], { unique: true })
// 사용안되서 삭제
// @Index('agentCode_historyStatus', ['agentCode', 'historyStatus'], { unique: false })

@Index('userId_agentCode_vendor_betStatus', ['userId', 'agentCode', 'vendor', 'betStatus'], { unique: false })
@Index('userId_agentCode_vendor_fakeRoundId', ['fakeRoundId', 'userId', 'agentCode', 'vendor'], { unique: false })
// pluto apihistory v1 에서 사용
@Index('agentCode_historyStatus_id_betTime_vendor', ['agentCode', 'historyStatus', '_id', 'betTime', 'vendor'], {
  unique: false,
})
// pluto apihistory v1 에서 사용
@Index('agentCode_betTime_historyStatus', ['agentCode', 'betTime', 'historyStatus'], { unique: false })
// pluto apihistory v1 에서 사용
@Index('agentCode_betTime_historyStatus_vendor', ['agentCode', 'betTime', 'historyStatus', 'vendor'], {
  unique: false,
})
// pluto apihistory v2 에서 사용
@Index('agentCode_vendor_historyTime', ['agentCode', 'vendor', 'historyTime'], {
  unique: false,
})
// 마스터의 /api/v1/bettings API 에서 사용
// 이것도 사용안되서 삭제
// @Index('_id_vendor', ['_id', 'vendor'], { unique: false })
// 마스터의 /api/v1/fake-daily-stats API 에서 사용
@Index('betTime_vendor_betStatus', ['betTime', 'vendor', 'betStatus'], { unique: false })
// fake-history에서 사용
// 이것도 사용안되서 삭제
/* @Index('betTime_vendor_historyStatus_isFakeBet', ['betTime', 'vendor', 'historyStatus', 'isFakeBet'], {
  unique: false,
}) */
// function aggregate 에서 사용
@Index('vendor_tableName', ['vendor', 'tableName'], { unique: false })
@Index('vendor_gameId_roundId', ['vendor', 'gameId', 'roundId'], { unique: false })
// thirdparty evolution에서 스트리밍 히스토리때문에 사용
@Index('vendor_historyStatus_isStream', ['vendor', 'historyStatus', 'isStream'], { unique: false })
@Index('betTime_historyStatus_vendor_isFakeBet', ['betTime', 'historyStatus', 'vendor', 'isFakeBet'], {
  unique: false,
})
@Entity('bet_data_casino')
export class BetDataCasino extends BetData {}
