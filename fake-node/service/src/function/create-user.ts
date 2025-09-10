import 'source-map-support/register'
import 'module-alias/register'

import { rdb_options as test_rdb_options } from '../connections/test'
import { rdb_options as prod_rdb_options } from '../connections/prod'
import { UserSQL } from '../lib/interface/sql/index'

import { User } from '../lib/interface/sql/user'
import { getUserInfo } from '../lib/common/game/auth-manager'

let rdb_options
if (process.env.STAGE_ENV === 'test') {
  rdb_options = test_rdb_options
}
if (process.env.STAGE_ENV === 'prod') {
  rdb_options = prod_rdb_options
}

export const userSQL = new UserSQL(rdb_options)

export async function createUser(username: string) {
  const { agentCode, userId } = getUserInfo(username)

  const agent = await userSQL.agent.findOne({ where: { agentCode } })
  if (agent == null) {
    throw new Error('agent not found')
  }

  const { agentId, agentTree } = agent

  // user가 없으면 새로 만든다.
  const newUser = new User({
    agentId: agentId,
    agentCode,
    agentTree,
    nick: userId,
    userId: userId,
    regDate: new Date(),
    balance: 500_000,
  })

  await userSQL.user.save(newUser)

  return true
}

async function bootstrap() {
  await userSQL.connect()

  const USERNAME = process.env.USERNAME
  if (USERNAME == null) {
    console.log('USERNAME env is required')
    return
  }

  const { agentCode, userId } = getUserInfo(USERNAME)

  const user = await userSQL.user.findOne({ where: { agentCode, userId } })
  if (user != null) {
    console.log('user already exists')
    return
  }

  await createUser(agentCode + userId)

  process.exit()
}
bootstrap()
