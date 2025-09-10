import { evolutionTableInfos } from '@service/src/lib/common/data/evolution-tables'
import { mainSQL, mongoDB, vendorCode } from '../app'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { type OddsTableOptions, makeOddsTable, makeParticipants } from '../../common/settle'
import { type SocketData } from './socket-data'
import { type TableData } from './table-data'
import { type AcceptedBets, type BaccaratGameData, type GameStatePacket } from '../../common/fake-packet-types'
import { getFeeInfo, isLightningTable } from '../../common/fake-util'
import { addMinutes } from 'date-fns'
import { randomNumberString, sleep } from '../../common/util'

const gameResults: Record<string, GameStatePacket> = {}

export function updateGameResult(gameState: GameStatePacket) {
  const key = gameState.args.tableId + '-' + gameState.args.gameId
  if (gameResults[key] == null && gameState.args.dealing === 'Finished') {
    gameResults[key] = gameState
  }
}

// 게임결과가 나올 때 까지 기다린다.
export async function waitGameResult(username: string, tableId: string, roundId: string): Promise<OddsTableOptions> {
  console.log(`waitGameResult ${username} ${tableId} ${roundId}`)
  const key = tableId + '-' + roundId
  for (let i = 0; i < 3; i++) {
    const gameResult = gameResults[key]
    if (gameResult != null) {
      return gameResult.args.gameData
    }

    await sleep(100)
  }
  // 그래도 안오면 마지막으로 몽고db 확인한다.
  const gameData = await mongoDB.fakeGameData.findOne({
    where: {
      tableId,
      gameId: roundId,
    },
  })
  if (gameData == null) {
    return null
  }

  const { dealing } = gameData
  if (dealing === 'Cancelled' || dealing === 'Finished') {
    return gameData
  }

  return null
}

export function deleteOldGameResult() {
  const minuteAgo = addMinutes(new Date(), -10)

  for (const [key, gameResult] of Object.entries(gameResults)) {
    if (gameResults == null || gameResult.time < minuteAgo.getTime()) {
      delete gameResults[key]
    }
  }
}

export function needCalcOddsTable(acceptedBets: AcceptedBets = {}, betOrg: Record<string, number>) {
  for (const spot in betOrg) {
    const amount = betOrg[spot] ?? 0
    if (amount === 0) {
      continue
    }

    const acceptedBet = acceptedBets[spot]

    if (acceptedBet == null) {
      return true
    }
  }

  return false
}

export function changeAcceptedBet(
  tableId: string,
  acceptedBets: AcceptedBets = {},
  betOrg: Record<string, number>,
  gameResult?: OddsTableOptions,
) {
  const feeInfo = getFeeInfo(tableId)

  const resultOddsTable: Record<string, number> = gameResult != null ? makeOddsTable(tableId, gameResult) : {}

  const newAcceptedBets: AcceptedBets = {}
  for (const spot in betOrg) {
    const amount = betOrg[spot] ?? 0
    if (amount === 0) {
      continue
    }

    const acceptedBet = acceptedBets[spot]

    if (acceptedBet != null) {
      const multiply = acceptedBet.payoff / acceptedBet.amount
      newAcceptedBets[spot] = {
        amount,
        payoff: amount * multiply,
        limited: acceptedBet.limited,
      }
    } else {
      newAcceptedBets[spot] = {
        amount,
        payoff: amount * (resultOddsTable[spot] ?? 0),
        limited: false,
      }
    }
    if (feeInfo != null) {
      const feeSpot = spot + feeInfo.name

      const feeBet = acceptedBets[feeSpot]
      const feeAmount = amount * feeInfo.rate
      if (feeBet != null) {
        const multiply = feeBet.payoff / feeBet.amount
        newAcceptedBets[feeSpot] = {
          amount: feeAmount,
          payoff: feeAmount * multiply,
          limited: false,
        }
      } else {
        newAcceptedBets[feeSpot] = {
          amount: feeAmount,
          payoff: 0,
          limited: false,
        }
      }
    }
  }

  return newAcceptedBets
}

export function changeAcceptedBetMultiplier(
  { tableId }: TableData,
  betOrg: Record<string, number>,
  multiplier: number,
) {
  const feeInfo = getFeeInfo(tableId)

  const newAcceptedBets: AcceptedBets = {}
  for (const spot in betOrg) {
    const amount = betOrg[spot] ?? 0
    if (amount === 0) {
      continue
    }

    newAcceptedBets[spot] = {
      amount,
      payoff: amount * multiplier,
      limited: false,
    }
    if (feeInfo != null) {
      newAcceptedBets[spot + feeInfo.name] = {
        amount: amount * feeInfo.rate,
        // 라이트닝 피에도 곱해줘야 환불할 때 라이트닝 피도 환불이 된다.
        payoff: amount * feeInfo.rate * multiplier,
        limited: false,
      }
    }
  }

  return newAcceptedBets
}

export async function fakeSettle(
  acceptedBets: AcceptedBets,
  vendorRoundId: string,
  { user }: SocketData,
  tableData: TableData,
) {
  const { tableId } = tableData

  const { agentCode, userId } = user

  const username = agentCode + userId

  let totalWinMoney = 0
  for (const spot in acceptedBets ?? {}) {
    totalWinMoney += acceptedBets[spot].payoff
  }

  console.log(`fake settlement ${username} tableId ${tableId} round ${vendorRoundId} totalWinMoney ${totalWinMoney}`)

  if (Number.isNaN(totalWinMoney)) {
    console.log(`settlement NaN ${username}`)
    tableData.safeResolveTotalWinMoney(0)
    return
  } else {
    tableData.safeResolveTotalWinMoney(totalWinMoney)
  }

  await mainSQL.repos.user.update(
    {
      agentCode: agentCode,
      userId: userId,
    },
    {
      lockedBalance: () => `lockedBalance + ${totalWinMoney}`,
    },
  )

  user.balance += totalWinMoney
}

export async function settle(
  packet: unknown,
  acceptedBets: AcceptedBets,
  vendorRoundId: string,
  { user, agent, casinoManager }: SocketData,
  tableData: TableData,
) {
  const { tableId } = tableData

  const { agentCode, userId } = user

  const username = agentCode + userId

  let totalWinMoney = 0
  for (const spot in acceptedBets ?? {}) {
    totalWinMoney += acceptedBets[spot].payoff
  }

  console.log(`settlement ${username} tableId ${tableId} round ${vendorRoundId} totalWinMoney ${totalWinMoney}`)

  if (Number.isNaN(totalWinMoney)) {
    console.log(`settlement NaN ${username}`)
    tableData.safeResolveTotalWinMoney(0)
    return packet
  } else {
    tableData.safeResolveTotalWinMoney(totalWinMoney)
  }

  const settleRes = await casinoManager.betSettlement({
    info: {
      agent,
      user,
      vendor: vendorCode,
      gameId: tableId,
      roundId: vendorRoundId,
      tableId,
    },
    transId: username + '-' + tableId + '-s' + vendorRoundId,
    incAmount: totalWinMoney,
    packet,
  })

  if (settleRes.balance != null) {
    user.balance = settleRes.balance
  }

  console.log(JSON.stringify(settleRes))

  if (settleRes.status === CommonReturnType.Success) {
    const tableInfo = evolutionTableInfos[tableId]

    const participant = makeParticipants(username, acceptedBets)

    console.log(`makeParticipants ${username} ${JSON.stringify(participant)}`)

    casinoManager
      .getBetDataCol()
      .updateOne(
        {
          vendor: vendorCode,
          userId,
          agentCode,
          roundId: vendorRoundId,
        },
        {
          $set: {
            tableName: tableInfo?.name,
            betSettled: acceptedBets,
            'content.participants': [participant],
          },
        },
      )
      .then((result) => {
        console.log(`makeParticipants result ${username} ${JSON.stringify(result)}`)
      })
      .catch((err) => {
        console.log(`makeParticipants error ${username} ${err.toString()}`)
      })
  }
}

export function makeContentResult(tableId: string, gameData: BaccaratGameData) {
  const { playerHand, bankerHand, lightningMultipliers, result } = gameData

  const outcome = result.winner

  const resultObj = {
    player: playerHand,
    banker: bankerHand,
    outcome,
  }

  if (isLightningTable(tableId)) {
    const multiplierCards = {}
    lightningMultipliers.map((value) => (multiplierCards[value.card] = value.value))

    const multiplierCodes = {
      BAC_Banker: 1,
      BAC_BankerPair: 1,
      BAC_Player: 1,
      BAC_PlayerPair: 1,
      BAC_Tie: 1,
    }

    for (const lightningCard of lightningMultipliers) {
      for (const playerHandCard of playerHand.cards) {
        if (playerHandCard === lightningCard.card) {
          multiplierCodes.BAC_Player *= lightningCard.value
          multiplierCodes.BAC_PlayerPair *= lightningCard.value
          multiplierCodes.BAC_Tie *= lightningCard.value
        }
      }
      for (const bankerHandCard of bankerHand.cards) {
        if (bankerHandCard === lightningCard.card) {
          multiplierCodes.BAC_Banker *= lightningCard.value
          multiplierCodes.BAC_BankerPair *= lightningCard.value
          multiplierCodes.BAC_Tie *= lightningCard.value
        }
      }
    }

    Object.assign(resultObj, {
      multipliers: {
        betCodes: multiplierCodes,
        cards: multiplierCards,
      },
    })
  }

  return {
    ...resultObj,
    result: {
      ...resultObj,
    },
  }
}

export function makePacketId(timestamp: number) {
  return timestamp + '-' + randomNumberString(4)
}
