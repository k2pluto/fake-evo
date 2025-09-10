import { type EvolutionConfigData } from '@service/src/lib/interface/mongo/data-evolution-table'
import {
  type BaccaratHand,
  type BaccaratResult,
  type BettingStateType,
  type DealingStateType,
} from '@service/src/lib/interface/mongo/fake-game-data'
import { randomString } from './util'
import { type Chips } from './types'

export interface EvolutionRequest {
  id: string // 'qrdwizfr7jp6bjmhlbkso5pllk3teGo9'
  type: string
  args: unknown
  time: number
}

export interface ChatRequest {
  id: string // 'qrdwizfr7jp6bjmhlbkso5pllk3teGo9'
  type: 'chat.text'
  args: {
    mode: string // 'common'
    text: string // 'ㅇㅇ';
    orientation: string // 'landscape'
  }
}

export interface ChatResponse {
  id: string // '00000185066491ad003108a7efc4a7c7'
  type: 'chat.text'
  args: {
    messageId: string // 'qrdwizfr7jp6bjmhlbkso5pllk3teGo9'
    text: string // 'ㅇㅇ'
    source: {
      type: string // 'player'
      id: string // 'qrdwizfr7jp6bjmh'
      name: string // 'aaeaa22'
      casino: null
      tags: unknown[] // []
      warned: boolean // false
      privateChatAllowed: boolean // true
    }
    destination: {
      type: string // 'players'
      casino: string // 'skylinemtgsea101'
      casinos: string[] // ['skylinemtgsea101']
      table: string // 'onokyd4wn7uekbjx'
    }
    mode: string // 'common'
    time: number // 1670849532326
  }
  time: number // 1670849532333
}

export interface BalanceUpdated {
  id: string // '1672986216244-2587'
  type: 'balanceUpdated'
  args: {
    balance: number // 3000000
    balances: Array<{ id: 'combined'; version: number; amount: number }> // [{ id: 'combined'; version: 1672986216120; amount: 3000000 }]
    currencySymbol: string // '₩'
    currencyCode: string // 'KRW'
    tableId: string // 'onokyd4wn7uekbjx'
  }
  time: 1672986216244
}

export interface SettingsData {
  id: string // '0000018500c3a5540077d4a997f1d9e8'
  type: 'settings.data'
  args: {
    replyToId: string // 'lparfi2ki1'
    key: 'generic.common' | 'generic.mobile' | 'baccarat.common'
    data: any /* {
      lastSelectedChips: { baccarat: 2000; fantan: 1000; lightningdice: 1000 }
      lightningRouletteTutorialCounter: 1
    } */
  }
  time: number // 1670755099988
}

export interface WidgetAvailableTables {
  id: string // '0000018500c3a5540077d4a997f1d9e8'
  type: 'widget.availableTables'
  args: {
    availableTables: Array<{
      tableId: string
      tableName: string
      config: EvolutionConfigData
    }>
    playerConfig: {
      hiddenTables: string[]
      pinnedTables: string[]
    }
  }
  time: number // 1670755099988
}

export type BettingStatusType =
  | 'Betting' // 게임 베팅받을때의 처음 상태
  | 'Accepted' // 베팅을 했는데 베팅이 닫혔을 때의 접수 상태
  | 'Settled' // 접수 다음에 마감까지 끝났을 때 상태
  | 'Idle' // 베팅을 안했는데 베팅이 닫혔을 때 유휴 상태
  | 'Rejected' // 베팅이 서버에서 거절 됬을 때
  | 'Cancelled' // 라운드가 서버에서 취소 했을 때

export enum EvolutionBettingErrorCode {
  TimoutBetError = '1007', // 귀하의 베팅이 적시에 접수되지 않았습니다.
  ServerError = '1011',
  TableMaxError = '1012',
  TableMinError = '1013',
  SeamlessError = '1049', // 고객센터에 연락해주세요.
}

export type BetActionType = 'Chips' | 'Chip' | 'Undo' | 'UndoAll' | 'Double' | 'Repeat' | 'Move'

export interface PlayerBetRequest {
  id: string // 'mc72g7u5j1'
  type: string // 'baccarat.playerBetRequest'
  args: {
    replyId: string // 'baccarat.playerBetRequest-452367885-1670266231270'
    gameId: string // '172dfa4911f6ea2586e4aaad'
    timestamp: number // 1670266231270
    mwLayout: number // 8
    openMwTables: number // 1
    orientation: string // 'landscape'
    appVersion: number // 4
    btVideoQuality: string // 'HD'
    videoProtocol: string // 'fmp4'
    action: {
      name: BetActionType
      chips?: Record<string, number> // { Player: 5000 }
      chip?: {
        spot: string // 'Dragon';
        amount: number // 5000
      }
      betSpotFrom?: string // 'Tie' // 유저가 베팅칩을 마우스 드래그로 옳길 때 Move 액션이 들어오는데 From은 출발 장소
      betSpotTo?: string // 'Tie'// To는 도착 장소임 도착 장소가 없으면 칩을 삭제 하면 됨
    }
  }
}

export interface MultiPlayerBetRequest {
  id: string // '158tem7uqs'
  type: 'baccarat.playerBetRequest'
  args: {
    replyId: string // 'baccarat.playerBetRequest-160381565-1670908378260'
    gameId: string // '1730424e4fde8665db41f4a1'
    timestamp: number // 1670908378260
    tableId: string // 'NoCommBac0000001'
    mwLayout: number // 8
    openMwTables: number // 1
    orientation: string // 'landscape'
    appVersion: number // 4
    action: {
      name: 'Chips' | 'Undo' | 'UndoAll' | 'Double' | 'Repeat' | 'Move'
      chips?: Record<string, number> // { Player: 5000 }
      betSpotFrom?: string // 'Tie' // 유저가 베팅칩을 마우스 드래그로 옳길 때 Move 액션이 들어오는데 From은 출발 장소
      betSpotTo?: string // 'Tie'// To는 도착 장소임 도착 장소가 없으면 칩을 삭제 하면 됨
    }
  }
}

export type AcceptedBets = Record<string, { amount: number; payoff: number; limited?: boolean }>

export type RejectedBets = Record<string, { amount: number; error: string }>

export interface BettingState {
  status: BettingStatusType
  totalAmount: number // 1000
  currency: string // 'KRW'
  currentChips: Chips // {Player: 1000 }
  acceptedBets: AcceptedBets
  // balance?: number
  // balances?: { id: 'combined'; version: number; amount: number }[]
  rejectedBets: RejectedBets
  chipHistory: Array<Record<string, number>> // [{"Player": 2000}],
  timedChipHistory: Array<{ chips: Record<string, number>; timestamp: number }>
  lastGameChips: Chips // { Player: 1000 }
  canUndo: boolean // false
  canRepeat: {
    AllBets?: boolean // true
    MainOnly?: boolean // true
    MainAndPairs?: boolean // true
  }
  canDouble: boolean // false
  lastPlacedOn?: number // 1668412857468
  canDoubleTo?: number // 10000.0
  winType?: string // 'Medium'
  push?: boolean // false
}

export interface BaccaratPlayerBetResponse {
  id: string // '0000018448634ea9006b42f0d234ff52'
  type: string // 'baccarat.playerBetResponse'
  args: {
    gameId: string // '1724b98aabb6d8c2a9995c3a'
    // Player Bet Request timestamp와 같음
    timestamp: number // 1667661778163
    state: BettingState
    errorCode?: EvolutionBettingErrorCode
    tableId: string // 'onokyd4wn7uekbjx'
  }
  time: number // 1667661778601
}

export interface PlayerBettingState {
  id: string // '0000018475281c08004e7b268f7c9819'
  type: string // 'baccarat.playerBettingState'
  args: {
    gameId: string // '172764a6b66adacd7440be8c'
    idleRounds: number // 0
    state: BettingState & { balance?: string; balances?: Array<{ id: 'combined'; version: number; amount: number }> }
    restore: boolean // false
    version: number // 2254253643
    tableId: string // 'onokyd4wn7uekbjx'
  }
  time: number // 1668412873736
}

export type DragonTigerBettingStatusType =
  | 'Betting' // 게임 베팅받을때의 처음 상태
  | 'BetsAccepted' // 베팅을 했는데 베팅이 닫혔을 때의 접수 상태
  | 'Settled' // 접수 다음에 마감까지 끝났을 때 상태
  | 'Rejected' // 베팅이 서버에서 거절 됬을 때
  | 'Cancelled' // 라운드가 서버에서 취소 했을 때

export interface DragonTigerBetState {
  status: DragonTigerBettingStatusType
  chips?: Record<string, number> // { Dragon: 2000 }
  totalAmount: number // 2000
  double?: Record<string, number> // { Dragon: 4000 }
  undo?: Record<string, number> // {}
  balanceId: 'combined'
  acceptedBets?: Record<string, { amount: number }> // { Dragon: { amount: 2000 } }
  balances?: [
    {
      id: 'combined'
      version: number // 1677245387653;
      amount: number // 4762000
    },
  ]
}

export interface DragonTigerBetResponse {
  id: string // '00000186836968fc006cd04f0b0cbb10'
  type: string // 'dragontiger.bet'
  args: {
    gameId: string // '1746c2acc7e69ec6618874d2'
    replyId: string // 'dragontiger.bet-56970363-1677241968019'
    bets: DragonTigerBetState
    version: number // 2640827369
    errorCode?: number
  }
  time: number // 1677241968892
}

export interface DragonTigerBetsOpen {
  id: string // '00000186839b69530042d17dccfdc3f0'
  type: string // 'dragontiger.betsOpen'
  args: {
    gameId: string // '1746c5a86ce23c3f56aac76f'
    gameNumber: string // '13:27:18'
    bets?: DragonTigerBetState
    timeRemaining: number // 8641
    isBurning: false
    version: number // 2641064853
  }
  time: number // 1677245245779
}

export interface DragonTigerBetsClose {
  id: string // '00000186839bf1bb002fd181907f9370'
  type: string // 'dragontiger.betsClosed'
  args: {
    gameId: string // '1746c5ae87d633c0f6d6326f';
    gameNumber: string // '13:27:44'
    version: number // 2641067974
  }
  time: number // 1677245280699
}

export interface DragonTigerBets {
  id: string // '00000186839d942a0071d18c2a7bb91b'
  type: string // 'dragontiger.bets'
  args: {
    gameId: string // '1746c5c6c9451204edac6c52'
    bets: DragonTigerBetState /* {
      status: string // 'BetsAccepted'
      chips: { [spot: string]: number } // { Dragon: 2000 }
      totalAmount: number // 2000
      acceptedBets: { [spot: string]: { amount: number } } // { Dragon: { amount: 2000 } }
      balanceId: 'combined'
      balances: [
        {
          id: 'combined'
          version: number // 1677245387653;
          amount: number // 4762000
        },
      ]
    } */
    version: number // 2641076857
  }
  time: number // 1677245387818
}

export interface BettingStats {
  id: string // '00000185b568b7b20086ed45251410e7'
  type: string // 'baccarat.bettingStats'
  args: {
    gameId: string // '173a7b506a5653e07bc7ede2'
    stats: Record<
      string,
      {
        amount: number
        players: number
        percentage: number
      }
    > // { Tie: { amount: 6000; players: 2; percentage: 1; }, Player: { amount: 1307201; players: 15; percentage: 48; }, Banker: { amount: 1340000; players: 12; percentage: 51 } }
    watchers: number // 250
    bettors: number // 29
    tableId: string // 'p63cmvmwagteemoy'
  }
  time: number // 1673785817010
}

export interface BaccaratGameData {
  playerHand: BaccaratHand
  bankerHand: BaccaratHand
  winningProbabilities?: {
    Player: number // 44.6;
    Banker: number // 45.9
  }
  lightningMultipliers?: Array<{
    card: string // 'JC'
    value: number // 2
  }>
  result?: BaccaratResult
  winningSpots?: string[]
  redEnvelopePayouts?: Record<string, number> // { BankerPair: 15}
}

export interface GameStateData {
  gameId: string // '1724b65d9398c46268cc013d'
  gameNumber: string // '14:24:35'
  betting: BettingStateType
  dealing: DealingStateType
  isBurning: boolean // false
  gameData: BaccaratGameData
  cuttingCard: boolean // false
  version: number // 2201049722
  tableId: string // 'onokyd4wn7uekbjx'
}

export interface GameStatePacket {
  id: string // '00000184482e0fcd00813f84fb208793'
  type: string // 'baccarat.gameState'
  args: GameStateData
  time: number // 1667658289101
}

export interface TableState {
  id: string // '1693062306256-1977'
  type: string // 'baccarat.tableState'
  args: {
    tableId: string // 'onokyd4wn7uekbjx'
    tableName: string // 'Korean Speed Baccarat B'
    currentGame: GameStateData
    previousGameNumber: string // '15:04:23'
    dealer: {
      screenName: string // 'Bob'
    }
    active: true
    shoeCardsOut: number // 115
    version: number // 4170040741
  }
  time: number // 1693062306256
}

export interface GameWinner {
  id: string // '00000184d8142908008af94adb0fc0ec'
  type: string // 'baccarat.gameWinners'
  args: {
    gameId: string // '172d4a147d6cc9d52569f1a9'
    totalWinners: number // 107
    totalAmount: number // 16024525.2
    // [{ playerId: 'qta54fqxlt26u7fu'; screenName: 'choice1651_6136'; winnings: 5850000.0; multiplier: [] }]
    winners: Array<{ playerId?: string; screenName: string; winnings: number; multiplier?: any[] }>
    tableId: string // 'p63cmvmwagteemoy'
  }
  time: number //  1670072510728
}
export interface Resolved {
  id: string
  type: string
  args: {
    bets: BettingState
    gameId: string
    gameNumber: string
    result: BaccaratResult
    tableId: string
    version: number
    winningSpots: string[]
    withLightning?: boolean
  }
  time: number
}

export interface UnsubscribePacket {
  id: string // 'g1dks56wpy'
  type: 'connection.unsubscribe'
  args: {
    tableId?: string // 'zixzea8nrf1675oh'
  }
}

export interface ClientBetChipPacket {
  log: {
    type: 'CLIENT_BET_CHIP'
    value: {
      type: string // 'Chip'
      codes: Record<string, number> // { BAC_Player: 5000 }
      amount: number // 5000
      bets: Chips // { Player: 5000 }
      gameType: string // 'baccarat'
      gameTime: string // '21:59:36'
      userAgent: string // 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.50'
      balance: number // 7290750
      currency: string // 'KRW'
      chipStack: number[] // [1000, 2000, 5000, 25000, 100000, 500000, 1000000, 5000000]
      defaultChip: number // 1
      tableMinLimit: number // 1000
      tableMaxLimit: number // 20000000
      gameId?: string // '1745f5df705570922753c00a'
      channel: string // 'PCMac'
      orientation: string // 'landscape'
      gameDimensions: { width: 1187; height: 667.6875 }
    }
    username: string // 'baaaaeaa22'
    tableId: string // 'p63cmvmwagteemoy'
  }
}

export interface ClientBetAcceptedPacket {
  log: {
    type: 'CLIENT_BET_ACCEPTED'
    value: {
      originalBet: Chips // { Player: 5000 }
      confirmed: Chips // { Player: 5000 }
      layout: string // 'ImmersiveV2'
      status: string // 'Settled'
      balance: number // 9628700
      latency: number // 372
      bets: Chips // { Player: 5000 }
      gameType: string // 'baccarat'
      gameTime: string // '04:47:05'
      userAgent: string // 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
      currency: string // 'KRW'
      chipStack: number[] // [1000, 2000, 5000, 25000, 100000, 500000, 1000000, 5000000]
      tableMinLimit: number // 1000
      tableMaxLimit: number // 25000000
      gameId: string // '17dee91ebd955c2aaf41eb55'
      channel: string // 'PCMac'
      orientation: string // 'landscape'
      gameDimensions: { width: 1400; height: 787.5 }
    }
  }
}

export function makeUnsubscribePacket(params?: { tableId?: string }): UnsubscribePacket {
  return {
    id: randomString(),
    type: 'connection.unsubscribe',
    args: { ...params },
  }
}
