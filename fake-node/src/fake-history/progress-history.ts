import { In } from 'typeorm'
import { MongoBet } from '../../service/src/lib/interface/mongo'
import { BetData } from '../../service/src/lib/interface/mongo/data-bet-data'
import { UserSQL } from '../../service/src/lib/interface/sql'

export const pad2 = (n) => {
  return (n < 10 ? '0' : '') + n
}

export const ConvertTree = (trees) => {
  let count = 1
  const ex = {}
  for (const tree of trees.split('|')) {
    if (tree !== '') {
      ex[`${count}`] = tree
      count++
    }
  }

  return ex
}

export const gAgents: Record<string, any> = {}

const memHistroy = {}

// 메모리에 적재되지 않는 user와 agent를 찾아서 넣어준다.
async function crawlUserAndAgent(mainSQL: UserSQL, historys: any[]) {
  // const nonExistUserNameDict = {}
  const nonExistAgentNameDict = {}

  for (const history of historys) {
    if (history == null || gAgents[history.agentCode] != null) {
      continue
    }

    nonExistAgentNameDict[history.agentCode] = 1
  }

  const agentCodes = Object.keys(nonExistAgentNameDict)
  if (agentCodes.length === 1) {
    const agent = await mainSQL.agent.findOne({ where: { agentCode: agentCodes[0] } })
    gAgents[agent.agentCode] = agent
  } else if (agentCodes.length > 1) {
    const agents = await mainSQL.agent.find({ where: { agentCode: In(agentCodes) } })
    for (const agent of agents) {
      gAgents[agent.agentCode] = agent
    }
  }
}

export async function ProgressHistory(mongoBet: MongoBet, mainSQL: UserSQL, histories: BetData[]) {
  await crawlUserAndAgent(mainSQL, histories)

  const now = new Date()
  // for (const history of histories) {
  for (let i = 0; i < histories.length; i++) {
    if (i % 100 === 0) {
      console.log('progress history', i)
    }

    const history = histories[i]
    if (memHistroy[history.id] != null) {
      continue
    }

    if (history.amountBet == null) {
      history.amountBet = 0
    }

    if (history.amountWin == null) {
      history.amountWin = 0
    }
    // histories.memHistroy[history.betId] = history

    /*
      // 처리 속도 때문에 여기를 주석처리함
       const historyDoc = await mongoBet.betDataCasino.findOne({ where: { _id: history.id } })
      if (historyDoc == null) {
        continue
      } */

    const agent = gAgents[`${history.agentCode}`]

    history.agentId = agent.agentId
    delete history.agentTree
    history.trees = agent.agentTree.split('|')

    const datas = history.betTime.toLocaleDateString('sv-SE').split('-')

    const dbUpdatePromises: Array<Promise<unknown>> = []

    const nowDate = `${datas[0]}-${pad2(Number(datas[1]))}-${pad2(Number(datas[2]))}`

    let masterUpserts: Array<{ updateOne: any }> = []

    masterUpserts.push({
      updateOne: {
        filter: { _id: history.id },
        update: {
          $set: {
            gameName: history.gameName ?? '',
            ip: history.ip ?? '',
            tableId: history.tableId,
            tableName: history.tableName,

            agentId: agent.agentId,

            calBetFake: history.calBetFake ?? {},
            calBetOrg: history.calBetOrg ?? {},
            // betFake: history.betFake ?? {},
            // betOrg: history.betOrg ?? {},

            //            agentTree: agent.agentTree,
            trees: ConvertTree(agent.agentTree),
            historyStatus: 'DONE',
            content: history.content,
            koCalDate: nowDate,
            historyTime: now,
            ...(history.debug != null && { debug: history.debug }),
          },
        },
      },
    })
    dbUpdatePromises.push(mongoBet.betDataCasino.bulkWrite(masterUpserts))

    let incObj: Record<string, number> = {}
    incObj[`total.betCount`] = 1
    incObj[`total.betBalance`] = history.amountBet
    incObj[`detail.${history.thirdParty}.betBalance`] = history.amountBet
    incObj[`detail.${history.thirdParty}.betCount`] = 1

    if (Number(history.amountWin ?? 0) > 0) {
      incObj[`total.winCount`] = 1
      incObj[`total.winBalance`] = history.amountWin
      incObj[`detail.${history.thirdParty}.winCount`] = 1
      incObj[`detail.${history.thirdParty}.winBalance`] = history.amountWin
    }

    masterUpserts = []
    masterUpserts.push({
      updateOne: {
        filter: { _id: `${nowDate}` },
        update: { $inc: incObj },
        upsert: true,
      },
    })

    dbUpdatePromises.push(mongoBet.calculateManager.bulkWrite(masterUpserts))

    masterUpserts = []
    masterUpserts.push({
      updateOne: {
        filter: { _id: `${nowDate}-${history.agentId}-${history.userId}` },
        update: { $inc: incObj },
        upsert: true,
      },
    })
    dbUpdatePromises.push(mongoBet.calculateUser.bulkWrite(masterUpserts))

    /*if (typeof history.amountBet !== 'number') {
        console.log(
          `history ${history.agentCode + history.userId} ${history.summaryId} is invalid amountBet ${JSON.stringify(history.amountBet)}`,
        )
      }
      if (typeof history.amountWin !== 'number') {
        console.log(
          `history ${history.agentCode + history.userId} ${history.summaryId} is invalid amountWin ${JSON.stringify(history.amountWin)}`,
        )
      } */

    const agentUpserts: Array<{ updateOne: any }> = []

    for (const tree of history.trees) {
      if (tree === '') {
        continue
      }

      incObj = {}

      incObj[`total.betCount`] = 1
      incObj[`total.betBalance`] = history.amountBet
      incObj[`detail.${history.thirdParty}.betBalance`] = history.amountBet
      incObj[`detail.${history.thirdParty}.betCount`] = 1

      if (Number(history.amountWin ?? 0) > 0) {
        incObj[`total.winCount`] = 1
        incObj[`total.winBalance`] = history.amountWin
        incObj[`detail.${history.thirdParty}.winCount`] = 1
        incObj[`detail.${history.thirdParty}.winBalance`] = history.amountWin
      }

      if (history.agentId === tree) {
        incObj[`total.realBetCount`] = 1
        incObj[`total.realBetBalance`] = history.amountBet
      }

      if (history.agentId === tree && Number(history.amountWin ?? 0) > 0) {
        incObj[`total.realWinCount`] = 1
        incObj[`total.realWinBalance`] = history.amountWin
      }

      agentUpserts.push({
        updateOne: {
          filter: { _id: `${nowDate}_${tree}` },
          update: { $inc: incObj },
          upsert: true,
        },
      })
    }

    dbUpdatePromises.push(mongoBet.calculateAgent.bulkWrite(agentUpserts))
    // if (agentUpserts.length > 0) {
    //   dbUpdatePromises.push(mongoBet.calculateAgent.bulkWrite(agentUpserts))
    // }
    // if (userUpserts.length > 0) {
    //   dbUpdatePromises.push(mongoBet.calculateUser.bulkWrite(userUpserts))
    // }

    if (history.betOrg != null || history.betFake != null) {
      const fakeUpserts: Array<{ updateOne: any }> = []

      incObj = {}
      for (const key of Object.keys(history.calBetOrg ?? {})) {
        incObj[`org.${key}`] = history.calBetOrg[key]
        incObj[`fake.${key}`] = history.calBetFake[key]
        incObj[`table.${history.tableName}.org.${key}`] = history.calBetOrg[key]
        incObj[`table.${history.tableName}.fake.${key}`] = history.calBetFake[key]

        incObj[`agent.${history.agentId}.org.${key}`] = history.calBetOrg[key]
        incObj[`agent.${history.agentId}.fake.${key}`] = history.calBetFake[key]
      }

      for (const [key, value] of Object.entries(incObj)) {
        if (typeof value !== 'number') {
          console.log(
            `history ${history.agentCode + history.userId} ${history.summaryId} is invalid incObj ${key} ${JSON.stringify(value)}`,
          )
        }
      }

      fakeUpserts.push({
        updateOne: {
          filter: { _id: `${nowDate}` },
          update: { $inc: incObj, $setOnInsert: { date: nowDate } },
          upsert: true,
        },
      })
      dbUpdatePromises.push(mongoBet.calculateFake.bulkWrite(fakeUpserts))
    }

    const results = await Promise.all(dbUpdatePromises)
    for (const result of results as any) {
      const { nUpserted, upserted } = result?.result
      if (nUpserted === 1) {
        for (const upset of upserted) {
          const infos = upset._id.split('_')

          if (infos.length === 2) {
            await mongoBet.calculateAgent.updateOne(
              { _id: upset._id },
              { $set: { agentId: infos[1], date: nowDate, time: new Date(nowDate) } },
            )
          } else if (infos.length === 1) {
            await mongoBet.calculateManager.updateOne(
              { _id: upset._id },
              { $set: { date: nowDate, time: new Date(nowDate) } },
            )
          }
        }
      }
    }
  }
}
