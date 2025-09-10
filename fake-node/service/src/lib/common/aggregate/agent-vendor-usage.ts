import { MongoRepository, Repository } from 'typeorm'
import { addDays, parse } from 'date-fns'

import { MongoBet } from '../../interface/mongo/index'

import { CalculateAgentVendorUsage } from '../../interface/mongo/calculate-agent-vendor-usage'
import { BetData } from '../../interface/mongo/data-bet-data'
import { Agent } from '../../interface/sql/agent'

function aggregateAgentVendorUsage(
  betDataRepo: MongoRepository<BetData>,

  startDate: Date,
  endDate: Date,
) {
  const aggRes = betDataRepo.aggregate([
    {
      $match: {
        betStatus: 'SETTLE',
        betTime: { $gte: startDate, $lt: endDate },
      },
    },

    {
      $group: {
        _id: {
          agentCode: '$agentCode',
          vendor: { $cond: [{ $eq: ['$isFakeBet', true] }, { $concat: [`$vendor`, '_fake'] }, `$vendor`] },
        },
        amountBet: { $sum: '$amountBet' },
        amountWin: { $sum: '$amountWin' },
      },
    },
  ])

  return aggRes.toArray() as Promise<any[]> as Promise<
    {
      _id: {
        agentCode: string
        vendor: string
      }
      amountBet: number
      amountWin: number
    }[]
  >
}

function aggregateSlotAgentVendorUsage(
  betDataRepo: MongoRepository<BetData>,

  startDate: Date,
  endDate: Date,
) {
  const aggRes = betDataRepo.aggregate([
    {
      $match: {
        betStatus: 'SETTLE',
        betTime: { $gte: startDate, $lt: endDate },
      },
    },

    {
      $group: {
        _id: {
          agentCode: '$agentCode',
          vendor: '$vendor',
        },
        amountBet: { $sum: '$amountBet' },
        amountWin: { $sum: '$amountWin' },
      },
    },
  ])

  return aggRes.toArray() as Promise<any[]> as Promise<
    {
      _id: {
        agentCode: string
        vendor: string
      }
      amountBet: number
      amountWin: number
    }[]
  >
}

export async function getAgentVendorUsage(mongo: MongoBet, agentRepo: Repository<Agent>, day: number) {
  if (isNaN(day)) {
    return
  }
  const now = new Date()

  const startDate = parse(day.toString(), 'yyyyMMdd', now)
  if (startDate == null || isNaN(startDate.getTime()) || startDate.getTime() > now.getTime()) {
    return
  }
  const endDate = addDays(startDate, 1)
  //const endDate = addHours(startDate, 1)

  const agentVendorUsages: {
    [agentCode: string]: {
      agentCode: string
      agentId: string
      vendorUsages: {
        [vendorCode: string]: {
          amountBet: number
          amountWin: number
        }
      }
    }
  } = {}

  const casinoRes = await aggregateAgentVendorUsage(mongo.betDataCasino, startDate, endDate)

  const slotRes = await aggregateSlotAgentVendorUsage(mongo.betDataSlot, startDate, endDate)

  const agents: { [agentCode: string]: Agent } = {}

  for (const i of [...casinoRes, ...slotRes]) {
    const { agentCode } = i._id
    const agent = (agents[agentCode] ??= await agentRepo.findOne({ where: { agentCode } }))

    const agentVendorUsage = (agentVendorUsages[agentCode] ??= {
      agentCode,
      agentId: agent?.agentId,
      vendorUsages: {},
    })

    agentVendorUsage.vendorUsages[i._id.vendor] = {
      amountBet: i.amountBet,
      amountWin: i.amountWin,
    }
  }

  const documents = Object.values(agentVendorUsages).map(
    (value) =>
      ({
        _id: `${day}_${value.agentId}`,
        agentCode: value.agentCode,
        agentId: value.agentId,
        vendorUsages: value.vendorUsages,
        day: day,
        dateTime: startDate,
        lastCalcTime: new Date(),
      } as CalculateAgentVendorUsage),
  )

  return documents
}

export async function updateAgentVendorUsage(mongo: MongoBet, agentRepo: Repository<Agent>, day: number) {
  const documents = await getAgentVendorUsage(mongo, agentRepo, day)
  if (documents == null) {
    return
  }

  const bulkObj = documents.map((value) => ({
    updateOne: {
      filter: {
        _id: value._id,
      },
      update: {
        $set: {
          ...value,
        } as Partial<CalculateAgentVendorUsage>,
      },
      upsert: true,
    },
  })) as any[]

  await mongo.calculateAgentVendorUsage.bulkWrite(bulkObj)

  console.log('updateAgentVendorUsage', day, bulkObj.length, 'done')

  return documents
}
