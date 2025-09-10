import { CommonReturnType } from '../../lib/common/types/common-return-type'

export type StatusCode =
  | 'OK' // Success
  | 'TEMPORARY_ERROR' // Retryable Error	There is a temporary problem with the game server.
  | 'INVALID_TOKEN_ID' // Fatal Error	There has been a problem with the casino. User authentication failed or your session may be expired, please close the browser and try again. Error Code: EV01
  | 'INVALID_SID' // Fatal Error	There has been a problem with the casino. User authentication failed or your session may be expired, please close the browser and try again. Error Code: EV01
  | 'ACCOUNT_LOCKED' // Fatal Error	There has been a problem with the casino. User authentication failed or your session may be expired, please close the browser and try again. Error Code: EV01
  | 'FATAL_ERROR_CLOSE_USER_SESSION' // Fatal Error	There has been a problem with the casino. User authentication failed or your session may be expired, please close the browser and try again. Error Code: EV01
  | 'UNKNOWN_ERROR' // Final Error	Please contact Customer Support for assistance.
  | 'INVALID_PARAMETER' // Final Error	Please contact Customer Support for assistance.
  | 'BET_DOES_NOT_EXIST' //	Final Error	Please contact Customer Support for assistance.
  | 'BET_ALREADY_EXIST' //	Success	Bet already exists in third party system.
  | 'BET_ALREADY_SETTLED' //	Success	Bet has been already settled in third party system.
  | 'INSUFFICIENT_FUNDS' //	Final Error	You do not have sufficient funds to place this bet.
  | 'FINAL_ERROR_ACTION_FAILED' // Final Error	Requested action failed. Press OK to continue.
  | 'GEOLOCATION_FAIL' // Final Error	Operation not allowed because of geolocation check.
  | 'BONUS_LIMIT_EXCEEDED' // Final Error	Bet rejected. Your stake exceeds the maximum allowed with this bonus. Please lower your stake and try again.
  //Required only for MGA
  | 'CASINO_LIMIT_EXCEEDED_TURNOVER' // Final Error	This bet amount would exceed your personal limit within the specified period of time. Meant for user to specify limit for amount that is wagered
  | 'CASINO_LIMIT_EXCEEDED_SESSION_TIME' // Final Error	Your play time exceeds your personal limit of time that may be played in a session. Meant for user to specify limit for game session length (time frame)
  | 'CASINO_LIMIT_EXCEEDED_STAKE' // Final Error	This bet amount would exceed your personal single bet limit. Optional. Meant for user to specify limit for single bet
  | 'CASINO_LIMIT_EXCEEDED_LOSS' // Final Error	This bet amount would exceed your personal limit within the specified period of time. Meant for user to specify limit for amount he lost (sum of all losses)
  //Required only for AAMS
  | 'SESSION_ALREADY_CLOSED' // Final Error
  | 'SESSION_DOES_NOT_EXIST' // Final Error
  | 'OPERATION_IN_PROCESS'

export interface CheckRequest {
  channel: {
    type: string // 'P'
  }
  sid: string // 'b8c418ba-0729-4a11-9163-4e0935d40787'
  userId: string // 'texaa11'
  uuid: string // 'c7955ab7-8268-4747-af90-7aaa76ffaab5'
}

export interface BalanceRequest {
  currency: string // 'KRW'
  game: string // null
  sid: string // '4747093f-3d7c-4063-ac18-6ec5aa7b8622'
  userId: string // 'texaa11'
  uuid: string // '6fbfdcda-92a9-4e31-9c0f-09a7bcc9918c'
}

export interface DebitRequest {
  transaction: {
    id: string // 'D658143499344746780' 거래의 고유 식별자(예: 중복 베팅 및 기타 검증을 피하기 위해 사용)
    refId: string // '658143499344746780' CreditRequest/CancelRequest를 적절한 DebitRequest에 연결(상관) 및/또는 검증할 수 있는 거래에 대한 참조 식별자
    amount: number // 1
  }
  sid: string // 'd11358cd-854b-4b45-8efc-b21a0d9ffb53'
  userId: string // 'aaeaa11'
  uuid: string // 'fc2405e3-6cee-46f7-87da-38c2f70a5f8c'
  currency: string // 'KRW'
  game: {
    id: string // '17055557ad0425188721339f-qi4xeqphfpoac2sh'
    type: string // 'baccarat'
    details: {
      table: {
        id: string // 'oytmvb9m1zysmc44'
        vid: null
      }
    }
  }
}
export interface CreditRequest {
  transaction: {
    id: string // 'C658143499344746780'
    refId: string // '658143499344746780'
    amount: number // 12
  }
  sid: string // 'd11358cd-854b-4b45-8efc-b21a0d9ffb53'
  userId: string // 'aaeaa11'
  uuid: string // '21b79c21-3321-455a-b329-c86ed925c046'
  currency: string // 'KRW'
  game: {
    id: string // '17055557ad0425188721339f-qi4xeqphfpoac2sh'
    type: string // 'baccarat'
    details: {
      table: {
        id: string // 'oytmvb9m1zysmc44'
        vid: null
      }
    }
  }
}

// DebitRequest는 transaction.id = abc12345로 이루어졌습니다. CancelRequest에는 transaction.id = abc12345가 포함됩니다.

// 예상되는 동작에 대한 참고 사항: 게임에 두 개 이상의 출금 요청이 있는 경우 게임 라운드에 따라 신용 요청 후에 일부 출금 요청의 취소가 수신될 수 있습니다.
// 취소 처리 시 거래 금액을 가져갈 수 없으며 추가 유효성 검사에만 사용할 수 있습니다. 취소는 transaction.id만 사용하여 실행해야 합니다.

export interface CancelRequest {
  transaction: {
    id: string // 'C658143499344746780'
    refId: string // '658143499344746780'
    amount: number // 12
  }
  sid: string // 'd11358cd-854b-4b45-8efc-b21a0d9ffb53'
  userId: string // 'aaeaa11'
  uuid: string // '21b79c21-3321-455a-b329-c86ed925c046'
  currency: string // 'KRW'
  game: {
    id: string // '17055557ad0425188721339f-qi4xeqphfpoac2sh'
    type: string // 'baccarat'
    details: {
      table: {
        id: string // 'oytmvb9m1zysmc44'
        vid: null
      }
    }
  }
}

export interface CheckResponse {
  status: StatusCode
  sid?: string
}

export interface StandardResponse {
  status: StatusCode
  balance?: number // 플레이어의 잔액 값(보너스를 제외한 실제 돈). 반환된 값은 소수점 이하 자릿수에 제한이 없지만 UI에 표시할 때 Evolution은 소수점 이하 2자리까지 자릅니다.
  bonus?: number // 플레이어의 보너스 잔액은 잔액 속성의 실제 잔액에 추가되며 사용자에게 허용되는 총 보너스로 사용됩니다.
  retransmission?: boolean // 응답이 원래 응답의 재전송이면 true입니다(예: 네트워크 오류로 인해 요청이 재시도된 경우). 다른 모든 경우에 이것은 거짓이거나 응답에 완전히 포함되지 않아야 합니다.
  uuid?: string // StandardResponse를 식별하는 고유 응답 ID
}

export interface PromoRequest {
  sid: string // 'sid-parameter-from-UserAuthentication-call'
  userId: string // 'euID-parameter-from-UserAuthentication-call'
  currency: string // 'EUR'
  game: {
    id: string // '7kfwqku4jb4mtas1n4k4irqa'
    type: string // 'blackjack'
    details: {
      table: {
        id: string // 'aaabbbcccdddeee111'
        vid: string // 'aaabbbcccdddeee111'
      }
    }
  }
  promoTransaction: {
    type: string // 'JackpotWin'
    id: string // '9AotBIvi23'
    amount: number // 350.762048
    jackpots: [
      {
        id: string // '444041xyz'
        winAmount: number // 325.118042
      },
      {
        id: string // '555739abc'
        winAmount: number // 25.644006
      },
    ]
  }
  uuid: string // 'ce186440-ed92-11e3-ac10-0800200c9a66'
}

export interface LobbyResponse {
  tables: {
    [id: string]: {
      descriptions: any
      display: string // 'on_desktop&mobile'
      gameProvider: string // 'redtiger'
      gameType: string // '10001nights'
      gameTypeUnified: string // '10001nights'
      gameVertical: string // 'slots'
      language: string // 'en'
      name: string // '10,001 Nights DNT'
      open: boolean // true
      sitesAssigned: any[]
      sitesBlocked: any[]
      tableId: string // '10001nights00000'
      videoSnapshot: {
        links: {
          L: string
          M: string
          S: string
          XL: string
        }
        thumbnails: {
          L: string
          M: string
          S: string
          XL: string
        }
      }
    }
  }
}

export interface EvolutionHistoryParticipant {
  bets: [
    {
      code: string // 'BAC_Player'
      stake: number // 76000
      payout: number // 152000
      placedOn: string // '2023-01-09T09:14:30.896Z'
      //description: string // 'Player' // 더 이상 안씀
      transactionId: string // '673254287462940686'
    },
  ]
  skinId: string // '1'
  brandId: string // ''
  currency: string // 'KRW'
  playerId: string // '2255993'
  playerGameId: string // '17389927b117353cdc6c873d-qwh3cvb6drovyshl'
}

export interface EvolutionHistoryItem {
  id: string // '17389927b117353cdc6c873d'
  table: {
    id: string // 'ndgvz5mlhfuaad6e';
    name: string // 'Speed Baccarat D'
  }
  dealer: {
    uid: string // 'tts139097_______';
    name: string // 'Tina'
  }
  result: {
    banker: {
      cards: string[] // ['9C', '7D', '5C'];
      score: number // 1
    }
    player: {
      cards: string[] // ['9C', '7D', '5C'];
      score: number // 1
    }
    outcome: string // 'Player'
    multipliers?: {
      betCodes: {
        [key: string]: number // 'BAC_Player': 15
      }
      cards: {
        [key: string]: number // '9C': 8
      }
    }
    redEnvelopePayouts: Record<string, number> // { BAC_PlayerPair: 15 }
  }
  status: string // 'Resolved'
  gameType: string // 'baccarat'
  settledAt: string // '2023-01-09T09:14:41.371Z'
  startedAt: string // '2023-01-09T09:14:17.325Z'
  gameProvider: string // 'evolution'
  participants: EvolutionHistoryParticipant[]
}

export function convertReturnCode(type: CommonReturnType): StatusCode {
  switch (type) {
    case CommonReturnType.UserNotFound:
      return 'INVALID_PARAMETER'
    case CommonReturnType.AgentNotFound:
      return 'INVALID_PARAMETER'
    case CommonReturnType.InvalidToken:
      return 'INVALID_SID'
    case CommonReturnType.InsufficientBalance:
      return 'INSUFFICIENT_FUNDS'
    case CommonReturnType.InvalidBetMoney:
      return 'INVALID_PARAMETER'
    case CommonReturnType.TransactionNotFound:
      return 'BET_DOES_NOT_EXIST'
    case CommonReturnType.TransactionAlreadyRollback:
      return 'BET_ALREADY_SETTLED'
    case CommonReturnType.TransactionExists:
      return 'BET_ALREADY_EXIST'
    case CommonReturnType.ZeroCancelBet:
      return 'BET_DOES_NOT_EXIST'
    case CommonReturnType.AlreadySettle:
      return 'BET_ALREADY_SETTLED'
    case CommonReturnType.DatabaseError:
      return 'UNKNOWN_ERROR'
    case CommonReturnType.InvalidParameter:
      return 'INVALID_PARAMETER'
  }

  return 'TEMPORARY_ERROR'
}
