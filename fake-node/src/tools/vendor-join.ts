import 'source-map-support/register'
import 'module-alias/register'

import { config } from './config'
import { UserSQL } from '@service/src/lib/interface/sql'
import { MongoBet } from '@service/src/lib/interface/mongo'

import { createUser } from '@service/src/function/create-user'
import { getUserInfo } from '@service/src/lib/common/game/auth-manager'
import { fakeVendors } from '../common/fake-vendors'
import { getAgentGameSettingTree } from '@service/src/lib/common/game/game-setting-store'
import { Vendor } from '@service/src/vendor'

const username = process.env.USERNAME

const { agentCode, userId } = getUserInfo(username)

const userSQL = new UserSQL(config.RDB_OPTIONS)
const mongoBet = new MongoBet(config.MONGO_OPTIONS)

async function bootstrap() {
  await userSQL.connect()
  await mongoBet.connect()

  const vendorCode = process.env.VENDOR_CODE

  const vendor = fakeVendors[vendorCode] as Vendor
  if (vendor == null) {
    console.log('invalid vendor code : ' + vendorCode)
    return
  }

  const user = await userSQL.user.findOne({ where: { agentCode, userId } })
  if (user == null) {
    console.log('can not find user')

    await createUser(agentCode + userId)
  }

  const agent = await userSQL.agent.findOne({ where: { agentCode } })
  if (agent == null) {
    console.log('can not find user')

    throw new Error('can not find agent')
  }

  const created = await vendor.create(user, agentCode + userId)

  const { mergedVendorSettings } = await getAgentGameSettingTree(mongoBet, agent, new Date())

  const vendorSetting = mergedVendorSettings[vendorCode]

  if (vendorSetting?.used === false) {
    return {
      status: 101,
      message: 'Not allow vendor',
    }
  }

  const joined = await vendor.join({
    userRepo: userSQL.user,
    mongoBet: mongoBet,
    agentCode: agentCode,
    userId: userId,
    userBalance: user.balance,
    vendorCode,
    device: 'desktop',
    vendorUserId: created.vendorUserId,
    vendorToken: created.vendorToken,
    vendorSetting,
    nick: '짱짱맨',
  })
  if (joined.success) {
    console.log(joined.gameUrl)
  } else {
    console.log(joined.error)
  }

  console.log(joined.gameUrl)

  process.exit(0)
}
bootstrap()
