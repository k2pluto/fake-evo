import { vendorCode } from '../../app'
import { type PlayerBettingState } from '../../../common/fake-packet-types'
import { type ReceiveRouterType } from '../../module/types'
import { getFeeInfo } from '../../../common/fake-util'
import { type SaveBetType } from '../../../common/bet-action'

export const playerBettingStateFake100: ReceiveRouterType<PlayerBettingState> = async (
  packet,
  { socketData, tableData },
) => {
  const { tableId } = tableData
  const { user, mongoDB } = socketData
  const { gameId, state } = packet.args

  const { status } = state

  const username = user.agentCode + user.userId

  console.log(
    `playerBettingState ${packet.id} ${
      user.agentCode + user.userId
    } tableId ${tableId} round ${gameId} status ${status} ${JSON.stringify(packet)}`,
  )

  const userGameData = tableData.getUserGameData(gameId)

  tableData.setCurrentGameData(userGameData)

  // tableData.bettingState = packet

  const searchId = `${username}-${vendorCode}-${tableId}-${gameId}`

  const fakeBet = await mongoDB.fakeBetData.findOne({
    where: { searchId },
  })

  const betOrg = fakeBet?.calculatedOrg ?? fakeBet?.betOrg

  const saveBet = (fakeBet?.saveBet as Record<string, SaveBetType>) ?? {}

  if (status === 'Idle') {
    console.log(`playerBettingState Idle ${userGameData.gameStateData?.betting} ${userGameData.gameStateData?.dealing}`)

    // 1. 제일 처음에 입장했을 때 딜링이나 Resolve 중이라서 Idle 이 온 경우 만약 베팅이 있다면 Accepted 를 줘야 하고 없으면 Idle 을 줘야함
    // 2. 베팅 마감 했을 때 lastGamechips 가 있어서 Idle이 온 경우는 Fake100 에서는 실제 베팅을 안 올리므로 올 가능성이 없다. 만약에 온다고 해도 무시하면 된다.
    // 1번과 2번을 어떻게 구분해야 하는가?

    if (fakeBet != null && betOrg != null) {
      // 100% 페이크 일때 Idle일때는 패킷을 따로 보내지 않는다.
      // Accepted 패킷으로 바꿔서 보내야 한다.
      userGameData.betRequestStack = []
      for (const key of Object.keys(saveBet ?? {})) {
        const request = saveBet[key]
        const { name } = request.args.action
        if (name === 'Undo') {
          userGameData.betRequestStack.pop()
        } else if (name === 'UndoAll') {
          userGameData.betRequestStack = []
        } else {
          userGameData.betRequestStack.push(request)
        }
      }

      state.currentChips = userGameData.currentChips = betOrg ?? {}

      userGameData.betOrgRequests = saveBet

      socketData.preProcessBetQueue = []

      state.status = 'Accepted'
    } else {
      return null
    }
  } else if (status === 'Betting') {
    // 베팅중이고 베팅한 내역이 있으면 betRequestStack을 다시 만들어야 한다는 의미다.

    if (fakeBet != null && betOrg != null) {
      userGameData.betRequestStack = []
      for (const key of Object.keys(saveBet ?? {})) {
        const request = saveBet[key]
        const { name } = request.args.action
        if (name === 'Undo') {
          userGameData.betRequestStack.pop()
        } else if (name === 'UndoAll') {
          userGameData.betRequestStack = []
        } else {
          userGameData.betRequestStack.push(request)
        }
      }

      state.currentChips = userGameData.currentChips = betOrg ?? {}

      userGameData.betOrgRequests = saveBet

      socketData.preProcessBetQueue = []
    } else {
      // 처음 베팅일 수도 있고 새로고침 후 받은 것일 수도 있다.
      const lastCurrentChips = userGameData.currentChips
      tableData.init()

      const feeInfo = getFeeInfo(tableId)
      if (feeInfo != null) {
        for (const spot in lastCurrentChips) {
          state.lastGameChips[spot] = lastCurrentChips[spot]
          state.lastGameChips[spot + feeInfo.name] = lastCurrentChips[spot] * feeInfo.rate
        }
      } else {
        state.lastGameChips = lastCurrentChips
      }

      if (Object.keys(state.lastGameChips).length > 0) {
        state.canRepeat = { AllBets: true, MainOnly: false, MainAndPairs: false }
      }

      return packet
    }
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
      for (const spot in userGameData.currentChips) {
        state.lastGameChips[spot] = userGameData.currentChips[spot]
        state.lastGameChips[spot + feeInfo.name] = userGameData.currentChips[spot] * feeInfo.rate
      }
    } else {
      // 만약에 state.currentChips에 reject 되어 없는 칩이 있을 수도 있으므로 이렇게 확인하고 넣어 준다.
      for (const spot in betOrg) {
        if (state.currentChips[spot] != null) {
          state.currentChips[spot] = betOrg[spot]
        }
      }
      state.lastGameChips = userGameData.currentChips
    }
  }

  if (Object.keys(state.lastGameChips).length > 0) {
    state.canRepeat = { AllBets: true, MainOnly: false, MainAndPairs: false }
  }

  const betAmount = Object.values(state.currentChips).reduce((a, b) => a + b, 0)

  state.totalAmount = betAmount

  console.log(`playerBettingState ${packet.id} modify ${JSON.stringify(packet)}`)

  return packet
}
