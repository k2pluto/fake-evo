import _ from 'lodash'
import { type TransactionResult } from '@service/src/lib/common/game/save-transaction'
import { type FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { MINUTE_MS, errorToString } from './util'
import { type SaveBetType, processBetAction } from './bet-action'
import { type CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { type MongoBet } from '@service/src/lib/interface/mongo'
import { type Agent } from '@service/src/lib/interface/sql/agent'
import { type User } from '@service/src/lib/interface/sql/user'
import { type AcceptedBets, EvolutionBettingErrorCode, type RejectedBets } from './fake-packet-types'
import { type Chips } from './types'
import { getFeeInfo } from './fake-util'

interface FakeBetOptions {
  agent: Agent
  user: User
  vendor: string
  userId: string
  agentCode: string
  tableId: string
  roundId: string
  transId: string
  body: any
  betClosedTimestamp: number
  mongoDB: MongoBet
  casinoManager: CasinoTransactionManager
}

export async function tryFakeBet({
  agent,
  user,
  vendor,
  userId,
  agentCode,
  tableId,
  roundId,
  transId,
  body,
  mongoDB,
  betClosedTimestamp,
  casinoManager,
}: FakeBetOptions): Promise<
  TransactionResult & {
    rejectedBets?: RejectedBets
    acceptedBets?: AcceptedBets
    currentChips?: Chips
    totalAmount?: number
  }
> {
  const username = agentCode + userId

  const summaryId = vendor + '-' + tableId + '-' + roundId

  const fakeBet = await mongoDB.fakeBetData.findOne({
    where: {
      vendor,
      userId,
      agentCode,
      tableId,
      roundId,
    },
  })

  if (fakeBet == null) {
    return {
      status: CommonReturnType.InternalServerError,
      summaryId,
    }
  }

  console.log(`try_fake_bet_1 ${username} ${JSON.stringify(fakeBet)}`)

  const MINUTE_2 = MINUTE_MS * 2

  if (new Date().getTime() - fakeBet.betTime.getTime() > MINUTE_2) {
    // 페이크 데이터가 있는데 베팅 시간이 너무 오래 지났으면 에러를 리턴한다.
    return {
      status: CommonReturnType.InternalServerError,
      summaryId,
    }
  }

  const { betLimits } = fakeBet

  const saveBets = fakeBet.saveBet as Record<string, SaveBetType>

  // 만약 처리 안된 베팅이 있으면 처음부터 다시 betOrg 를 생성한다.
  // 처음에만 처리되고 중간에 재접속했을 때 중간에 처리안된 패킷들이 있기 때문이다.
  let unproceedPacket = false

  for (const bet of Object.values(saveBets)) {
    if (!bet.proceed) {
      unproceedPacket = true
    }

    // 베팅 리퀘스트 중에 베팅 끝난 시간보다 받은 시간이 더 큰 리퀘스트가 있으면 지우고 새로 셋팅해야 한다.
    if (bet.receiveTime.getTime() > betClosedTimestamp) {
      unproceedPacket = true
    }
  }

  let fakeBetSetObj = {}
  const acceptedBets: AcceptedBets = {}
  const rejectedBets: RejectedBets = {}

  const currentChips = _.cloneDeep(fakeBet.betOrg)

  if (fakeBet.betOrg == null || unproceedPacket) {
    const setObj: Partial<FakeBetData> = {}

    console.log(`create betOrg ${username} ${summaryId}`)

    fakeBet.betOrg = {}
    fakeBet.betFake = {}

    const totalIncOrgChips: Record<string, number> = {}
    const totalIncFakeChips: Record<string, number> = {}

    // 중간까지만 처리되었던 결과들을 전부 삭제한다.
    for (const key in fakeBet.saveBet) {
      const packet = fakeBet.saveBet[key] as SaveBetType
      delete packet.Undo
      delete packet.proceed
      delete packet.incOrgChips
      delete packet.incFakeChips
    }

    for (const key in fakeBet.saveBet) {
      const packet = fakeBet.saveBet[key] as SaveBetType

      if (betClosedTimestamp != null && packet.receiveTime.getTime() > betClosedTimestamp) {
        console.log(
          `skip after closed bet ${username} ${summaryId} ${packet.receiveTime.toISOString()} > ${betClosedTimestamp}`,
        )
        continue
      }

      const { incOrgChips, incFakeChips } = await processBetAction({
        vendor,
        mongoDB,
        fakeBet,
        user,
        requestPacket: packet,
        setObj,
        betOrg: fakeBet.betOrg,
        betFake: fakeBet.betFake,
        limits: betLimits,
      })

      for (const [spot, value] of Object.entries(incOrgChips)) {
        totalIncOrgChips[spot] = (totalIncOrgChips[spot] ?? 0) + value
      }
      for (const [spot, value] of Object.entries(incFakeChips)) {
        totalIncFakeChips[spot] = (totalIncFakeChips[spot] ?? 0) + value
      }
    }

    console.log(`update bet action ${username} ${summaryId} ${JSON.stringify(totalIncOrgChips)}`)

    // await updateBetAction(mongoDB, fakeBet, totalIncOrgChips, totalIncFakeChips, setObj)
    fakeBetSetObj = {
      calculatedOrg: fakeBet.betOrg,
      calculatedFake: fakeBet.betFake,
    }
  }

  for (const spot of Object.keys(currentChips)) {
    const currentChip = currentChips[spot]
    const acceptedBet = fakeBet.betOrg[spot] ?? 0
    if (currentChip !== acceptedBet) {
      console.log(`timeout bet ${username} ${summaryId} ${spot} currentChip ${currentChip} acceptedBet ${acceptedBet}`)
      rejectedBets[spot] = { amount: currentChip - acceptedBet, error: EvolutionBettingErrorCode.TimoutBetError }
    }
  }

  mongoDB.fakeBetData
    .updateOne(
      {
        _id: fakeBet._id,
      } as Partial<FakeBetData>,
      {
        $set: {
          updatedAt: new Date(),
          summaryId,
          vendorRoundId: roundId,
          ...fakeBetSetObj,
        } as Partial<FakeBetData>,
      },
    )
    .catch((err) => {
      console.log(errorToString(err))
    })

  const feeInfo = getFeeInfo(tableId)

  const betAccepted: Record<string, number> = {}

  let totalAmount = 0
  for (const spot of Object.keys(fakeBet.betOrg)) {
    const orgChip = fakeBet.betOrg[spot]
    const rejectedBet = rejectedBets[spot]
    if (orgChip < betLimits?.[spot]?.min) {
      delete fakeBet.betOrg[spot]
      delete fakeBet.betFake[spot]
      rejectedBets[spot] = { amount: orgChip + rejectedBet?.amount, error: EvolutionBettingErrorCode.TableMinError }
    } else if (betLimits?.[spot].max < orgChip) {
      delete fakeBet.betOrg[spot]
      delete fakeBet.betFake[spot]
      rejectedBets[spot] = { amount: orgChip + rejectedBet?.amount, error: EvolutionBettingErrorCode.TableMaxError }
    } else {
      totalAmount += orgChip
      betAccepted[spot] = orgChip
      acceptedBets[spot] = { amount: orgChip, payoff: 0, limited: false }
      if (feeInfo != null) {
        const fee = fakeBet.betOrg[spot] * feeInfo.rate
        betAccepted[spot + feeInfo.name] = fee
        acceptedBets[spot + feeInfo.name] = { amount: fee, payoff: 0, limited: false }
        totalAmount += fee
      }
    }
  }

  if (totalAmount <= 0) {
    // 위에서 칩이 삭제될 수도 있으니깐 여기서 한번 베팅금액이 있는지 확인한다.
    return {
      status: CommonReturnType.EvolutionBetMoneyZero,
      rejectedBets,
      acceptedBets,
      summaryId,
    }
  }

  console.log(`try_fake_bet_2 ${username} ${JSON.stringify(fakeBet)}`)

  const res = await casinoManager.singleBet({
    info: {
      agent,
      user,
      vendor,
      gameId: tableId,
      roundId,
      tableId,
      betTime: fakeBet.betTime,
      additional: {
        betOrg: fakeBet.betOrg,
        betFake: fakeBet.betFake,
        betAccepted,
        // fakeAmountBet: -amountFakeBet,
        isFakeVendor: true,
        fakeRoundId: fakeBet.roundId,
        isFakeBet: true,
      },
    },
    transId,
    betId: transId,
    incAmount: -totalAmount,
    packet: body,
  })

  return {
    ...res,
    totalAmount,
    rejectedBets,
    acceptedBets,
    currentChips: betAccepted,
  }
}
