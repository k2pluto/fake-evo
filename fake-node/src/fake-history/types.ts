import { EvolutionHistoryItem } from '@service/src/vendor/evolution/interface'

export interface HonorLinkTransaction {
  id: number // 3938499479
  type: string // 'win'
  amount: number // 152000
  before: number // 33128450
  status: string // 'success'
  details: {
    game: {
      id: string // 'ndgvz5mlhfuaad6e'
      type: string // 'baccarat'
      round: string // '17389927b117353cdc6c873d-qwh3cvb6drovyshl'
      title: string // 'Speed Baccarat D'
      vendor: string // 'evolution'
    }
  }
  processed_at: string // '2023-01-09T09:14:41.000000Z'
  referer_id: number // 3938496485
  created_at: string // '2023-01-09T09:14:41.000000Z'
  user: {
    id: number // 2255993;
    username: string // 'bbcys0001'
  }
  external: {
    id: number // 1433735543
    detail: {
      data: EvolutionHistoryItem
    }
  }
}
