import { EvolutionDetail } from '../type'

export interface PacketBody {
  username: string
  amount: number
  transaction: {
    id: number // 1
    type: string // bet, win, cancel
    referer_id: number
    amount: number // -10000
    processed_at: string // 2021-07-01T00:00:00.000000Z
    target: {
      id: number
      username: string
      balance: number
    }
    details: {
      game: {
        id: string
        round: string
        title: string
        type: string
        vendor: string
      }
    }
  }
}

export interface BaseRequest {
  command: string
  request_timestamp: string // '2022-05-05 08:55:18'
  hash: string //'cc4870b85742577d2b0c1e1c361bfd0027ef2912'
}

export interface ChangeBalanceRequest extends BaseRequest {
  username: string // "tttaa22",
  amount: number // 10000,
  transaction: {
    id: number // 46266400320,
    type: string // "win",
    referer_id: number | null // 46266382683
    amount: number // 10000
    processed_at: string // "2024-10-17T13:17:54.000000Z",
    details: {
      game: {
        id: string // "p63cmvmwagteemoy",
        round: string // "17ff3fe88f6ff24c2a4ba3d6-sjdftnsyrtkceek6",
        title: string // "Korean Speed Baccarat A",
        type: string // "baccarat",
        vendor: string // "evolution"
      }
    }
    target: {
      id: number // 7844342,
      username: string // "tttaa22",
      balance: number // 100000,
      point: string // "0.00"
    }
  }
}

export interface HistoryItem {
  id: number // 41399745947
  type: string // 'win'
  amount: number // 0
  before: number // 678517
  status: string // 'success'
  details: {
    game: {
      id: string // 'onokyd4wn7uekbjx'
      type: string // 'baccarat'
      round: string // '17eea2a3e34da25323228800-sgb6edc7wzgclosd'
      title: string // 'Korean Speed Baccarat B'
      vendor: string // 'evolution'
    }
  }
  processed_at: string // '2024-08-24T10:15:54.000000Z'
  referer_id: number // 41399733422
  created_at: string // '2024-08-24T10:15:54.000000Z'
  user: {
    id: number // 7537932;
    username: string // 'tttaa99'
  }
  external: {
    id: number // 6061679160
    detail: {
      data: EvolutionDetail
    }
  }
}
