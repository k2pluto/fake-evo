import { type MongoRepository } from 'typeorm'

import { type MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions'
import { MongoManager } from './mongo-manager'

// import { Games } from './data.games'
import { LogBalance } from './log-balance'
import { Balance } from './data-balance'
import { LogAgentBalance } from './log-agent-balance'
import { LogService } from './log-service'

import { TaskEntity } from '../../utility/mongo-task'

import { BetDataSlot } from './data-bet-data-slot'
import { BetTransactionSlot } from './data-bet-transaction-slot'
import { BetDataCasino } from './data-bet-data-casino'
import { BetTransactionCasino } from './data-bet-transaction-casino'

import { GameInfo } from './data-game-info'

import { CalculateAgent } from './calculate-agent'
import { CalculateUser } from './calculate-user'
import { CalculateManager } from './calculate-manager'

import { CalculateFake } from './calculate-fake'
import { CalculateNonFake } from './calculate-non-fake'
import { CalculateAgentVendorUsage } from './calculate-agent-vendor-usage'

import { DataStore } from './data-store'
import { DataVendor } from './data-vendor'
import { AgentGameSetting } from './set-agent-game'
import { UserGameSetting } from './set-user-game'
import { Lock } from './data-lock'
import { LogError } from './log-error'
import { DataEvolutionTable } from './data-evolution-table'
import { AgentRedirectSetting } from './set-agent-redirect'
import { LogMaster } from './log-master'
import { ServerInfo } from './data-server-info'
import { AgentVendorSetting } from './set-agent-vendor'

import { FakeLoginData } from './fake-login-data'
import { FakeGameData } from './fake-game-data'
import { FakeBetData } from './fake-bet-data'
import { FakeUserTableConfig } from './fake-user-table-config'
import { FakeDomain } from './fake-domain'
import { FakeTableData } from './fake-table-data'
import { FakeBlackListUser } from './fake-blacklist-user'
import { FakeBlackListIp } from './fake-blacklist-ip'
import { LogFakeConnection } from './log-fake-connection'
import { LogFakeChat } from './log-fake-chat'
import { LogAgentLogin } from './log-agent-login'
import { BetTransactionSport } from './data-bet-transaction-sport'
import { BetDataSport } from './data-bet-data-sport'
import { LogFakeEntry } from './log-fake-entry'

export const mongo_entities = [
  BetDataCasino,
  BetTransactionCasino,
  BetDataSlot,
  BetTransactionSlot,
  BetDataSport,
  BetTransactionSport,
  Balance,
  LogBalance,
  LogService,
  LogAgentBalance,
  LogAgentLogin,
  LogMaster,
  LogError,
  LogFakeConnection,
  LogFakeEntry,
  LogFakeChat,
  TaskEntity,
  CalculateManager,
  CalculateAgent,
  CalculateFake,
  CalculateNonFake,
  CalculateAgentVendorUsage,
  GameInfo,
  ServerInfo,
  DataStore,
  DataVendor,
  DataEvolutionTable,
  AgentGameSetting,
  AgentVendorSetting,
  AgentRedirectSetting,
  UserGameSetting,
  CalculateUser,
  Lock,
  FakeLoginData,
  FakeGameData,
  FakeBetData,
  FakeTableData,
  FakeUserTableConfig,
  FakeBlackListUser,
  FakeBlackListIp,
  FakeDomain,
]

export class MongoBet extends MongoManager {
  betDataCasino: MongoRepository<BetDataCasino>

  betTransactionCasino: MongoRepository<BetTransactionCasino>

  betDataSlot: MongoRepository<BetDataSlot>

  betTransactionSlot: MongoRepository<BetTransactionSlot>

  betDataSport: MongoRepository<BetDataSport>

  betTransactionSport: MongoRepository<BetTransactionSport>

  calculateManager: MongoRepository<CalculateManager>

  calculateAgent: MongoRepository<CalculateAgent>

  calculateUser: MongoRepository<CalculateUser>

  calculateFake: MongoRepository<CalculateFake>

  calculateNonFake: MongoRepository<CalculateNonFake>

  calculateAgentVendorUsage: MongoRepository<CalculateAgentVendorUsage>

  balance: MongoRepository<Balance>

  logBalance: MongoRepository<LogBalance>

  logAgentBalance: MongoRepository<LogAgentBalance>

  logAgentLogin: MongoRepository<LogAgentLogin>

  logService: MongoRepository<LogService>

  logError: MongoRepository<LogError>

  logMaster: MongoRepository<LogMaster>

  logFakeConnection: MongoRepository<LogFakeConnection>

  logFakeEntry: MongoRepository<LogFakeEntry>

  logFakeChat: MongoRepository<LogFakeChat>

  gameInfo: MongoRepository<GameInfo>

  serverInfo: MongoRepository<ServerInfo>

  task: MongoRepository<TaskEntity>

  dataStore: MongoRepository<DataStore>

  vendor: MongoRepository<DataVendor>

  dataEvolutionTable: MongoRepository<DataEvolutionTable>

  lock: MongoRepository<Lock>

  agentGameSetting: MongoRepository<AgentGameSetting>

  agentVendorSetting: MongoRepository<AgentVendorSetting>

  userGameSetting: MongoRepository<UserGameSetting>

  agentRedirectSetting: MongoRepository<AgentRedirectSetting>

  fakeLoginData: MongoRepository<FakeLoginData>

  fakeGameData: MongoRepository<FakeGameData>

  fakeBetData: MongoRepository<FakeBetData>

  fakeTableData: MongoRepository<FakeTableData>
  fakeBlacklistUser: MongoRepository<FakeBlackListUser>
  fakeBlacklistIp: MongoRepository<FakeBlackListIp>

  fakeUserTableConfig: MongoRepository<FakeUserTableConfig>

  fakeDomain: MongoRepository<FakeDomain>

  constructor(options: MongoConnectionOptions) {
    super()
    this.options = options
  }

  async postConnect() {
    this.betDataCasino = this.dbConnection.manager.getMongoRepository(BetDataCasino)
    this.betTransactionCasino = this.dbConnection.manager.getMongoRepository(BetTransactionCasino)
    this.betDataSlot = this.dbConnection.manager.getMongoRepository(BetDataSlot)
    this.betTransactionSlot = this.dbConnection.manager.getMongoRepository(BetTransactionSlot)

    this.betDataSport = this.dbConnection.manager.getMongoRepository(BetDataSport)
    this.betTransactionSport = this.dbConnection.manager.getMongoRepository(BetTransactionSport)

    this.balance = this.dbConnection.manager.getMongoRepository(Balance)

    this.logBalance = this.dbConnection.manager.getMongoRepository(LogBalance)
    this.logAgentBalance = this.dbConnection.manager.getMongoRepository(LogAgentBalance)
    this.logAgentLogin = this.dbConnection.manager.getMongoRepository(LogAgentLogin)

    this.logService = this.dbConnection.manager.getMongoRepository(LogService)
    this.logMaster = this.dbConnection.manager.getMongoRepository(LogMaster)
    this.logError = this.dbConnection.manager.getMongoRepository(LogError)
    this.logFakeConnection = this.dbConnection.manager.getMongoRepository(LogFakeConnection)
    this.logFakeEntry = this.dbConnection.manager.getMongoRepository(LogFakeEntry)
    this.logFakeChat = this.dbConnection.manager.getMongoRepository(LogFakeChat)

    this.task = this.dbConnection.manager.getMongoRepository(TaskEntity)

    this.calculateManager = this.dbConnection.manager.getMongoRepository(CalculateManager)

    this.calculateAgent = this.dbConnection.manager.getMongoRepository(CalculateAgent)

    this.calculateUser = this.dbConnection.manager.getMongoRepository(CalculateUser)

    this.calculateFake = this.dbConnection.manager.getMongoRepository(CalculateFake)

    this.calculateNonFake = this.dbConnection.manager.getMongoRepository(CalculateNonFake)
    this.calculateAgentVendorUsage = this.dbConnection.manager.getMongoRepository(CalculateAgentVendorUsage)

    this.gameInfo = this.dbConnection.manager.getMongoRepository(GameInfo)

    this.serverInfo = this.dbConnection.manager.getMongoRepository(ServerInfo)

    this.dataStore = this.dbConnection.manager.getMongoRepository(DataStore)
    this.vendor = this.dbConnection.manager.getMongoRepository(DataVendor)
    this.dataEvolutionTable = this.dbConnection.manager.getMongoRepository(DataEvolutionTable)

    this.agentGameSetting = this.dbConnection.manager.getMongoRepository(AgentGameSetting)
    this.agentVendorSetting = this.dbConnection.manager.getMongoRepository(AgentVendorSetting)
    this.userGameSetting = this.dbConnection.manager.getMongoRepository(UserGameSetting)

    this.agentRedirectSetting = this.dbConnection.manager.getMongoRepository(AgentRedirectSetting)

    this.fakeLoginData = this.dbConnection.manager.getMongoRepository(FakeLoginData)

    this.fakeGameData = this.dbConnection.manager.getMongoRepository(FakeGameData)
    this.fakeBetData = this.dbConnection.manager.getMongoRepository(FakeBetData)
    this.fakeTableData = this.dbConnection.manager.getMongoRepository(FakeTableData)
    this.fakeBlacklistUser = this.dbConnection.manager.getMongoRepository(FakeBlackListUser)
    this.fakeBlacklistIp = this.dbConnection.manager.getMongoRepository(FakeBlackListIp)

    this.fakeDomain = this.dbConnection.manager.getMongoRepository(FakeDomain)

    this.lock = this.dbConnection.manager.getMongoRepository(Lock)

    this.fakeUserTableConfig = this.dbConnection.manager.getMongoRepository(FakeUserTableConfig)
  }
}
