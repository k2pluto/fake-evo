import { EvolutionHistoryItem } from '../evolution/interface'
import { CommonReturnType } from '../../lib/common/types/common-return-type'

export interface GameListItem {
  code: string // 'YGG-10xrewind'
  name_eng: string // '10X Rewind'
  name_kor: string // '10X Rewind'
  type: string // 'slot'
  is_desktop: { type: 'Buffer'; data: [1] }
  is_mobile: { type: 'Buffer'; data: [1] }
  img_1: string // 'http://img.enjoycx.com/img/game/moa/YGG/YGG-10xrewind.jpg'
}

export interface AuthRequest {
  apiKey: string // '7d55acaba1a6b4c846ba0b894c1fa3da'
  params: {
    siteUsername: string // 'user1'
  }
  requestAt: string // '2023-06-13T00:01:38.224Z'
  sendCount: number // 2
}

export interface BalanceRequest {
  apiKey: string // '7d55acaba1a6b4c846ba0b894c1fa3da'
  params: {
    siteUsername: string // 'user1'
  }
  requestAt: string // '2023-06-13T00:01:38.224Z'
  sendCount: number // 2
}

export interface TransferRequest {
  apiKey: string // '7d55acaba1a6b4c846ba0b894c1fa3da'
  params: {
    transactionKey: string // '55017ba2e648b66a454032ee98a3397e'
    username: string // 'cool_tttaa22'
    siteUsername: string // 'tttaa22'
    vendorKey: string // 'pragmatic_slot'
    vendorName: string // '프라그마틱 슬롯'
    gameCategoryKey: string // 'slot'
    gameKey: string // 'vs20doghouse'
    gameName: string // 'The Dog House'
    gameTypeKey: string // 'slot'
    type: string // 'bet'
    key: string // '1686649881538-key'
    siteGameId: string // "17694f7b0fbee3c01849f549-rczb5ran6oifq76c"
    parentTransactionKey?: string // '55017ba2e648b66a454032ee98a3397e'
    isBonus?: false
    isJackpot?: false
    isPromo?: false
    isFreeGame?: false
    groupKey: string // '15'
    amount: number // 1
    createdAt: string // '2022-09-13T00:45:58.496Z'
    requestedAt: string // '2022-09-13T00:45:58.696Z'
  }
  requestAt: string // '2023-06-13T09:51:27.152Z'
}

export interface UnionGameHistoryItem {
  _id: string // '648ec95da6b31f763b2eb60e'
  transactionKey: string // '03e3349c5e1b29fede26821ca3181473'
  createdAt: string // '2023-06-18T09:06:14.914Z'
  detail: EvolutionHistoryItem
  vendorKey: string // 'evolution_casino'
}

export interface UnionGameTransactionPacket {
  code: number // 0
  length: number // 3
  beginDate: string // '2023-06-18T09:12:15.836Z'
  details: UnionGameHistoryItem[]
}

export enum ReturnCodes {
  Success = 0,
  InvalidParameter = 5,
  UserNotFound = 10,
  InsufficientBalance = 20,
  BettingNotFound = 90,
  InternalServerError = -1,
}

export function convertReturnCode(type: CommonReturnType) {
  switch (type) {
    case CommonReturnType.Success:
      return ReturnCodes.Success
    case CommonReturnType.UserNotFound:
      return ReturnCodes.UserNotFound
    case CommonReturnType.InvalidParameter:
      return ReturnCodes.InvalidParameter
    case CommonReturnType.InsufficientBalance:
      return ReturnCodes.InsufficientBalance
    case CommonReturnType.ZeroCancelBet:
      return ReturnCodes.Success
    // 게임사 요청으로 베팅리밋 걸리는 부분을 20으로 변경
    case CommonReturnType.InvalidBetMoney:
      return ReturnCodes.InsufficientBalance
    case CommonReturnType.InsufficientAgentBalance:
      return ReturnCodes.InsufficientBalance
    case CommonReturnType.TransactionNotFound:
      return ReturnCodes.BettingNotFound
    case CommonReturnType.TransactionAlreadyRollback:
      return ReturnCodes.BettingNotFound
    case CommonReturnType.TransactionExists:
      return ReturnCodes.BettingNotFound
    case CommonReturnType.AlreadySettle:
      return ReturnCodes.BettingNotFound
  }

  return ReturnCodes.InternalServerError
}
