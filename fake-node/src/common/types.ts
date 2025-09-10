import { type BaccaratHand, type BaccaratResult } from '@service/src/lib/interface/mongo/fake-game-data'

export type Chips = Record<string, number>

export interface EvolutionSetupData {
  lang: string // 'ko'
  locale: string // 'ko'
  user_id: string // 'qqxchfpw2bcrodm3'
  player_id: string // '1769832'
  casino_id: string // 'babylonkrst20001'
  session_id: string // 'qqxchfpw2bcrodm3qqxchfp52bcrodm445fad4fbf077b5c345cdb3b3ba90008fb28a1ce8e72752bd'
  bare_session_id: string // 'qqxchfpw2bcrodm3qqxchfp52bcrodm445fad4fb'
  version: string // '7.20221025-release-1-556dc9e2-43'
  currencyCode: string // 'KRW'
  currencySymbol: string // '₩'
  currencyMult: number // 1000
  currencyDecimals: number // 0
  view: string // 'view1'
  client: string // 'default'
  site: string // '1'
  clientApiV2: {
    release: string // 'disabled'
  }
  AAMS: string // '0'
  wrapped: boolean // true
  lobby: {
    version: string // '3'
    recentGamesWidgetEnabled: number // false
    thumbnailsCdnHost: string // 'bshots.egcvi.com'
    miniLobbyEnabled: boolean // false
    rngEnabled: boolean // true
    flipbook: boolean // true
    multiplayWidget: {
      enabled: boolean // true
      chipStack: number[] // [1000, 5000, 25000, 50000, 100000, 500000, 1000000, 1500000]
      defaultChip: number // 1
      categoryIds: string[] // ['baccarat', 'baccarat_sicbo']
    }
    recommenderEnabled: boolean // true
    recommenderTopGamesEnabled: boolean // true
    blackjackOrder: {
      byBetLimit: boolean // true;
      fullTablesDown: boolean // true;
      dedicatedAfterFree: boolean // false;
      dedicatedAtTop: boolean // false
    }
    brandingName: null
  }
  chat: {
    serverHost: string // 'babylonkrst2.evo-games.com';
    showPublicChat: boolean // true
    showPrivateChat: boolean // true
    'screen.name': string // 'aa11'
  }
  screenNameChanges: {
    enabled: boolean // true
    count: number // 0
    'players-change-screen-name.limit.count': number // 3
    'players-change-screen-name.limit.time-frame.days': number // 90
  }
  casinoConfig: {
    specificBets: unknown[] // []
    maxOpenFrames: string // '4'
    html5MultiWindow: string // 'true'
    flexPilot: string // 'false'
    closedTableLastActivityIgnore: string // 'false'
    freeGamesEnabled: string // 'false'
    isCompatibleLauncherEnabled: string // 'true'
    balancePushApiEnabled: boolean // false
    gameIdInHistory: boolean // false
    compliance: {
      mga: boolean // false
      uk: boolean // false
      ukWrapper: boolean // false
      aams: boolean // false
      dk: boolean // false
      swe: boolean // false
      esp: boolean // false
      de: boolean // false
      arg: boolean // false
      caOn: boolean // false
    }
    gameClientUrl: string // '/frontend/evo/r2/'
  }
  cdn_host: string // 'https://static.egcdn.com'
  geo: {
    country: string // 'KR'
  }
  abTestingIds: unknown[] // []
  'video.token.issuer': string // 'L1y6qreNLS'
  branding: string // 'view1:lobby'
}

export interface EvolutionGameState {
  id: string // '00000184482e0fcd00813f84fb208793'
  type: string // 'baccarat.gameState'
  args: {
    gameId: string // '1724b65d9398c46268cc013d'
    gameNumber: string // '14:24:35'
    betting: 'BetsOpen' | 'BetsClosed'
    dealing: 'Idle' | 'Dealing' | 'Finished' | 'Lightning'
    isBurning: boolean // false
    gameData: {
      playerHand: BaccaratHand
      bankerHand: BaccaratHand
      winningProbabilities?: {
        Player: number // 44.6;
        Banker: number // 45.9
      }
      result?: BaccaratResult
      winningSpots?: string[]
      redEnvelopePayouts?: Record<string, number> // { BankerPair: 15}
    }
    cuttingCard: boolean // false
    version: number // 2201049722
    tableId: string // 'onokyd4wn7uekbjx'
  }
  time: number // 1667658289101
}

export interface EvolutionPotentialMultipliers {
  id: string // '0000018483ebda960090ca4f61dcfde6'
  type: string // 'baccarat.potentialMultipliers'
  args: {
    gameId: string // '172845ef79df579369e4c44c'
    multipliers:
      | Array<{
          card: string // '7D'
          value: number // 5
        }>
      | Record<string, number>
    restore: boolean // false
    version: number // 2308911861
    tableId: string // 'LightningBac0001'
  }
  time: number // 1668660583062
}

export interface EvolutionResolved {
  args: {
    gameId: string
    gameNumber: string
    result: BaccaratResult
    tableId: string
    version: number
    winningSpots: string[]
    withLightning?: boolean
  }
  id: string
  time: number
  type: string
}

export interface EvolutionCardDealt {
  id: string // '0000018471bd0453008f3ed5275011ad'
  type: string // 'baccarat.cardDealt'
  args: {
    gameId: string // '1727307d502e1fffad4ef4cb'
    card: string // '7D'
    spot: string // 'Banker'
    gameData: {
      playerHand: BaccaratHand // { cards: ['5H', '9S']; score: 4 }
      bankerHand: BaccaratHand // { cards: ['KS', '7D']; score: 7 }
      redEnvelopePayouts?: Record<string, number> // {}
      winningProbabilities: {
        Player: number // 44.6;
        Banker: number // 45.9
      }
    }
    version: number // 2250679493
    tableId: string // 'onokyd4wn7uekbjx'
  }
  time: number // 1668355523667
}

export interface DragonTigerCardDealt {
  id: '0000018683de92cf006cd322981033fb'
  type: 'dragontiger.cardDealt'
  args: {
    gameId: string // '1746c9a608982864bdc87bfb'
    gameNumber: string // '14:40:26'
    cards: {
      Dragon: {
        card: string // '7C';
        score: number // 7
      }
      Tiger?: {
        card: string // 'KS';
        score: number // 13
      }
    }
    version: number // 2641403004
  }
  time: number // 1677249647311
}

export interface EvolutionBetRequest {
  tableId: string // 원래 없는건데 페이크 클라에서 추가한 변수임 리턴할 때는 삭제 시켜야 함
  replyId: string // 'baccarat.playerBetRequest-228488377-1667661554118'
  gameId: string // '1724b95892c2f23240d1683e'
  timestamp: number // 1667661554118
  mwLayout: number // 8
  openMwTables: number // 1
  orientation: string // 'landscape'
  appVersion: number // 4
  btVideoQuality: string // 'HD'
  videoProtocol: string // 'fmp4'
  action: {
    name: 'Chips' | 'Undo' | 'Double' | 'Repeat' | 'Move'
    chips?: Chips // { Player: 5000 }
    betSpotFrom?: string // 'Tie' // 유저가 베팅칩을 마우스 드래그로 옳길 때 Move 액션이 들어오는데 From은 출발 장소
    betSpotTo?: string // 'Tie'// To는 도착 장소임 도착 장소가 없으면 칩을 삭제 하면 됨
  }
}

export interface EvolutionBetResponse {
  id: string // '0000018448634ea9006b42f0d234ff52'
  type: string // 'baccarat.playerBetResponse'
  args: {
    gameId: string // '1724b98aabb6d8c2a9995c3a'
    timestamp: number // 1667661778163
    state: {
      status: string // 'Betting'
      totalAmount: number // 5000.0
      currency: string // 'KRW'
      currentChips: Chips // { Player: 5000.0 }
      acceptedBets: unknown // {}
      rejectedBets: unknown // {}
      chipHistory: unknown[] // [{}]
      timedChipHistory: Array<{
        chips: Chips // {};
        timestamp: number // 1667661777243
      }>
      lastGameChips: Chips // { Player: 5000.0 }
      canUndo: boolean // true
      canRepeat: {
        AllBets: boolean // true;
        MainOnly: boolean // true
        MainAndPairs: boolean // true
      }
      canDouble: boolean // true
      lastPlacedOn: number // 1667661721148
      canDoubleTo: number // 10000.0
    }
    tableId: string // 'onokyd4wn7uekbjx'
  }
  time: number // 1667661778601
}
