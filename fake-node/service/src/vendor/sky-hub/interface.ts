import { EvolutionDetail } from '../type'

export interface HistoryItem {
  id: number // 195884244
  type: string // 'PRIZE'
  transactionId: string // '0316256166'
  amount: number // 4000
  before: number // 345325
  after: number // 349325
  status: string // 'success'
  details: {
    game: {
      id: number // 4201
      type: string // 'baccarat'
      round: string // 'd5cefa2c-9536-4be8-b6c0-f00687c4c326'
      title: string // 'Korean Speed Baccarat A'
      vendor: string // 'EVOLUTION'
    }
  }
  user: {
    id: number // 90208
    username: string // 'ajatestkrw2'
  }
  external: {
    id: number // 834458196958000400
    detail: {
      data?: EvolutionDetail
      betlog?: {
        betdetail: EvolutionDetail
        roundid: string
        uuid: string
        transationid: string
        refid: string
      }
    }
  }
  processed_at: string // '2024-12-19T11:39:05.000Z'
  created_at: string // '2024-12-19T11:39:05.000Z'
}

export interface SkyHubResponse {}

export enum StatusCode {
  OK = 0,
  NOUSER = 1,
  INTERNAL = 2,
  INVALIDCURRENCY = 3,
  WRONGUSERNAMEPASSWORD = 4,
  ACCOUNTLOCKED = 5,
  ACCOUNTDISABLED = 6,
  NOTENOUGHMONEY = 7,
  MAXCONCURRENTCALLS = 8,
  SPENDINGBUDGETEXCEEDED = 9,
  SESSIONEXPIRED = 10,
  TIMEBUDGETEXCEEDED = 11,
  SERVICEUNAVAILABLE = 12,
}
