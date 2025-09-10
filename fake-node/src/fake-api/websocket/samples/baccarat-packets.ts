export const playerBettingStateLightningAccepted = {
  id: '1693315102308-6846',
  type: 'baccarat.playerBettingState',
  args: {
    gameId: '177fdd1926b17e837687a28d',
    idleRounds: 0,
    state: {
      status: 'Accepted',
      totalAmount: 2400.0,
      currency: 'KRW',
      currentChips: { Player: 2000.0, PlayerLightning: 400.0 },
      acceptedBets: {
        Player: { amount: 2000.0, payoff: 0.0, limited: false },
        PlayerLightning: { amount: 400.0, payoff: 0.0, limited: false },
      },
      rejectedBets: {},
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: { Player: 2000.0, PlayerLightning: 400.0 },
      canUndo: false,
      canRepeat: {},
      canDouble: false,
      lastPlacedOn: 1693315094498,
      balances: [{ id: 'combined', version: 1693315102139, amount: 210517 }],
    },
    restore: false,
    version: 3745353198,
    tableId: 'LightningBac0001',
  },
  time: 1693315102308,
}

export const playerBettingStateCancelled = {
  id: '000001876642f072007e80aee1361175',
  type: 'baccarat.playerBettingState',
  args: {
    gameId: '1754480cee6f2b29021c29bf',
    idleRounds: 0,
    state: {
      status: 'Cancelled',
      totalAmount: 0,
      currency: 'KRW',
      currentChips: {},
      acceptedBets: {
        Tie: {
          amount: 3000,
          payoff: 3000,
          limited: false,
        },
        Player: {
          amount: 14000,
          payoff: 14000,
          limited: false,
        },
        PlayerPair: {
          amount: 2000,
          payoff: 2000,
          limited: false,
        },
        BankerPair: {
          amount: 2000,
          payoff: 2000,
          limited: false,
        },
      },
      rejectedBets: {},
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: {
        Tie: 3000,
        Player: 14000,
        PlayerPair: 2000,
        BankerPair: 2000,
      },
      canUndo: false,
      canRepeat: {},
      canDouble: false,
    },
    restore: false,
    version: 1267087763,
    tableId: 'nmwdzhbg7hvqh6a7',
  },
  time: 1681047875698,
}

export const playerBettingStateRejected = {
  id: '00000187662ad56d003cec9537224353',
  type: 'baccarat.playerBettingState',
  args: {
    gameId: '175446afa58380d3230fb891',
    idleRounds: 0,
    state: {
      status: 'Rejected',
      totalAmount: 0,
      currency: 'KRW',
      currentChips: {},
      acceptedBets: {},
      rejectedBets: {
        Banker: {
          amount: 1000,
          error: '1049',
        },
      },
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: {
        Banker: 1000,
      },
      canUndo: false,
      canRepeat: {},
      canDouble: false,
      lastPlacedOn: 1681046281894,
    },
    restore: false,
    version: 196101191,
    tableId: 'qgqrhfvsvltnueqf',
  },
  time: 1681046295917,
}

export const playerBettingStateAccepted = {
  id: '1690448485077-622',
  type: 'baccarat.playerBettingState',
  args: {
    gameId: '1775aded8fc05bbcabb9125e',
    idleRounds: 0,
    state: {
      status: 'Accepted',
      totalAmount: 5000.0,
      currency: 'KRW',
      currentChips: { Player: 5000.0 },
      acceptedBets: { Player: { amount: 5000.0, payoff: 0.0, limited: false } },
      rejectedBets: {},
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: { Player: 5000.0 },
      canUndo: false,
      canRepeat: {},
      canDouble: false,
      lastPlacedOn: 1690448476304,
      balances: [{ id: 'combined', version: 1690448484959, amount: 485000 }],
    },
    restore: false,
    version: 3972804271,
    tableId: 'onokyd4wn7uekbjx',
  },
  time: 1690448485077,
}

export const playerBettingStatePartialAccepted = {
  id: '1691416745966-5794',
  type: 'baccarat.playerBettingState',
  args: {
    gameId: '17791e8e63ffdfecd0f95115',
    idleRounds: 0,
    state: {
      status: 'Accepted',
      totalAmount: 1000.0,
      currency: 'KRW',
      currentChips: { Player: 1000.0 },
      acceptedBets: { Player: { amount: 1000.0, payoff: 0.0, limited: false } },
      rejectedBets: { PlayerBonus: { amount: 500.0, error: '1013' } },
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: { PlayerBonus: 500.0, Player: 1000.0 },
      canUndo: false,
      canRepeat: {},
      canDouble: false,
      lastPlacedOn: 1691416735806,
      balances: [{ id: 'combined', version: 1691416745837, amount: 680690.6 }],
    },
    restore: false,
    version: 891574956,
    tableId: 'puu4yfymic3reudn',
  },
  time: 1691416745966,
}

export const playerBettingStateSettled = {
  id: '1690991405740-3666',
  type: 'baccarat.playerBettingState',
  args: {
    gameId: '17779bb45f13f7c28b632e04',
    idleRounds: 0,
    state: {
      status: 'Settled',
      totalAmount: 5000.0,
      currency: 'KRW',
      currentChips: { Player: 5000.0 },
      acceptedBets: { Player: { amount: 5000.0, payoff: 10000.0, limited: false } },
      rejectedBets: {},
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: { Player: 5000.0 },
      canUndo: false,
      canRepeat: {},
      canDouble: false,
      lastPlacedOn: 1690991388231,
      winType: 'Medium',
      push: false,
    },
    restore: false,
    version: 4013981173,
    tableId: 'onokyd4wn7uekbjx',
  },
  time: 1690991405740,
}

export const playerBettingStateIdle = {
  id: '1690448510390-4377',
  type: 'baccarat.playerBettingState',
  args: {
    gameId: '1775adf392ec118c06a1c70e',
    idleRounds: 1,
    state: {
      status: 'Idle',
      totalAmount: 0.0,
      currency: 'KRW',
      currentChips: {},
      acceptedBets: {},
      rejectedBets: {},
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: { Player: 5000.0 },
      canUndo: false,
      canRepeat: {},
      canDouble: false,
      lastPlacedOn: 1690448476304,
    },
    restore: false,
    version: 3972805863,
    tableId: 'onokyd4wn7uekbjx',
  },
  time: 1690448510390,
}

export const playerBettingStateBetting = {
  id: '1690448459008-2071',
  type: 'baccarat.playerBettingState',
  args: {
    gameId: '1775ade7b4287bed98f6a1c8',
    idleRounds: 0,
    state: {
      status: 'Betting',
      totalAmount: 0.0,
      currency: 'KRW',
      currentChips: {},
      acceptedBets: {},
      rejectedBets: {},
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: {},
      canUndo: false,
      canRepeat: { AllBets: false, MainOnly: false, MainAndPairs: false },
      canDouble: false,
    },
    restore: true,
    version: 3972802185,
    tableId: 'onokyd4wn7uekbjx',
  },
  time: 1690448459008,
}

export const resolved = {
  id: '1690991405768-1626',
  type: 'baccarat.resolved',
  args: {
    gameId: '17779bb45f13f7c28b632e04',
    gameNumber: '15:49:44',
    bets: {
      status: 'Settled',
      totalAmount: 5000.0,
      currency: 'KRW',
      currentChips: { Player: 5000.0 },
      acceptedBets: { Player: { amount: 5000.0, payoff: 10000.0, limited: false } },
      rejectedBets: {},
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: { Player: 5000.0 },
      canUndo: false,
      canRepeat: {},
      canDouble: false,
      lastPlacedOn: 1690991388231,
      winType: 'Medium',
      push: false,
    },
    result: { winner: 'Player', playerScore: 9, bankerScore: 0, playerPair: false, bankerPair: false, natural: true },
    winningSpots: ['Player', 'Small', 'PlayerBonus'],
    version: 4013981173,
    tableId: 'onokyd4wn7uekbjx',
  },
  time: 1690991405768,
}

export const widgetResolved = {
  id: '1691137440250-9415',
  type: 'widget.resolved',
  args: {
    gameId: '177820829c8766f1a0d9de28',
    gameNumber: '08:23:25',
    result: { winner: 'Banker', playerScore: 3, bankerScore: 9, playerPair: false, bankerPair: false, natural: true },
    winningSpots: ['Small', 'BankerBonus', 'Banker'],
    version: 4024099139,
    tableId: 'onokyd4wn7uekbjx',
  },
  time: 1691137440250,
}

export const baccaratTableState = {
  id: '1693062306256-1977',
  type: 'baccarat.tableState',
  args: {
    tableId: 'onokyd4wn7uekbjx',
    tableName: 'Korean Speed Baccarat B',
    currentGame: {
      gameId: '177ef72ed91fbf562eb4c9e0',
      gameNumber: '15:04:50',
      betting: 'BetsClosed',
      dealing: 'Dealing',
      isBurning: false,
      gameData: {
        playerHand: { cards: [], score: 0 },
        bankerHand: { cards: [], score: 0 },
        redEnvelopePayouts: {},
        winningProbabilities: { Player: 44.6, Banker: 45.9 },
      },
      cuttingCard: false,
      version: 4170040741,
    },
    previousGameNumber: '15:04:23',
    dealer: { screenName: 'Bob' },
    active: true,
    shoeCardsOut: 115,
    version: 4170040741,
  },
  time: 1693062306256,
}

// 제일 처음에 테이블에 들어갔을 때
// 딜링이나 결과가 나올 때 베팅을 했으면 Accepted이고 아니면 Idle 이다.
// 만약 베팅중이면 Betting 이다.

// 서버에서 idleRounds가 14까지 패킷이 오고 15이상이면 튕기게 된다.

// 베팅을 해서 lastGameChips 가 있으면 Betting -> Idle(베팅 마감 시) 순서로 패킷이 오고
// 없으면 Betting -> Betting 순서로 Idle 패킷이 스킵된 순서로 온다.

// lastGameChips 는 마지막으로 베팅하고 5분 후에 로비로 나갔다가 들어오는 순간 사라진다.

// 베팅이 일어났는데 승인되면 Betting -> Accepted -> Settled 로 패킷이 온다.
// 베팅이 일어났는데 거절나면 Betting -> Rejected 로 패킷이 온다.
// 베팅이 일어났는데 결과가 취소가 나면 Betting -> Accepted -> Cancelled 로 패킷이 온다.

// 베팅을 하고 betting 단계에서 새로 고침을 하면 PlayerBettingState Betting이 온다.
// 베팅을 하고 dealing 단계에서 새로 고침을 하면 PlayerBettingState Accepted가 온다.

// 베팅이 승인되면 결과처리는 다음과 같은 순서로 패킷이 온다. 2023.08.03
// baccart.playerBettingState Accepted
// baccarat.gameState BetsClosed Dealing
// baccarat.cardDealt
// baccarat.dealRequest
// baccarat.cardDealt
// baccarat.dealRequest
// baccarat.cardDealt
// baccarat.playerBettingState Settled
// baccarat.encodedShoeState
// baccarat.cardDealt
// baccarat.resolved
// baccarat.gameWinners
// widget.resolved
// baccarat.gameState BetClosed Finished

// baccarat.newGame
// baccarat.gameState BetOpen Idle
// baccarat.playerBettingState Betting
