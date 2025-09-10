import { VendorCode } from '../../lib/common/types/vendor-code'
import { CommonReturnType } from '../../lib/common/types/common-return-type'
import { BrandName } from '../../lib/common/types/brand-name'

export const VendorCodeTable = {
  ['1']: VendorCode.CX_EVOLUTION,
  ['17']: VendorCode.CX_WAZDAN,
  ['27']: VendorCode.CX_RELAX_GAMING,
  ['28']: VendorCode.CX_BOTA,
  ['35']: VendorCode.CX_GAMEART,
  ['40']: VendorCode.CX_BLUEPRINT_GAMING,
  ['41']: VendorCode.CX_THUNDER_KICK,
  ['42']: VendorCode.CX_NOLIMIT_CITY,
  ['43']: VendorCode.CX_MOBILOTS,
  ['44']: VendorCode.CX_PLAY_PEARLS,
  ['49']: VendorCode.CX_1X2_GAMING,
  ['50']: VendorCode.CX_ELK_STUDIOS,
}

export const BrandCodeTable = {
  ['1']: BrandName.Evolution,
  ['17']: BrandName.Wazdan,
  ['27']: BrandName.RelaxGaming,
  ['28']: BrandName.Bota,
  ['35']: BrandName.GameArt,
  ['40']: BrandName.BlueprintGaming,
  ['41']: BrandName.ThunderKick,
  ['42']: BrandName.NoLimitCity,
  ['43']: BrandName.Mobilots,
  ['44']: BrandName.PlayPearls,
  ['49']: BrandName._1x2Gaming,
  ['50']: BrandName.ElkStudios,
}

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
  opkey: string // 'c9a83376c454d0060dc09c8801fd44f2'
  userid: string // 'baowwa09'
  token: string // '00349b1651dd4b9e850fb431c457a1d9'
  third_party_code: string // '1'
  third_party_name: string // 'EVOLUTION'
  game_code: string // 'q25bmd63gsy3ngfl'
  amount: string // '15000'
  round_id: string // '1192083442807753931'
  trans_id: string // '1192083442807753956'
  table_code: string // 'Korean Speed Baccarat E'
  date: string // '2025-03-04 18:33:48.279'
  game_type: 'slot' | 'live'
  evtype: string // '0'
  times: string // '1741080828279'
  table_type: string // 'baccarat'
}

export interface SwixGameResult {
  banker: {
    cards: string[] // ['QD', '2S', 'QS']
    score: number // 2
  }
  player: {
    cards: string[] // ['QC', '6D']
    score: number // 6
  }
  multipliers: {
    cards: {
      [key: string]: number
    } // { 8H:2, 8S:3, 8D:2, 8C:2 }
  }
}

export interface SwixHitoryItem {
  id: number // 1001
  round_id: string // '762075464701625643'
  table_code: string // 'gwbaccarat000001'
  table_name: string // 'Golden Wealth Baccarat'
  bet_amount: string // '2000.00'
  win_amount: string // '0.00'
  date: string // '2023-12-30T15:10:47.527Z'
  bet_code: string // 'BAC_PlayerPair'
  bet_name: string // 'Player Pair'
  game_type: string // 'baccarat'
  player_id: string // 'banzkzk1'
  result: string // 'Player'
  third_party: number // 1
  game_result: SwixGameResult
}

export interface SwixHitoryResponse {
  data: SwixHitoryItem[]
  next: string // https://casinolog-sa.vedaapi.com/api/?op=c9a83376c454d0060dc09c8801fd44f2&log_date=2023-12-31&cursor=1000&third=1
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
          // description: string // 'Small' // 더 이상 안씀
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
