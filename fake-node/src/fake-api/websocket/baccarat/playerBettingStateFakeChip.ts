import { vendorCode } from '../../app'
import { type PlayerBettingState } from '../../../common/fake-packet-types'
import { type ReceiveRouterType } from '../../module/types'
import {
  changeAcceptedBet as changeAcceptedBetWithResult,
  changeAcceptedBetMultiplier,
  needCalcOddsTable,
  settle,
  waitGameResult,
} from '../util'
import { getFeeInfo } from '../../../common/fake-util'
import { type SaveBetType } from '../../../common/bet-action'

export const playerBettingStateFakeChip: ReceiveRouterType<PlayerBettingState> = async (
  packet,
  { socketData, tableData },
) => {
  const { tableId } = tableData
  const { user, mongoDB } = socketData
  const { gameId, state } = packet.args

  const { status, balances } = state

  const username = user.agentCode + user.userId

  console.log(
    `playerBettingState ${packet.id} ${
      user.agentCode + user.userId
    } tableId ${tableId} round ${gameId} status ${status} ${JSON.stringify(packet)}`,
  )

  const gameData = tableData.getUserGameData(gameId)

  tableData.setCurrentGameData(gameData)

  // 처음 베팅일 때는 db에 데이터가 없으므로 여기서 체크
  if (status === 'Betting') {
    const { lastGameChips } = tableData
    tableData.init()

    if (Object.keys(state.currentChips).length === 0) {
      const feeInfo = getFeeInfo(tableId)
      if (feeInfo != null) {
        for (const spot in lastGameChips) {
          state.lastGameChips[spot] = lastGameChips[spot]
          state.lastGameChips[spot + feeInfo.name] = lastGameChips[spot] * feeInfo.rate
        }
      } else {
        state.lastGameChips = lastGameChips
      }
      return packet
    }

    // 베팅일 때도 currentChips가 있으면 베팅 후에 F5 새로고침을 했을 때 다시 Betting 상태로 오기 때문에 betOrg에서 데이터를 받아서 채워줘야 한다.
  }

  const searchId = `${username}-${vendorCode}-${tableId}-${gameId}`

  const fakeBet = await mongoDB.fakeBetData.findOne({
    where: { searchId },
  })

  // fake 데이터가 없으면 fake로 베팅을 안한거니 그냥 받은 그대로 리턴한다.
  if (fakeBet?.betOrg == null) {
    console.log(`playerBettingState betOrg is null`, username, packet.id, searchId)
    return packet
  }

  const betOrg = fakeBet.calculatedOrg ?? fakeBet.betOrg
  const betFake = fakeBet.calculatedFake ?? fakeBet.betFake

  if (status === 'Betting') {
    // 베팅중이고 베팅한 내역이 있으면 betRequestStack을 다시 만들어야 한다는 의미다.
    gameData.betRequestStack = []
    for (const key of Object.keys(fakeBet.saveBet ?? {})) {
      const request = fakeBet.saveBet[key] as SaveBetType
      const { name } = request.args.action
      if (name === 'Undo') {
        gameData.betRequestStack.pop()
      } else if (name === 'UndoAll') {
        gameData.betRequestStack = []
      } else {
        gameData.betRequestStack.push(request)
      }
    }

    socketData.preProcessBetQueue = []
  }

  if (status === 'Rejected') {
    // 이미 Rejected 되었으니 betting을 꺼서 마감동안 기다리는 루틴을 실행하지 않게한다.
    // Rejected 일 때는 currentChips 에 betOrg 를 넣지 않는다.
    gameData.betting = false

    // rejectedBet 안의 금액을 맞춰줘야 칩이 안바뀌고 그대로 취소된다.
    for (const spot in state.rejectedBets) {
      // rejectedBets의 리젝 금액과 리젝 이유를 확인하고
      // 리젝 금액이 최소금액 이상이고 최소금액 미만 베팅으로 리젝이 일어났으면 다시 acceptedBets에 넣어준다.
      const rejectedBet = state.rejectedBets[spot]

      rejectedBet.amount = fakeBet.betOrg[spot]
    }
    const { userId, agentCode } = user

    const { agent } = socketData

    const betData = await mongoDB.betDataCasino.findOne({
      where: {
        vendor: vendorCode,
        userId,
        agentCode,
        fakeRoundId: gameId,
      },
    })
    /* mongoDB.betDataCasino
      .updateOne(
        {
          vendor: vendorCode,
          userId,
          agentCode,
          fakeRoundId: gameId,
        },
        {
          $set: {
            fakeRejectedBets: state.rejectedBets,
          },
        },
      )
      .catch((err) => console.log(err)) */

    const orgTransId = betData?.transactions[0]?.id
    if (betData?.betStatus === 'BET' && orgTransId != null) {
      console.log(`Rejected try betCancel ${agentCode + userId} ${tableId} ${gameId}`)
      const vendorRoundId = betData?.roundId ?? fakeBet.vendorRoundId

      const amountCancel = Object.values(state.rejectedBets).reduce((a, b) => a + b.amount, 0)

      await socketData.casinoManager.betCancel({
        info: {
          agent,
          user,
          vendor: vendorCode,
          gameId: tableId,
          roundId: vendorRoundId,
          tableId,
          additional: {
            fakeRejectedBets: state.rejectedBets,
          },
        },
        transId: username + '-' + tableId + '-c' + vendorRoundId,
        orgTransId,
        incAmount: amountCancel,
        packet,
      })
    }
  } else {
    if (status === 'Accepted') {
      gameData.currentChips = betOrg
      tableData.lastGameChips = gameData.currentChips
      gameData.currentFakeChips = betFake
      console.log(
        `playerBettingState ${packet.id} bet accepted ${
          user.agentCode + user.userId
        } tableId ${tableId} round ${gameId} balance ${balances?.[0]?.amount}`,
      )

      // reject 된걸 여기서도 제거 해야 한다.
      gameData.accepted = true
      state.acceptedBets = changeAcceptedBetMultiplier(tableData, betOrg, 0)
      const newRejectedBets = {}
      if (Object.keys(state.rejectedBets).length > 0) {
        const getMainBetAmount = betOrg['Player'] ?? 0 + (betOrg['Tie'] ?? 0) + (betOrg['Banker'] ?? 0)

        for (let spot in state.rejectedBets) {
          // 1013 일때 20%이면 베팅 성공으로 친다.
          if (state.rejectedBets[spot].error === '1013' && betOrg[spot] <= getMainBetAmount * 0.2) {
            state.acceptedBets[spot] = {
              amount: betOrg[spot],
              payoff: 0,
              limited: false,
            }
            state.currentChips[spot] = betOrg[spot]
            continue
          }
          newRejectedBets[spot] = state.rejectedBets[spot]
        }
      }
      state.rejectedBets = newRejectedBets
    } else if (status === 'Cancelled') {
      tableData.safeResolveSettle()
      state.acceptedBets = changeAcceptedBetMultiplier(tableData, betOrg, 1)

      const { agentCode, userId } = user

      const betData = await mongoDB.betDataCasino.findOne({
        where: {
          vendor: vendorCode,
          userId,
          agentCode,
          fakeRoundId: gameId,
        },
      })

      await settle(packet, state.acceptedBets, betData?.roundId ?? fakeBet.vendorRoundId, socketData, tableData)
    } else if (status === 'Settled') {
      // 만약 acceptedBets에 betOrg의 모든 내용이 다 있으면 기다릴 필요가 없음
      const gameResult = needCalcOddsTable(state.acceptedBets, betOrg)
        ? await waitGameResult(username, tableId, gameId)
        : null

      state.acceptedBets = changeAcceptedBetWithResult(tableId, state.acceptedBets, betOrg, gameResult)
    }

    // rejectedBet 안의 금액을 맞춰줘야 칩이 안바뀌고 그대로 취소된다.
    for (const spot in state.rejectedBets) {
      // rejectedBets의 리젝 금액과 리젝 이유를 확인하고
      // 리젝 금액이 최소금액 이상이고 최소금액 미만 베팅으로 리젝이 일어났으면 다시 acceptedBets에 넣어준다.
      const rejectedBet = state.rejectedBets[spot]

      delete state.acceptedBets[spot]

      rejectedBet.amount = betOrg[spot]
    }

    // Cancelled 일때는 currentChips가 없다.
    if (Object.keys(state.currentChips ?? {}).length > 0) {
      const feeInfo = getFeeInfo(tableId)
      if (feeInfo != null) {
        for (const spot in betOrg) {
          if (state.currentChips[spot] != null) {
            state.currentChips[spot] = betOrg[spot]
            state.currentChips[spot + feeInfo.name] = betOrg[spot] * feeInfo.rate
          }
        }
        for (const spot in gameData.currentChips) {
          state.lastGameChips[spot] = gameData.currentChips[spot]
          state.lastGameChips[spot + feeInfo.name] = gameData.currentChips[spot] * feeInfo.rate
        }
      } else {
        // 만약에 state.currentChips에 reject 되어 없는 칩이 있을 수도 있으므로 이렇게 확인하고 넣어 준다.
        for (const spot in betOrg) {
          if (state.currentChips[spot] != null) {
            state.currentChips[spot] = betOrg[spot]
          }
        }
        state.lastGameChips = gameData.currentChips
      }
    }
  }

  const betAmount = Object.values(state.currentChips).reduce((a, b) => a + b, 0)

  state.totalAmount = betAmount

  console.log(`playerBettingState ${packet.id} modify ${user.agentCode + user.userId} ${JSON.stringify(packet)}`)

  return packet
}
