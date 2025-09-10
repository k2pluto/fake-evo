export interface EvolutionDetail {
  id: string // '17eea2a3e34da25323228800'
  table: {
    id: string // 'onokyd4wn7uekbjx';
    name: string // 'Korean Speed Baccarat B'
  }
  dealer: {
    uid: string // 'tts165726_______';
    name: string // 'Hana'
  }
  result: {
    banker: any // { cards: ['2C', '4H']; score: 6 }
    player: any // { cards: ['AD', '9H', '2D']; score: 2 }
    outcome: string // 'Banker'
    sideBetBankerPair: string // 'Lose'
    sideBetEitherPair: string // 'Lose'
    sideBetPlayerPair: string // 'Lose'
    redEnvelopePayouts: any[] // []
    sideBetBankerBonus: string // 'Win'
    sideBetPerfectPair: string // 'Lose'
    sideBetPlayerBonus: string // 'Lose'
  }
  status: string // 'Resolved'
  gameType: string // 'baccarat'
  settledAt: string // '2024-08-24T10:15:54.493Z'
  startedAt: string // '2024-08-24T10:15:32.108Z'
  gameProvider: string // 'evolution'
  participants: {
    bets: {
      code: string // 'BAC_Player'
      stake: number // 10000
      payout: number // 0
      placedOn: string // '2024-08-24T10:15:45.671Z'
      description: string // ''
      transactionId: string // '724250013008184503'
    }[]

    currency: string // 'KRW'
    playerId: string // '7537932'
    playerGameId: string // '17eea2a3e34da25323228800-sgb6edc7wzgclosd'
    currencyRateVersion: string // 'sga27ltay4zaaaad'
  }[]
}
