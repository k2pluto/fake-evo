import { User } from '@service/src/lib/interface/sql/user'
import { Agent } from '@service/src/lib/interface/sql/agent'
import { BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'

import { BetTransactionCasino } from '@service/src/lib/interface/mongo/data-bet-transaction-casino'

export const rdb_use_entities = [User, Agent]
export const mongo_use_entities = [BetDataCasino, BetTransactionCasino]
