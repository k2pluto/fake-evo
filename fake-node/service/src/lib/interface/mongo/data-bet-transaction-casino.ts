import { Entity, Index } from 'typeorm'
import { BetTransaction } from './data-bet-transaction'

@Index('betId_userId_agentCode', ['betId', 'userId', 'agentCode'], { unique: false })
// betId, userId, agentCode 까지 찾으면 남은 row는 몇개 되지 않기 때문에 type 까지는 필요 없음
// @Index('betId_userId_agentCode_type', ['betId', 'userId', 'agentCode', 'type'], { unique: false })
@Index('transId_userId_agentCode', ['transId', 'userId', 'agentCode'], { unique: false })
@Index('transId_summaryId_userId_agentCode', ['transId', 'summaryId', 'userId', 'agentCode'], { unique: false })
@Entity('bet_transaction_casino')
export class BetTransactionCasino extends BetTransaction {}
