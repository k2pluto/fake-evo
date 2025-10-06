import { type BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import {
  type BaccaratHand,
  type BaccaratResult,
  type DealingStateType,
  type FakeGameData,
  type LightningMultiplier,
} from '@service/src/lib/interface/mongo/fake-game-data'

import { type MongoBet } from '@service/src/lib/interface/mongo'
import { type FakeTableData } from '@service/src/lib/interface/mongo/fake-table-data'
import { type AuthManager } from '@service/src/lib/common/game/auth-manager'
import { type CasinoTransactionManager } from '@service/src/lib/common/game/transaction-manager'
import { type BetDataCasino } from '@service/src/lib/interface/mongo/data-bet-data-casino'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { evolutionTableInfos } from '@service/src/lib/common/data/evolution-tables'

import { isLightningTable } from '../common/fake-util'
import { errorToString, sleep } from './util'

const calcBonusOdds = (diffScore: number, natural: boolean) => {
  // 무승부(Tie)는 Natural이든 Non-Natural이든 푸시(1배 환불)
  if (diffScore === 0) return 1

  if (natural) {
    // 네추럴 승리면 2배
    if (diffScore > 0) return 2
  } else {
    // Non-Natural 승리
    switch (diffScore) {
      case 4:
        return 2
      case 5:
        return 3
      case 6:
        return 5
      case 7:
        return 7
      case 8:
        return 11
      case 9:
        return 31
    }
  }

  return 0
}

const calcMainOdds = (playerHand: BaccaratHand, bankerHand: BaccaratHand, noCommission: boolean) => {
  if (playerHand.score > bankerHand.score) {
    // 플레이어 승
    return {
      Player: 2,
      Banker: 0,
      Tie: 0,
    }
  } else if (playerHand.score < bankerHand.score) {
    // 뱅커 승
    if (noCommission) {
      if (bankerHand.score === 6) {
        return {
          Player: 0,
          Banker: 1.5,
          Tie: 0,
        }
      } else {
        return {
          Player: 0,
          Banker: 2,
          Tie: 0,
        }
      }
    } else {
      return {
        Player: 0,
        Banker: 1.95,
        Tie: 0,
      }
    }
  } else {
    // 타이
    return {
      Player: 1,
      Banker: 1,
      Tie: 9,
    }
  }
}

export const calcResultOdds = (playerHand: BaccaratHand, bankerHand: BaccaratHand, noCommission: boolean) => {
  const { Player, Banker, Tie } = calcMainOdds(playerHand, bankerHand, noCommission)

  const isPlayerPair = playerHand.cards.length > 0 && playerHand.cards[0].charAt(0) === playerHand.cards[1].charAt(0)

  const isPlayerPerfactPair = playerHand.cards.length > 0 && playerHand.cards[0] === playerHand.cards[1]

  const isBankerPair = bankerHand.cards.length > 0 && bankerHand.cards[0].charAt(0) === bankerHand.cards[1].charAt(0)

  const isBankerPerfactPair = bankerHand.cards.length > 0 && bankerHand.cards[0] === bankerHand.cards[1]

  const EitherPair = isPlayerPair || isBankerPair ? 6 : 0

  const PerfectPair =
    isPlayerPerfactPair || isBankerPerfactPair ? (isPlayerPerfactPair && isBankerPerfactPair ? 201 : 26) : 0

  // 노 커미션 바카라에 있는 룰
  const SuperSix = bankerHand.score === 6 ? 16 : 0

  // 에볼루션에서 넘어오는 natural은 natural tie 일 때 false 로 넘어와서 이렇게 직접 계산함
  const natural =
    playerHand.cards.length === 2 && bankerHand.cards.length === 2 && (playerHand.score >= 8 || bankerHand.score >= 8)

  const PlayerBonus = calcBonusOdds(playerHand.score - bankerHand.score, natural)

  const BankerBonus = calcBonusOdds(bankerHand.score - playerHand.score, natural)

  return {
    Player,
    Banker,
    Tie,
    SuperSix,
    PlayerPair: isPlayerPair ? 12 : 0,
    BankerPair: isBankerPair ? 12 : 0,
    EitherPair,
    PerfectPair,
    PlayerBonus,
    BankerBonus,
  }
}

const calcLightningMainOdds = (playerHand: BaccaratHand, bankerHand: BaccaratHand) => {
  if (playerHand.score > bankerHand.score) {
    // 플레이어 승
    return {
      Player: 2,
      Banker: 0,
      Tie: 0,
    }
  } else if (playerHand.score < bankerHand.score) {
    // 뱅커 승
    return {
      Player: 0,
      Banker: 1.95,
      Tie: 0,
    }
  } else {
    // 타이
    return {
      Player: 1,
      Banker: 1,
      Tie: 6,
    }
  }
}

const calcLightningMultipleOdds = (odds: number, multiple?: number) => {
  if (odds > 1) {
    return (odds - 1) * multiple + 1
  }
  return odds
}

// 뱅커만 0.95를 더한다.
const calcLightningMultipleBankerOdds = (odds: number, multiple?: number) => {
  if (odds > 1) {
    return multiple + 0.95
  }

  return odds
}

export const calcLightningOdds = (
  playerHand: BaccaratHand,
  bankerHand: BaccaratHand,
  lightningMultipliers: LightningMultiplier[],
) => {
  const { Player, Banker, Tie } = calcLightningMainOdds(playerHand, bankerHand)

  const PlayerPair =
    playerHand.cards.length > 0 && playerHand.cards[0].charAt(0) === playerHand.cards[1].charAt(0) ? 10 : 0

  const BankerPair =
    bankerHand.cards.length > 0 && bankerHand.cards[0].charAt(0) === bankerHand.cards[1].charAt(0) ? 10 : 0

  const multipliers = {
    Banker: 1,
    BankerPair: 1,
    Player: 1,
    PlayerPair: 1,
    Tie: 1,
  }

  for (const lightningCard of lightningMultipliers) {
    for (const playerHandCard of playerHand.cards) {
      if (playerHandCard === lightningCard.card) {
        multipliers.Player *= lightningCard.value
        multipliers.PlayerPair *= lightningCard.value
        multipliers.Tie *= lightningCard.value
      }
    }
    for (const bankerHandCard of bankerHand.cards) {
      if (bankerHandCard === lightningCard.card) {
        multipliers.Banker *= lightningCard.value
        multipliers.BankerPair *= lightningCard.value
        multipliers.Tie *= lightningCard.value
      }
    }
  }

  return {
    Player: calcLightningMultipleOdds(Player, multipliers.Player),
    Banker: calcLightningMultipleBankerOdds(Banker, multipliers.Banker),
    Tie: calcLightningMultipleOdds(Tie, multipliers.Tie),
    PlayerPair: calcLightningMultipleOdds(PlayerPair, multipliers.PlayerPair),
    BankerPair: calcLightningMultipleOdds(BankerPair, multipliers.BankerPair),
  }
}

export function makeParticipants(username: string, bets: Record<string, { amount: number; payoff: number }>) {
  const now = new Date()

  const historyBets = []
  for (const spot in bets ?? {}) {
    const bet = bets[spot]

    historyBets.push({
      balanceId: 'combined',
      code: `BAC_${spot.replace('Lightning', '_Lightning').replace('Fee', '_Fee')}`,
      stake: bet.amount,
      payout: bet.payoff,
      placedOn: now,
      description: spot.replace('Lightning', ' Lightning').replace('Fee', ' Fee'),
      transactionId: '667294062938749568',
      vg_bet_trans_id: '344080012109878489',
      vg_result_trans_id: '344110013102331916',
    })
  }

  return {
    casinoId: 'babyloasd',
    playerId: username,
    screenName: username,
    playerGameId: '172524716bfd20220-qqyj64dl22bctbedv',
    sessionId: 'qqyj64dl2bctbedv23qmd7rpgafce23848',
    casinoSessionId:
      'eyJrZXkiOjEyODY5NywiaWQiOiJiYmNtYXgx222NDQ0Iiwib3AiOjI4MiwiYyI6IjEiLCJnIjoidG9wX2dhbWVzIiwiZHQiOjE2Njc3NzUxMTc3NzV9',
    currency: 'KRW',
    currencySymbol: '₩',
    bets: historyBets,
    configOverlays: [],
    playMode: 'RealMoney',
    channel: 'desktop',
    os: 'Windows',
    device: 'Desktop',
    skinId: '1',
    brandId: '1',
    vg_round_id: '344080012109878458',
  }
}

export interface ManualSettleGameData {
  tableId: string
  dealing: DealingStateType
  result: BaccaratResult
  playerHand: BaccaratHand
  bankerHand: BaccaratHand
  lightningMultipliers?: LightningMultiplier[]
  redEnvelopePayouts?: { [key: string]: number }
  winningSpots?: string[]
}

async function manualSettleBet(
  authManager: AuthManager,
  casinoManager: CasinoTransactionManager,
  resultOddsTable: Record<string, number>,
  bet: BetData,
  gameData: ManualSettleGameData,
) {
  try {
    let totalWinMoney = 0

    const bets: Record<string, { amount: number; payoff: number }> = {}

    console.log('💰 [manualSettleBet] Starting settlement:', JSON.stringify({
      username: bet.agentCode + bet.userId,
      betAccepted: bet.betAccepted,
      resultOddsTable,
      gameData: {
        playerHand: gameData.playerHand,
        bankerHand: gameData.bankerHand,
        result: gameData.result,
        winningSpots: gameData.winningSpots,
      },
    }))

    for (const spot in bet.betAccepted ?? {}) {
      const betMoney = bet.betAccepted[spot]

      const winMoney = gameData.dealing === 'Cancelled' ? betMoney : betMoney * (resultOddsTable[spot] ?? 0)
      totalWinMoney += winMoney

      console.log(`  💵 [manualSettleBet] ${spot}: ${betMoney} × ${resultOddsTable[spot] ?? 0} = ${winMoney}`)

      bets[spot] = {
        amount: betMoney,
        payoff: winMoney,
      }
    }

    console.log(`💰 [manualSettleBet] Total win: ${totalWinMoney}`)

    const { agent, user } = await authManager.checkAuth(bet.agentCode + bet.userId)

    const { roundId, tableId } = bet

    const summaryId = bet.summaryId

    const username = bet.agentCode + bet.userId

    console.log(
      `manual settle bet username ${username} summaryId ${summaryId} betMoney ${bet.amountBet} winMoney ${totalWinMoney}`,
    )
    const { result: gameResult, playerHand, bankerHand } = gameData

    let transRes = await casinoManager.betSettlement({
      info: {
        agent,
        user,
        vendor: bet.vendor,
        gameId: bet.gameId,
        roundId: bet.roundId,
        tableId: bet.tableId,
      },
      transId: username + '-' + tableId + '-s-' + roundId,
      incAmount: totalWinMoney,
      packet: {
        gameResult,
        playerHand,
        bankerHand,
      },
    })
    if (transRes.status === CommonReturnType.DatabaseError) {
      //DB Error가 나면 10초 후에 다른 transId 로 한번 더 시도한다.
      await sleep(10_000)
      transRes = await casinoManager.betSettlement({
        info: {
          agent,
          user,
          vendor: bet.vendor,
          gameId: bet.gameId,
          roundId: bet.roundId,
          tableId: bet.tableId,
        },
        transId: username + '-' + tableId + '-s2-' + roundId,
        incAmount: totalWinMoney,
        packet: {
          gameResult,
          playerHand,
          bankerHand,
        },
      })
    }

    const participant = makeParticipants(username, bets)

    const outcome = gameData.dealing === 'Cancelled' ? 'None' : gameResult.winner
    const result = {
      player: playerHand,
      banker: bankerHand,
      outcome,
      ...gameData.lightningMultipliers,
      ...(gameData.redEnvelopePayouts != null && { redEnvelopePayouts: gameData.redEnvelopePayouts }),
    }

    if (isLightningTable(tableId)) {
      const multiplierCards = {}
      gameData.lightningMultipliers?.map((value) => (multiplierCards[value.card] = value.value))

      const multiplierCodes = {
        BAC_Banker: 1,
        BAC_BankerPair: 1,
        BAC_Player: 1,
        BAC_PlayerPair: 1,
        BAC_Tie: 1,
      }

      for (const lightningCard of gameData.lightningMultipliers) {
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

      Object.assign(result, {
        multipliers: {
          betCodes: multiplierCodes,
          cards: multiplierCards,
        },
      })
    }

    const tableName = evolutionTableInfos[tableId]

    await casinoManager.getBetDataCol().updateOne(
      {
        vendor: bet.vendor,
        userId: user.userId,
        agentCode: user.agentCode,
        summaryId,
      },
      {
        $set: {
          tableName: tableName?.name,
          content: {
            participants: [participant],
            result: {
              ...result,
              result: {
                ...result,
              },
            },
          },
        },
      },
    )

    console.log(`manual settle bet username ${username} complete`, JSON.stringify({ result, participant, transRes }))

    return transRes
  } catch (err) {
    console.log(errorToString(err))
  }
}

export interface OddsTableOptions {
  // tableId: string
  // dealing: string
  playerHand: BaccaratHand
  bankerHand: BaccaratHand
  lightningMultipliers?: LightningMultiplier[]
  redEnvelopePayouts?: Record<string, number>
  winningSpots?: string[]
}

export function makeOddsTable(tableId: string, options: OddsTableOptions) {
  const { playerHand, bankerHand, lightningMultipliers, winningSpots } = options

  const noCommission =
    tableId === 'ndgv76kehfuaaeec' ||
    tableId === 'ocye5hmxbsoyrcii' ||
    tableId === 'ovu5h6b3ujb4y53w' ||
    tableId === 'NoCommBac0000001'

  // const isLightning = isLightningTable(tableId)
  // const isPeek = isPeekTable(tableId)

  let resultOddsTable: Record<string, number> = {}

  // if (dealing === 'Finished') {
  resultOddsTable = isLightningTable(tableId)
    ? calcLightningOdds(playerHand, bankerHand, lightningMultipliers)
    : calcResultOdds(playerHand, bankerHand, noCommission)

  console.log('🎰 [makeOddsTable] BEFORE winningSpots filter:', JSON.stringify({
    tableId,
    playerHand,
    bankerHand,
    resultOddsTable,
    winningSpots,
  }))

  // winningSpots가 있으면 실제 당첨된 spot만 배당 적용
  if (winningSpots != null) {
    for (const spot in resultOddsTable) {
      if (!winningSpots.includes(spot) && resultOddsTable[spot] > 0) {
        console.log(`  ❌ [makeOddsTable] Filtering out ${spot}: was ${resultOddsTable[spot]}, now 0 (not in winningSpots)`)
        resultOddsTable[spot] = 0
      } else if (winningSpots.includes(spot)) {
        console.log(`  ✅ [makeOddsTable] Keeping ${spot}: ${resultOddsTable[spot]} (in winningSpots)`)
      }
    }
  } else {
    console.log('  ⚠️ [makeOddsTable] No winningSpots provided, using calculated odds as-is')
  }

  if (options.redEnvelopePayouts != null) {
    for (const key in options.redEnvelopePayouts) {
      if (resultOddsTable[key] > 0) {
        resultOddsTable[key] = options.redEnvelopePayouts[key] + 1
      }
    }
  }

  console.log('🎰 [makeOddsTable] FINAL resultOddsTable:', JSON.stringify(resultOddsTable))

  return resultOddsTable
}

export async function calcSettleBet(
  authManager: AuthManager,
  casinoManager: CasinoTransactionManager,
  betData: BetDataCasino,
  gameResult: ManualSettleGameData,
) {
  try {
    const resultOddsTable: Record<string, number> = makeOddsTable(gameResult.tableId, gameResult)

    return await manualSettleBet(authManager, casinoManager, resultOddsTable, betData, gameResult)
  } catch (err) {
    console.log(errorToString(err))
  }
}

export async function settleGame(
  mongoBet: MongoBet,
  authManager: AuthManager,
  casinoManager: CasinoTransactionManager,
  gameData: FakeGameData,
) {
  const { gameId, tableId } = gameData
  let settlementError: string
  try {
    const bets = await mongoBet.betDataCasino.find({
      vendor: 'fhevo',
      summaryId: `fhevo-baccarat-${gameData.gameId}`,
    })

    if (bets.length > 0) {
      const { playerHand, bankerHand, lightningMultipliers, winningSpots } = gameData

      const resultOddsTable = makeOddsTable(tableId, {
        playerHand,
        bankerHand,
        lightningMultipliers,
        winningSpots,
      })

      const promises = []
      for (const bet of bets) {
        // betOrg가 없거나 betStatus가 'BET'이 아니면 마감하지 않는다.
        if (bet.amountBet == null || bet.betOrg == null || bet.betStatus !== 'BET') {
          continue
        }

        const promise = manualSettleBet(authManager, casinoManager, resultOddsTable, bet, gameData)
        promises.push(promise)
      }
      await Promise.all(promises)
    }

    console.log('proceed result gameId : ' + gameId)
  } catch (err) {
    console.log(`error result ${gameId}` + errorToString(err))
    settlementError = err.toString()
  } finally {
    const settlementProceedTime = new Date()

    const settlementElapsedMs = settlementProceedTime.getTime() - gameData?.resultTime?.getTime()
    mongoBet.fakeGameData
      .updateOne(
        { _id: gameData._id },
        {
          $set: {
            settlementProceed: true,
            settlementProceedTime,
            ...(settlementError != null && { settlementError }),
            updatedAt: settlementProceedTime,
          } as Partial<FakeGameData>,
        },
      )
      .catch((err) => {
        console.log(errorToString(err))
      })

    mongoBet.fakeTableData
      .updateOne(
        { tableId: gameData.tableId },
        {
          $set: {
            settlementTime: settlementProceedTime,
            settlementElapsedMs,
          } as Partial<FakeTableData>,
        },
      )
      .catch((err) => {
        console.log(errorToString(err))
      })
  }
}
