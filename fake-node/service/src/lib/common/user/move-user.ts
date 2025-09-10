import { UserSQL } from '../../interface/sql'

import { errorToString } from '../../utility/util'
import { OldUser } from '../../interface/sql/old_user'
import { User } from '../../interface/sql/user'

export async function moveToOldUser(mainSQL: UserSQL, user: User) {
  const { userId, agentCode } = user

  const oldUser = await mainSQL.repos.old_user.findOne({
    where: { agentCode, userId },
  })

  try {
    if (oldUser == null) {
      await mainSQL.dbConnection.transaction(async (manager) => {
        await mainSQL.repos.old_user.save(user)
        await manager.delete(User, { userId, agentCode })
      })
    } else {
      await mainSQL.dbConnection.transaction(async (manager) => {
        const transactionUser = await manager.findOne(User, { where: { userId, agentCode } })
        await manager.increment(OldUser, { userId, agentCode }, 'balance', transactionUser.balance)
        await manager.delete(User, { userId, agentCode })
      })
    }
  } catch (err) {
    console.log(errorToString(err))
  }
}

export async function moveToHotUser(mainSQL: UserSQL, user: OldUser) {
  const { userId, agentCode } = user

  const hotUser = await mainSQL.repos.user.findOne({
    where: { agentCode, userId },
  })

  try {
    if (hotUser == null) {
      await mainSQL.dbConnection.transaction(async (manager) => {
        await mainSQL.repos.user.save({
          ...user,
          lastDate: new Date(),
        })
        await manager.delete(OldUser, { userId, agentCode })
      })
    } else {
      await mainSQL.dbConnection.transaction(async (manager) => {
        const transactionUser = await manager.findOne(OldUser, { where: { userId, agentCode } })
        await manager.update(
          User,
          { userId, agentCode },
          {
            lastDate: new Date(),
            balance: () => `balance + ${transactionUser.balance}`,
          },
        )

        await manager.delete(OldUser, { userId, agentCode })
      })
    }
  } catch (err) {
    console.log(errorToString(err))
  }
}
