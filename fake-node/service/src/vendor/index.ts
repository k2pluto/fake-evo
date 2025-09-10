import { Repository, MongoRepository } from 'typeorm'
import { User } from '../lib/interface/sql/user'

import { BetDataSlot } from '../lib/interface/mongo/data-bet-data-slot'
import { GameInfo } from '../lib/interface/mongo/data-game-info'
import { BetData } from '../lib/interface/mongo/data-bet-data'
import { HistroyKey } from '../lib/interface/mongo/data-histroy-key'
import { BetDataCasino } from '../lib/interface/mongo/data-bet-data-casino'
import { AgentRedirectSetting } from '../lib/interface/mongo/set-agent-redirect'
import { CasinoTransactionManager, SlotTransactionManager } from '../lib/common/game/transaction-manager'
import { AuthManager } from '../lib/common/game/auth-manager'
import { VendorCode } from '../lib/common/types/vendor-code'
import { GameType } from '../lib/common/types/common'
import { ApiCode } from '../lib/common/types/api-code'
import { AgentVendorSetting } from '../lib/interface/mongo/set-agent-game'
import { MongoBet } from '../lib/interface/mongo'

export class APIError {
  type: 'vendor' | 'network' | 'system'
  code?: string
  message: string
  data?: unknown
}

export class APIResult<T> {
  url = ''
  body: any = ''
  headers: { [key: string]: any } = {}
  error?: APIError

  success = false

  result: T

  isSuccess() {
    return this.success
  }
}

export class CreateResult<T> extends APIResult<T> {
  vendorUserId?: string
  vendorToken?: string
}

export class BalanceResult<T> extends APIResult<T> {
  balance = 0

  getBalance() {
    return this.balance
  }
}

export class BalanceOutResult<T> extends APIResult<T> {
  outBalance = 0
}

export class JoinResult<T> extends BalanceResult<T> {
  gameName: string
  gameUrl: string
}

export class SessionResult<T> extends APIResult<T> {
  session: string
}

export type DeviceType = 'mobile' | 'desktop'

export interface JoinOptions {
  userRepo?: Repository<User>
  mongoBet?: MongoBet
  userBalance?: number
  agentCode: string
  userId: string
  nick?: string
  vendorCode?: string
  device?: DeviceType
  code?: string
  ip?: string
  entryDomain?: string
  vendorSetting?: AgentVendorSetting
  redirectSetting?: AgentRedirectSetting
  // 벤더사에서 구분하는 Unique UserId
  vendorUserId?: string
  vendorToken?: string
}

export interface GamesOptions {
  gameRepo?: MongoRepository<GameInfo>
  agent?: string
  session?: string
  gameCode?: string
  userId?: string
}

export interface LegacyHistoryOptions {
  vendorCode: string
  mongoBet: MongoBet
  betRepo: MongoRepository<BetData>
  betSlotRepo: MongoRepository<BetDataSlot>
}

export interface HistoryOptions {
  vendorCode: string
  mongoBet: MongoBet
  betRepo: MongoRepository<BetData>
  betSlotRepo: MongoRepository<BetDataSlot>
  historyKeyRepo?: MongoRepository<HistroyKey>
  bets: BetData[]
}

export interface UpdateGamesOptions {
  gameRepo: MongoRepository<GameInfo>
  excel?: string
}

export interface ResolveTransactionOptions {
  authManager: AuthManager
  casinoManager?: CasinoTransactionManager
  slotManager?: SlotTransactionManager
  vendorCode: string | VendorCode
}

export interface APIEnv {
  API_CODE?: ApiCode
}

export type ProviderType =
  | 'jj'
  | 'zenith'
  | 'direct'
  | 'choi'
  | 'swix'
  | 'alpha'
  | 'uniongame'
  | 'goldlion'
  | 'realgates'
  | 'dhsoft'
  | 'tripplea'
  | 'kroad'
  | 'livebar'
  | 'grand'
  | 'own'

export class Vendor<T extends APIEnv = any> {
  env: T
  configSchema: unknown
  nameEn?: string
  nameKo?: string
  gameType: GameType
  desc: string
  provider: ProviderType
  apiCode: string
  used: 'y' | 'n'
  show: 'y' | 'n'
  defaultGameCode?: string
  redirect: boolean

  constructor({
    env = {},
    gameType = 'casino',
    defaultGameCode: gameCode,
    nameEn,
    nameKo,
    used = 'y',
    show = 'y',
    redirect = false,
    provider,
    configSchema,
    desc,
  }: Partial<Vendor> = {}) {
    this.setEnv(env)
    this.gameType = gameType
    this.defaultGameCode = gameCode
    this.nameEn = nameEn
    this.nameKo = nameKo
    this.used = used
    this.show = show
    this.redirect = redirect
    this.provider = provider
    this.configSchema = configSchema
    this.desc = desc
  }

  setEnv(env: T) {
    this.env = env
  }

  create(user: User, userId: string): Promise<CreateResult<any>> {
    return null
  }
  session(user: User): Promise<SessionResult<any>> {
    return null
  }
  balance(user: User): Promise<BalanceResult<any>> {
    return null
  }
  balanceIn(user: User, session: string, amount: number): Promise<APIResult<any>> {
    return null
  }
  balanceOut(user: User, session: string, amount: number): Promise<BalanceOutResult<any>> {
    return null
  }
  join(options: JoinOptions): Promise<JoinResult<any>> {
    return null
  }
  setlimit(user: User): Promise<APIResult<any>> {
    return null
  }

  updateGames(options: UpdateGamesOptions) {
    return null
  }

  /*gameList(option: GamesOptions): Promise<APIResult<unknown[]>> {
    return null
  }*/

  gameList(options?: any): any {
    return null
  }

  getGameList(): Promise<Partial<GameInfo>[]> {
    return null
  }

  getGameType(): GameType {
    return this.gameType
  }

  memHistroy: { [id: string]: boolean } = {}

  processHistoryData?(options: HistoryOptions): Promise<BetData[]>

  history?(options: LegacyHistoryOptions): Promise<BetData[]>

  historySlot?(options: LegacyHistoryOptions): Promise<{ [master: string]: BetDataSlot[] }>

  getInfo(bet: BetData, option: LegacyHistoryOptions): Promise<any> {
    return null
  }

  detailSlot(histroy: BetDataSlot): Promise<any> {
    return null
  }

  detailCasino(histroyId: BetDataCasino): Promise<any> {
    return null
  }

  resolveTransactions(options: ResolveTransactionOptions): Promise<any> {
    return null
  }
}
