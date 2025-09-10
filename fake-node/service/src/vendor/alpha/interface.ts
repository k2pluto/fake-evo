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
  opkey: string
  userid: string
  token: string
  third_party: string
}

export interface TransferRequest {
  opkey: string
  userid: string
  token: string
  third_party_code: string
  third_party_name: string
  game_code: string
  amount: string
  round_id: string
  trans_id: string
  date: string
  game_type: 'slot' | 'live'
}

export interface HistoryItem {
  id: string // '175e19680176cfe0721b6d3f'
  gameProvider: string // 'evolution'
  startedAt: string // '2023-05-11T13:20:45.176Z'
  settledAt: string // '2023-05-11T13:21:11.819Z'
  status: string // 'Resolved'
  gameType: string // 'sicbo'
  table: {
    id: string // 'EmperorSB0000001';
    name: string // 'Emperor Sic Bo'
  }
  dealer: {
    uid: string // 'tts151899_______';
    name: string // 'Richard'
  }
  currency: string // 'KRW'
  result: {
    player: number
    banker: number
    first: number // 1
    second: number // 3
    third: number // 3
    luckyNumbers: { SicBo_Combo1And5: { multiplier: 25 }; SicBo_Combo3And4: { multiplier: 25 } }
    winningNumbers: any // {}
  }
  participants: [
    {
      casinoId: string // 'babylonvg0000001'
      playerId: string // '556_baaaaeaa22'
      screenName: string // '556_baaaaeaa22'
      playerGameId: string // '175e19680176cfe0721b6d3f-qtzbl5r2o7p2vypn'
      sessionId: string // 'qtzbl5r2o7p2vypnrafpqxlwq2364vp74759e27f'
      casinoSessionId: string // 'eyJrZXkiOjIwMzY2OSwiaWQiOiJiYWFhYWVhYTIyIiwib3AiOjU1NiwiYyI6IjEiLCJnIjoidG9wX2dhbWVzIiwiZHQiOjE2ODM4MTEyMjg4ODh9'
      currency: string // 'KRW'
      bets: [
        {
          code: string // 'SicBo_Small'
          stake: number // 1000
          payout: number // 2000
          placedOn: string // '2023-05-11T13:21:03.756Z'
          //description: string // 'Small' // 더이상 안씀
          transactionId: string // '683803985425030672'
          vg_bet_trans_id: string // '529074806400285129'
          vg_result_trans_id: string // '529024807208925388'
        },
      ]
      configOverlays: any[]
      playMode: string // 'RealMoney'
      channel: string // 'desktop'
      os: string // 'Windows'
      device: string // 'Desktop'
      skinId: string // '1'
      brandId: string // '1'
      vg_round_id: string // '529074806400285091'
    },
  ]
}

export enum ReturnCodes {
  Success = 1,
  UserNotFound = 10,
  InsufficientBalance = 20,
  BettingNotFound = 90,
  InternalServerError = 99,
}

export function convertReturnCode(type: CommonReturnType) {
  switch (type) {
    case CommonReturnType.Success:
      return ReturnCodes.Success
    case CommonReturnType.UserNotFound:
      return ReturnCodes.UserNotFound
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
