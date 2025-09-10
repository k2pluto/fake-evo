import { type Repository, MoreThanOrEqual } from 'typeorm'

import { type MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'

import { User } from './user'
import { Agent } from './agent'
import { ThreadpartGameCode } from './threadpart-game-code.entity'
import { ThreadpartGames } from './threadpart-game.entity'
import { MasterGameSetting } from './master-game-setting'
import { BetLimit } from './betlimit'
import { SqlManager } from '../../utility/sql-manager'
import { AgentGameTypeSetting } from './agent-game-type-setting'
import { Session } from './session'
import { AgentWhitelist } from './agent-whitelists'
import { OldUser } from './old_user'
import { Master } from './master'

export const mysql_entities = [
  Agent,
  Master,
  User,
  OldUser,
  ThreadpartGames,
  ThreadpartGameCode,
  BetLimit,
  MasterGameSetting,
  AgentGameTypeSetting,
  Session,
  AgentWhitelist,
]

export type SimpleAgent = Pick<Agent, 'agentId' | 'balance' | 'agentTree' | 'level' | 'agentCode'>

export const total_entities = {
  agent: Agent,
  user: User,
  master: Master,
  old_user: OldUser,
  threadpartGameCode: ThreadpartGameCode,
  games: ThreadpartGames,
  betLimit: BetLimit,
  masterGameSetting: MasterGameSetting,
  agentGameTypeSetting: AgentGameTypeSetting,
  session: Session,
  agentWhitelist: AgentWhitelist,
}

type TotalEntities = typeof total_entities

export class UserSQL extends SqlManager<TotalEntities> {
  agent: Repository<Agent>

  user: Repository<User>
  old_user: Repository<OldUser>

  master: Repository<Master>

  session: Repository<Session>

  threadpartGameCode: Repository<ThreadpartGameCode>

  games: Repository<ThreadpartGames>

  betLimit: Repository<BetLimit>

  masterGameSetting: Repository<MasterGameSetting>

  agentGameTypeSetting: Repository<AgentGameTypeSetting>

  // infoCountry: MongoRepository<Country.CountryInfo>

  agentWhitelist: Repository<AgentWhitelist>

  constructor(options: MysqlConnectionOptions) {
    super(options, total_entities)
  }

  async postConnect() {
    await super.postConnect()
    this.agent = this.dbConnection.manager.getRepository(Agent)

    this.user = this.dbConnection.manager.getRepository(User)

    this.old_user = this.dbConnection.manager.getRepository(OldUser)

    this.master = this.dbConnection.manager.getRepository(Master)

    this.threadpartGameCode = this.dbConnection.manager.getRepository(ThreadpartGameCode)

    this.games = this.dbConnection.manager.getRepository(ThreadpartGames)

    this.betLimit = this.dbConnection.manager.getRepository(BetLimit)

    this.masterGameSetting = this.dbConnection.manager.getRepository(MasterGameSetting)

    this.agentGameTypeSetting = this.dbConnection.manager.getRepository(AgentGameTypeSetting)

    this.session = this.dbConnection.manager.getRepository(Session)

    this.agentWhitelist = this.dbConnection.manager.getRepository(AgentWhitelist)
  }

  async findAgentSession(session: string): Promise<SimpleAgent> {
    const now = new Date()
    now.setHours(now.getHours() - 24)

    const findSession = await this.session.findOne({ where: { session, regDate: MoreThanOrEqual(now) } })
    if (findSession == null) {
      return null
    }

    return await this.agent.findOne({
      select: ['agentId', 'balance', 'agentTree', 'level', 'agentCode'],
      where: { agentId: findSession.agentId },
    })
  }
}

export class PartialSQL<K extends keyof TotalEntities> extends SqlManager<{
  [Property in K]: TotalEntities[Property]
}> {
  constructor(options: MysqlConnectionOptions, entities: K[]) {
    const newEntities = {}
    for (const key of entities) {
      newEntities[key as string] = total_entities[key]
    }

    super(options, newEntities as { [Property in K]: TotalEntities[Property] })
  }

  async postConnect() {
    await super.postConnect()
  }
}
