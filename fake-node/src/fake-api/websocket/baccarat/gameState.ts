import { authManager, vendorCode } from '../../app'
import {
  BaccaratGameData,
  EvolutionBettingErrorCode,
  GameStatePacket,
  PlayerBettingState,
  Resolved,
} from '../../../common/fake-packet-types'
import { FakeGameData } from '@service/src/lib/interface/mongo/fake-game-data'
import { ReceiveRouterParams, ReceiveRouterType } from '../../module/types'
import { changeAcceptedBet, makeContentResult, makePacketId, settle, updateGameResult } from '../util'
import { errorToString, randomHexString, sleep } from '../../../common/util'
import { tryFakeBet } from '../../../common/try-fake-bet'
import { config } from '../../config'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { UserGameData } from '../user-game-data'
import { calcSettleBet } from '../../../common/settle'

export const sendPlayerBettingStateRejected = async (
  userGameData: UserGameData,
  totalAmount: number,
  { socketData, tableData, clientWs }: ReceiveRouterParams,
) => {
  const time = new Date().getTime()

  const { user } = socketData
  const { tableId, lastGameChips } = tableData

  const { currentChips, acceptedBets, rejectedBets, gameId } = userGameData

  const bettingState = {
    id: makePacketId(time),
    type: 'baccarat.playerBettingState',
    time,
    args: {
      gameId: gameId,
      idleRounds: 0,
      state: {
        status: 'Rejected',
        totalAmount,
        currency: 'KRW',
        currentChips,
        acceptedBets,
        rejectedBets,
        chipHistory: [],
        timedChipHistory: [],
        lastGameChips: lastGameChips,
        canUndo: false,
        canRepeat: {},
        canDouble: false,
        lastPlacedOn: 1690442049649,
        balances: [{ id: 'combined', version: new Date().getTime(), amount: user.balance }],
      },
      restore: false,
      version: socketData.getPacketVersion(),
      tableId: tableId,
    },
  } satisfies PlayerBettingState

  const data = JSON.stringify(bettingState)

  const username = user.agentCode + user.userId
  console.log(`baccarat sendPlayerBettingStateRejected ${username} ${data}`)

  clientWs.send(data)
}
export const sendPlayerBettingStateAccepted = async (
  userGameData: UserGameData,
  totalAmount: number,
  { socketData, tableData, clientWs }: ReceiveRouterParams,
) => {
  const time = new Date().getTime()

  const { user } = socketData

  const { tableId, lastGameChips } = tableData

  const { currentChips, acceptedBets, rejectedBets, gameId } = userGameData

  const bettingState = {
    id: makePacketId(time),
    type: 'baccarat.playerBettingState',
    time,
    args: {
      gameId: gameId,
      idleRounds: 0,
      state: {
        status: 'Accepted',
        totalAmount,
        currency: 'KRW',
        currentChips,
        acceptedBets,
        rejectedBets,
        chipHistory: [],
        timedChipHistory: [],
        lastGameChips: lastGameChips,
        canUndo: false,
        canRepeat: {},
        canDouble: false,
        lastPlacedOn: 1690442049649,
        balances: [{ id: 'combined', version: new Date().getTime(), amount: user.balance }],
      },
      restore: false,
      version: socketData.getPacketVersion(),
      tableId: tableId,
    },
  } satisfies PlayerBettingState

  const data = JSON.stringify(bettingState)

  const username = user.agentCode + user.userId
  console.log(`baccarat sendPlayerBettingStateAccepted ${username} ${data}`)

  clientWs.send(data)
}

export const sendPlayerBettingStateSettled = async (
  userGameData: UserGameData,
  totalAmount: number,
  { socketData, tableData, clientWs }: ReceiveRouterParams,
) => {
  const time = new Date().getTime()

  const { user } = socketData

  const { tableId, lastGameChips } = tableData

  const { currentChips, acceptedBets, rejectedBets, gameId } = userGameData

  const bettingState = {
    id: makePacketId(time),
    type: 'baccarat.playerBettingState',
    time,
    args: {
      gameId,
      idleRounds: 0,
      state: {
        status: 'Settled',
        totalAmount,
        currency: 'KRW',
        currentChips,
        acceptedBets,
        rejectedBets,
        chipHistory: [],
        timedChipHistory: [],
        lastGameChips: lastGameChips,
        canUndo: false,
        canRepeat: {},
        canDouble: false,
        lastPlacedOn: 1690448476304,
        push: true,
      },
      restore: false,
      version: socketData.getPacketVersion(),
      tableId: tableId,
    },
  } satisfies PlayerBettingState

  const data = JSON.stringify(bettingState)

  const username = user.agentCode + user.userId
  console.log(`baccarat sendPlayerBettingStateSettled ${username} ${data}`)

  clientWs.send(data)
}

export const sendResolved = async (
  userGameData: UserGameData,
  totalAmount: number,
  gameData: BaccaratGameData,
  { socketData, tableData, clientWs }: ReceiveRouterParams,
) => {
  const time = new Date().getTime()

  const { tableId, lastGameChips } = tableData

  const { currentChips, acceptedBets, gameId } = userGameData

  clientWs.send(
    JSON.stringify({
      id: makePacketId(time),
      type: 'baccarat.resolved',
      args: {
        gameId,
        gameNumber: '15:49:44',
        bets: {
          status: 'Settled',
          totalAmount,
          currency: 'KRW',
          currentChips,
          acceptedBets: acceptedBets,
          rejectedBets: {},
          chipHistory: [],
          timedChipHistory: [],
          lastGameChips,
          canUndo: false,
          canRepeat: {},
          canDouble: false,
          lastPlacedOn: 1690991388231,
          winType: 'Medium',
          push: false,
        },
        result: gameData.result,
        winningSpots: gameData.winningSpots,
        version: socketData.getPacketVersion(),
        tableId: tableId,
      },
      time,
    } as Resolved),
  )
}
export const gameState: ReceiveRouterType<GameStatePacket> = async (packet, { socketData, tableData, clientWs }) => {
  //packet.args.balance = 1000000
  //packet.args.balances[0].amount = 1000000

  const { gameId, betting, dealing, gameData } = packet.args

  const { tableId } = tableData

  const { mongoDB, casinoManager } = socketData
  const { userId, agentCode } = socketData.user

  const username = agentCode + userId

  console.log(
    `gameState ${socketData.type} ${username} tableId ${tableId} round ${gameId} ${betting} ${dealing} ${JSON.stringify(
      packet,
    )}`,
  )

  const userGameData = tableData.getUserGameData(gameId)

  const oldGameStateData = userGameData.gameStateData

  const firstBetClosed =
    // 이전 게임 id가 같아야 된다.
    tableData.currentGameData?.gameId === gameId &&
    // 이전 게임 상태가 BetsOpen 이여야 된다.
    (oldGameStateData == null || oldGameStateData.betting === 'BetsOpen') &&
    betting === 'BetsClosed' &&
    dealing === 'Idle'

  userGameData.gameStateData = packet.args
  tableData.setCurrentGameData(userGameData)

  updateGameResult(packet)

  if (config.fake100Percent) {
    const { user, agent } = socketData

    const { currentChips } = userGameData

    if (firstBetClosed && Object.keys(currentChips).length > 0) {
      const transId = new Date().getTime() + randomHexString(6)

      userGameData.rejectedBets = {}

      tableData.lastGameChips = currentChips

      tryFakeBet({
        agent,
        user,
        vendor: vendorCode,
        userId,
        agentCode,
        tableId,
        roundId: gameId,
        transId,
        body: packet,
        betClosedTimestamp: packet.time,
        mongoDB,
        casinoManager,
      }).then((value) => {
        console.log(
          `gameState try_fake_bet result ${username} ${tableId} ${gameId} ${transId} ${JSON.stringify(value)}`,
        )

        if (value.status === CommonReturnType.Success) {
          userGameData.acceptedBets = value.acceptedBets
          userGameData.currentChips = value.currentChips
          userGameData.rejectedBets = value.rejectedBets
          sendPlayerBettingStateAccepted(userGameData, value.totalAmount, { socketData, tableData, clientWs })
        } else {
          userGameData.acceptedBets = {}
          userGameData.currentChips = {}

          if (value.rejectedBets != null) {
            userGameData.rejectedBets = value.rejectedBets
          } else {
            userGameData.rejectedBets = {}
            for (const spot in currentChips) {
              userGameData.rejectedBets[spot] = {
                amount: currentChips[spot],
                error: EvolutionBettingErrorCode.SeamlessError,
              }
            }
          }

          sendPlayerBettingStateRejected(userGameData, 0, { socketData, tableData, clientWs })
        }
      })
    }

    if (dealing === 'Finished' && Object.keys(currentChips).length > 0) {
      //만약 acceptedBets에 betOrg의 모든 내용이 다 있으면 기다릴 필요가 없음
      const gameResult = packet
      const acceptedBets = changeAcceptedBet(tableId, {}, currentChips, {
        ...gameResult.args,
        ...gameResult.args.gameData,
      })

      console.log(`gameState settle start ${username} ${tableId} ${gameId}`)

      const betData = await mongoDB.betDataCasino.findOne({
        where: {
          vendor: vendorCode,
          userId: user.userId,
          agentCode: user.agentCode,
          fakeRoundId: gameId,
        },
      })

      if (betData == null) {
        console.log(`gameState betData not found ${username} ${tableId} ${gameId}`)
      }

      if (betData?.betStatus === 'BET') {
        await settle(packet, acceptedBets, gameId, socketData, tableData)
      }

      // betData가 있는거와 관련없이 클라이언트 쪽으로 무조건 패킷을 날려줘야 클라이언트 쪽에서는 이상이 없어 보인다.
      userGameData.acceptedBets = acceptedBets

      let totalAmount = 0
      for (const spot in currentChips) {
        totalAmount += currentChips[spot]
      }

      // 여기서 playerBettingState Settled 패킷과 resolved 패킷을 보내준다.
      sendPlayerBettingStateSettled(userGameData, totalAmount, { socketData, tableData, clientWs })
      sendResolved(userGameData, totalAmount, packet.args.gameData, { socketData, tableData, clientWs })
    }
  }

  const isEnd = dealing === 'Finished' || dealing === 'Cancelled'

  if (isEnd || (betting === 'BetsClosed' && dealing === 'Idle')) {
    //const oldDealing = oldGameStateData?.dealing

    //const alreadyEnd = oldDealing === 'Finished' || oldDealing === 'Cancelled'

    const oldGameData = await mongoDB.fakeGameData.findOne({
      where: {
        tableId,
        gameId,
      },
    })
    const oldDealing = oldGameData?.dealing
    const alreadyEnd = oldDealing === 'Finished' || oldDealing === 'Cancelled'

    if (alreadyEnd) {
      console.log('gameState_already_end', tableId, gameId, betting, dealing)
    } else {
      const eventTime = new Date(packet.time)
      const packetId = packet.args.version
      // packet 필드 때문에 upsert 에러가 많이나서 수정 필요
      mongoDB.fakeGameData
        .updateOne(
          {
            tableId,
            gameId,
          },
          {
            $set: {
              updatedAt: eventTime,
              dealing,
              betting,
              ...gameData,
              ...(isEnd && { resultTime: eventTime }),
              [`packet.${packetId}`]: packet,
            } as Partial<FakeGameData>,
          },
          {
            upsert: true,
          },
        )
        .then(() => console.log('gameState upsert success', tableId, gameId, betting, dealing))
        .catch((err) => console.log('gameState upsert error', tableId, gameId, betting, dealing, errorToString(err)))
    }
  }

  if (isEnd) {
    if (userGameData.accepted) {
      const result = makeContentResult(tableId, gameData)

      casinoManager
        .getBetDataCol()
        .updateOne(
          {
            vendor: vendorCode,
            userId,
            agentCode,
            fakeRoundId: gameId,
          },
          {
            $set: {
              'content.result': result,
            },
          },
        )
        .catch((err) => console.log(err))
    }

    // 만약에 베팅이 있었으면 마감이 됬는지 검사하고 마감이 안됬으면 마감을 시킨다.
    // 가끔씩 에볼루션 쪽에서 playerBettingState가 안들어 오기 때문에 이렇게 처리 한다.
    if (userGameData.betting === true) {
      sleep(5000).then(async () => {
        if (userGameData.resolved === false) {
          const betData = await mongoDB.betDataCasino.findOne({
            where: {
              vendor: vendorCode,
              userId,
              agentCode,
              fakeRoundId: gameId,
            },
          })
          console.log('gameState manual settle start', username, JSON.stringify(betData))

          if (betData != null && betData.betStatus === 'BET') {
            await calcSettleBet(authManager, casinoManager, betData, {
              ...gameData,
              result: gameData.result,
              tableId,
              dealing: packet.args.dealing,
            })
          }
        }
      })
    }
  }

  return packet
}
