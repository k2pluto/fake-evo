import { FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'
import { vendorCode } from '../app'
import { SendRouterType } from '../module/types'
import { ClientBetAcceptedPacket, ClientBetChipPacket } from '../../common/fake-packet-types'
import { config } from '../config'

const clientBetChipFake100: SendRouterType = async (
  packet: ClientBetChipPacket,
  { socketData: { mongoDB, user }, tableData },
) => {
  return null
}

const clientBetChipFakeChip: SendRouterType = async (
  packet: ClientBetChipPacket,
  { socketData: { mongoDB, user }, tableData },
) => {
  /*for (const table of packet.log.value) {
    const tableData = socketData.getTable(table.tableId)
    tableData.config = table.config
  }*/

  const { tableId } = tableData

  const userGameData = tableData.currentGameData
  if (userGameData == null) {
    return packet
  }

  const { betFakeRequests } = userGameData

  if (betFakeRequests.length === 0) {
    return packet
  }

  const requestBet = betFakeRequests[betFakeRequests.length - 1]

  const { type, gameId, bets } = packet.log.value

  if (config.fakeDoubleBet) {
    if (type === 'Chip') {
      let totalAmount = Object.values(requestBet.args.action.chips ?? {}).reduce((acc, value) => {
        return acc + value
      }, 0)
      if (requestBet.args.action.chip != null) {
        totalAmount += requestBet.args.action.chip.amount
      }

      packet.log.value.amount = totalAmount
    } else if (type === 'Move') {
      /*const totalAmount = Object.values(requestBet.args.action.chips).reduce((acc, value) => {
        return acc + value
      }, 0)
  
      packet.log.value.amount = totalAmount*/
    } else if (type === 'Repeat') {
      if (userGameData.repeatData == null) {
        userGameData.repeatData = bets
        setTimeout(() => {
          const username = user.agentCode + user.userId
          // Repeat 에서 setTimeout없이 바로 실행하면 bet request upsert와 동시에 update가 되서 저장이 안되는 문제가 발생한다.
          // 0.5 초 이후로 설정하면 repeatData가 저장되기 전에 response가 들어오는 경우가 생겨서 0.2초로 수정
          const searchId = `${username}-${vendorCode}-${tableId}-${gameId}`

          console.log('repeat data save', username, searchId, JSON.stringify(userGameData.repeatData))

          mongoDB.fakeBetData
            .updateOne({ searchId } as Partial<FakeBetData>, {
              $set: {
                repeatData: userGameData.repeatData,
              } as Partial<FakeBetData>,
            })
            .catch((err) => console.log(err))
        }, 200)
      }
    } else if (type === 'Double') {
      return null
    } else if (type === 'Undo') {
      const { betRequestStack } = userGameData

      if (betRequestStack.length > 0 && betRequestStack[betRequestStack.length - 1].args.action.name === 'Double') {
        return null
      }
    }
  } else {
    if (type === 'Chip') {
      let totalAmount = Object.values(requestBet.args.action.chips ?? {}).reduce((acc, value) => {
        return acc + value
      }, 0)
      if (requestBet.args.action.chip != null) {
        totalAmount += requestBet.args.action.chip.amount
      }

      packet.log.value.amount = totalAmount
    } else if (type === 'Move') {
      /*const totalAmount = Object.values(requestBet.args.action.chips).reduce((acc, value) => {
        return acc + value
      }, 0)
  
      packet.log.value.amount = totalAmount*/
    } else if (type === 'Repeat') {
      if (userGameData.repeatData == null) {
        userGameData.repeatData = bets
        setTimeout(() => {
          const username = user.agentCode + user.userId
          // Repeat 에서 setTimeout없이 바로 실행하면 bet request upsert와 동시에 update가 되서 저장이 안되는 문제가 발생한다.
          // 0.5 초 이후로 설정하면 repeatData가 저장되기 전에 response가 들어오는 경우가 생겨서 0.2초로 수정
          const searchId = `${username}-${vendorCode}-${tableId}-${gameId}`
          mongoDB.fakeBetData
            .updateOne({ searchId } as Partial<FakeBetData>, {
              $set: {
                repeatData: userGameData.repeatData,
              } as Partial<FakeBetData>,
            })
            .catch((err) => console.log(err))
        }, 200)
      }
    }
  }

  return packet
}

const clientBetAccepted: SendRouterType = async (
  packet: ClientBetAcceptedPacket,
  { socketData: { mongoDB, user }, tableData },
) => {
  const { gameId } = packet.log.value
  console.log('log clientBetAccepted', user.agentCode + user.userId, tableData.tableId, gameId, JSON.stringify(packet))

  return packet
}

export default {
  ['CLIENT_BET_CHIP']: config.fake100Percent ? clientBetChipFake100 : clientBetChipFakeChip,
  ['CLIENT_BET_ACCEPTED']: clientBetAccepted,
} as {
  [type: string]: SendRouterType
}
