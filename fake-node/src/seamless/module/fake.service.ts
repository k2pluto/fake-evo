import { MINUTE_MS, errorToString } from '../../common/util'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { mainSQL } from '../app'

import { type GameStatePacket } from '../../common/fake-packet-types'
import { type FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'
import { type SaveBetType, processBetAction } from '../../common/bet-action'
import { type TransactionResult } from '@service/src/lib/common/game/save-transaction'
import { getFeeInfo } from '../../common/fake-util'
import { type User } from '@service/src/lib/interface/sql/user'
import { type Agent } from '@service/src/lib/interface/sql/agent'
import { type BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { type MongoBet } from '@service/src/lib/interface/mongo'
import { type AuthManager } from '@service/src/lib/common/game/auth-manager'
import { type TransactionManager } from '@service/src/lib/common/game/transaction-manager'

export async function fakeBet({
  authManager,
  casinoManager,
  mongoDB,
  user,
  agent,
  vendor,
  gameId,
  vendorRoundId,
  transId,
  betId,
  amountFakeBet,
  equalRoundId,
  packet,
}: {
  authManager: AuthManager
  casinoManager: TransactionManager
  mongoDB: MongoBet
  user: User
  agent: Agent
  vendor: string
  gameId: string
  vendorRoundId: string
  transId: string
  betId: string
  amountFakeBet: number
  equalRoundId: boolean
  packet: unknown
}): Promise<TransactionResult> {
  const summaryId = vendor + '-' + gameId + '-' + vendorRoundId

  const { agentCode, userId } = user

  const username = agentCode + userId

  console.log(`fake_bet_start ${username} ${gameId} ${summaryId} ${user.fakeMode}`)

  if (user.fakeMode) {
    let betRes: TransactionResult

    const fakeBet = await (equalRoundId
      ? mongoDB.fakeBetData.findOne({
          where: {
            vendor,
            userId,
            agentCode,
            tableId: gameId,
            roundId: vendorRoundId,
          },
        })
      : mongoDB.fakeBetData.findOne({
          where: {
            vendor,
            userId,
            agentCode,
            tableId: gameId,
            summaryId: null,
          },
          order: {
            betTime: -1,
          },
        }))

    if (fakeBet != null) {
      console.log(`fake_bet_2 ${username} ${JSON.stringify(fakeBet)}`)

      const MINUTE_2 = MINUTE_MS * 2

      if (new Date().getTime() - fakeBet.betTime.getTime() > MINUTE_2) {
        // 페이크 데이터가 있는데 베팅 시간이 너무 오래 지났으면 에러를 리턴한다.
        return {
          status: CommonReturnType.InternalServerError,
          summaryId,
        }
      }

      const gameData = await mongoDB.fakeGameData.findOne({
        where: {
          gameId: fakeBet.roundId,
          tableId: gameId,
        },
      })
      const { dealing } = gameData ?? {}
      if (dealing === 'Finished') {
        // Idle과 Lightning 이 아닌걸로 판단하기에는 바카라 A 같은 경우에는 Dealing과 Revealing 이 Idle 다음에 시간차 없이 바로 들어오기 때문에 판단이 어렵다.
        // 베팅 받는 시간이 끝났는데 베팅할려고 하면 벤더사에서 패킷을 늦게 준 것이므로 그냥 에러를 리턴한다.
        console.log(`fake_bet game is not idle and lightning`, username, summaryId)
        return {
          status: CommonReturnType.InternalServerError,
          summaryId,
        }
      }

      const { betLimits } = fakeBet

      // 만약 처리 안된 베팅이 있으면 처음부터 다시 betOrg 를 생성한다.
      // 처음에만 처리되고 중간에 재접속했을 때 중간에 처리안된 패킷들이 있기 때문이다.
      let unproceedPacket = false

      for (const unknownBet of Object.values(fakeBet.saveBet)) {
        const bet: any = unknownBet
        if (bet.proceed !== true) {
          unproceedPacket = true
        }
      }

      let fakeBetSetObj = {}

      try {
        if (fakeBet.betOrg == null || unproceedPacket) {
          const setObj: Partial<FakeBetData> = {}

          console.log(`create betOrg ${username} ${summaryId}`)

          let betClosedTimestamp: number = null
          for (const id in gameData?.packet ?? {}) {
            const packet = gameData.packet[id] as GameStatePacket
            if (packet == null) {
              continue
            }

            if (packet.args?.betting === 'BetsClosed') {
              betClosedTimestamp = packet.time
              break
            }
          }

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

            if (betClosedTimestamp != null && packet.args.timestamp > betClosedTimestamp) {
              console.log(
                `skip after closed bet ${username} ${summaryId} ${packet.args.timestamp} > ${betClosedTimestamp}`,
              )
              continue
            }

            const { incOrgChips, incFakeChips } = await processBetAction({
              mongoDB,
              fakeBet,
              user,
              vendor,
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
      } catch (err) {
        console.log(errorToString(err))
        return {
          status: CommonReturnType.InternalServerError,
          summaryId,
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
              vendorRoundId,
              ...fakeBetSetObj,
            } as Partial<FakeBetData>,
          },
        )
        .catch((err) => {
          console.log(err)
        })

      const feeInfo = getFeeInfo(gameId)

      const betAccepted: Record<string, number> = {}

      let betAmount = 0
      for (const spot of Object.keys(fakeBet.betOrg)) {
        const orgChip = fakeBet.betOrg[spot]
        if (orgChip < betLimits?.[spot]?.min) {
          delete fakeBet.betOrg[spot]
          delete fakeBet.betFake[spot]
        } else {
          betAmount += orgChip
          betAccepted[spot] = orgChip
          if (feeInfo != null) {
            const fee = fakeBet.betOrg[spot] * feeInfo.rate
            betAccepted[spot + feeInfo.name] = fee
            betAmount += fee
          }
        }
      }

      if (betAmount <= 0) {
        // 위에서 칩이 삭제될 수도 있으니깐 여기서 한번 베팅금액이 있는지 확인한다.
        return {
          status: CommonReturnType.InternalServerError,
          summaryId,
        }
      }

      betRes = await casinoManager.singleBet({
        info: {
          agent,
          user,
          vendor,
          gameId,
          roundId: vendorRoundId,
          tableId: gameId,
          betTime: fakeBet.betTime,
          additional: {
            betOrg: fakeBet.betOrg,
            betFake: fakeBet.betFake,
            betAccepted,
            fakeAmountBet: -amountFakeBet,
            isFakeVendor: true,
            fakeRoundId: fakeBet.roundId,
            isFakeBet: true,
          },
        },
        transId,
        betId,
        incAmount: -betAmount,
        packet,
      })
    } else {
      console.log('fake_bet_4', username)

      // 없으면 일반 베팅
      betRes = await casinoManager.singleBet({
        info: {
          agent,
          user,
          vendor,
          gameId,
          roundId: vendorRoundId,
          tableId: gameId,
          additional: {
            isFakeVendor: true,
          },
        },
        transId,
        betId,
        incAmount: amountFakeBet,
        packet,
      })
    }

    console.log(`fake_bet_res3`, username, JSON.stringify(betRes))

    if (betRes.balance == null) {
      const { agentCode, userId } = user
      const balanceRes = await authManager.balance(agentCode, userId)
      betRes.balance = balanceRes.balance
    }

    let updatedFakeBalance = user.fakeBalance + amountFakeBet
    if (betRes.status === CommonReturnType.Success) {
      // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
      if (updatedFakeBalance < betRes.balance && updatedFakeBalance < 3_000_000) {
        mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: betRes.balance }).catch((err) => {
          console.log(err)
        })
        updatedFakeBalance = betRes.balance
      } else {
        // 베팅이 성공했고 페이크 밸런스가 충분히 크면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
        mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountFakeBet).catch((err) => {
          console.log(err)
        })
      }
    }

    betRes.balance = updatedFakeBalance
    betRes.beforeBalance = user.fakeBalance

    return betRes
  }
  const res = await casinoManager.singleBet({
    info: {
      agent,
      user,
      vendor,
      gameId,
      roundId: vendorRoundId,
      tableId: gameId,
      additional: {
        isFakeVendor: true,
      },
    },
    transId,
    betId,
    incAmount: amountFakeBet,
    packet,
  })

  console.log(`fake_bet_res4`, username, JSON.stringify(res))

  if (res.balance == null) {
    const { agentCode, userId } = user
    const balanceRes = await authManager.balance(agentCode, userId)
    res.balance = balanceRes.balance
    if (res.status === CommonReturnType.Success) {
      res.beforeBalance = balanceRes.balance - amountFakeBet
    }
  }

  return res
}

export async function fakeSettle({
  mongoDB,
  authManager,
  casinoManager,
  user,
  agent,
  vendor,
  gameId,
  vendorRoundId,
  transId,
  betId,
  amountFakeWin,
  packet,
}: {
  authManager: AuthManager
  casinoManager: TransactionManager
  mongoDB: MongoBet
  user: User
  agent: Agent
  vendor: string
  gameId: string
  vendorRoundId: string
  transId: string
  betId: string
  amountFakeWin: number
  packet: unknown
}): Promise<TransactionResult> {
  const summaryId = vendor + '-' + gameId + '-' + vendorRoundId
  const { agentCode, userId } = user

  const username = agentCode + userId

  console.log(`fake_settle_start ${username} ${gameId} ${summaryId}`)

  if (user.fakeMode) {
    const fakeBet = await mongoDB.fakeBetData.findOne({
      where: {
        summaryId,
        userId,
        agentCode,
      },
    })

    let res: TransactionResult

    if (fakeBet != null) {
      await mongoDB.betDataCasino.updateOne(
        {
          summaryId,
          agentCode,
          userId,
          vendor,
        },
        {
          $set: {
            fakeAmountWin: amountFakeWin,
          } as Partial<BetData>,
        },
      )

      res = {
        status: CommonReturnType.Success,
        summaryId,
      }
    } else {
      // betOrg가 없을때만 일반적인 마감처리를 하고 페이크 베팅은 따로 fake-resolver 서버에 맞긴다.
      res = await casinoManager.betSettlement({
        info: {
          agent,
          user,
          vendor,
          gameId,
          roundId: vendorRoundId,
          tableId: gameId,
        },
        transId,
        betId,
        incAmount: amountFakeWin,
        allowAdditionalSettle: true,
        packet,
      })
    }

    const updatedFakeBalance = user.fakeBalance + amountFakeWin

    res.balance = updatedFakeBalance
    res.beforeBalance = user.fakeBalance

    if (res.status === CommonReturnType.Success) {
      // 마감이 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
      mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountFakeWin).catch((err) => {
        console.log(err)
      })
    }
    console.log(`fake_settle_res1`, JSON.stringify(res), updatedFakeBalance)

    return res
  }

  const res = await casinoManager.betSettlement({
    info: {
      agent,
      user,
      vendor,
      gameId,
      roundId: vendorRoundId,
      tableId: gameId,
    },
    transId,
    betId,
    incAmount: amountFakeWin,
    allowAdditionalSettle: true,
    packet,
  })

  console.log(`fake_settle_res2`, JSON.stringify(res))
  if (res.balance == null) {
    const { agentCode, userId } = user
    const balanceRes = await authManager.balance(agentCode, userId)
    res.balance = balanceRes.balance
    if (res.status === CommonReturnType.Success) {
      res.beforeBalance = balanceRes.balance - amountFakeWin
    }
  }

  return res
}

export async function fakeCancel({
  mongoDB,
  casinoManager,
  user,
  agent,
  vendor,
  gameId,
  vendorRoundId,
  transId,
  orgTransId,
  amountFakeCancel,
  packet,
}: {
  casinoManager: TransactionManager
  mongoDB: MongoBet
  user: User
  agent: Agent
  vendor: string
  gameId: string
  vendorRoundId: string
  transId: string
  orgTransId: string
  amountFakeCancel: number
  packet: unknown
}): Promise<TransactionResult> {
  const summaryId = vendor + '-' + gameId + '-' + vendorRoundId
  const { agentCode, userId } = user

  const username = agentCode + userId

  console.log(`fake_refund_start ${username} ${gameId} ${summaryId}`)

  const betData = await mongoDB.betDataCasino.findOne({
    where: {
      summaryId,
      agentCode,
      userId,
      vendor,
    },
  })

  let res: TransactionResult
  if (betData?.isFakeBet) {
    res = {
      status: CommonReturnType.Success,
      summaryId,
    }
  } else {
    res = await casinoManager.betCancel({
      info: {
        agent,
        user,
        vendor,
        gameId,
        roundId: vendorRoundId,
        tableId: gameId,
      },
      transId,
      orgTransId,
      incAmount: amountFakeCancel,
      packet,
    })
  }

  console.log(`fake_refund_res ${username} ${res.status}`)

  if (user.fakeMode) {
    const updatedFakeBalance = user.fakeBalance + amountFakeCancel

    res.balance = updatedFakeBalance
    res.beforeBalance = user.fakeBalance

    // 취소가 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
    if (res.status === CommonReturnType.Success) {
      mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountFakeCancel).catch((err) => {
        console.log(err)
      })
    }
  }

  console.log(`fake_refund_success ${username} ${res.balance}`)

  return res
}
