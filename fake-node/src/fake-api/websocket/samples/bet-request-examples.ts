/*
Bet Request Examples
Action chip Example
{
  id: 'rmojinn2kj',
  type: 'baccarat.playerBetRequest',
  args: {
    replyId: 'baccarat.playerBetRequest-873488332-1672728735863',
    gameId: '1736b9eb4351fb5ae6d3afb8',
    timestamp: 1672728735863,
    mwLayout: 8,
    openMwTables: 1,
    orientation: 'landscape',
    appVersion: 4,
    btVideoQuality: 'HD',
    videoProtocol: 'fmp4',
    action: { name: 'Chips', chips: { Player: 5000 } },
  },
}

Action Undo Example
{
  id: '7j56wji90s',
  type: 'baccarat.playerBetRequest',
  args: {
    replyId: 'baccarat.playerBetRequest-596320926-1672728739843',
    gameId: '1736b9eb4351fb5ae6d3afb8',
    timestamp: 1672728739843,
    mwLayout: 8,
    openMwTables: 1,
    orientation: 'landscape',
    appVersion: 4,
    btVideoQuality: 'HD',
    videoProtocol: 'fmp4',
    action: { name: 'Undo' },
  },
}

Action Repeat Example
{
  id: 'ferdq4movj',
  type: 'baccarat.playerBetRequest',
  args: {
    replyId: 'baccarat.playerBetRequest-725281000-1672728853203',
    gameId: '1736ba057e3364937ce6cb17',
    timestamp: 1672728853203,
    mwLayout: 8,
    openMwTables: 1,
    orientation: 'landscape',
    appVersion: 4,
    btVideoQuality: 'HD',
    videoProtocol: 'fmp4',
    action: { name: 'Repeat', mode: 'MainAndPairs' },
  },
}

Action Move Success Example
{
  id: '28i6y1483g',
  type: 'baccarat.playerBetRequest',
  args: {
    replyId: 'baccarat.playerBetRequest-141812309-1672728854600',
    gameId: '1736ba057e3364937ce6cb17',
    timestamp: 1672728854600,
    mwLayout: 8,
    openMwTables: 1,
    orientation: 'landscape',
    appVersion: 4,
    btVideoQuality: 'HD',
    videoProtocol: 'fmp4',
    action: { name: 'Move', betSpotFrom: 'Player', betSpotTo: 'Tie' },
  },
}

Action Remove Success Example
{
  id: 'i2vgzu5c2a',
  type: 'baccarat.playerBetRequest',
  args: {
    replyId: 'baccarat.playerBetRequest-179439194-1672728855682',
    gameId: '1736ba057e3364937ce6cb17',
    timestamp: 1672728855682,
    mwLayout: 8,
    openMwTables: 1,
    orientation: 'landscape',
    appVersion: 4,
    btVideoQuality: 'HD',
    videoProtocol: 'fmp4',
    action: { name: 'Move', betSpotFrom: 'Tie' },
  },
}

*/

/*
Bet Response Examples
Action chip Success Example
{
  id: '00000185765f86cb00749966e4429663',
  type: 'baccarat.playerBetResponse',
  args: {
    gameId: '1736b976b64eca0db486cb65',
    timestamp: 1672728249389,
    state: {
      status: 'Betting',
      totalAmount: 30000.0,
      currency: 'KRW',
      currentChips: { Player: 25000.0, PlayerLightning: 5000.0 },
      acceptedBets: {},
      rejectedBets: {},
      chipHistory: [{}],
      timedChipHistory: [{ chips: {}, timestamp: 1672728250053 }],
      lastGameChips: {},
      canUndo: true,
      canRepeat: { AllBets: false, MainOnly: false, MainAndPairs: false },
      canDouble: true,
      canDoubleTo: 50000.0,
    },
    tableId: 'gwbaccarat000001',
  },
  time: 1672728250059,
}

Action Repeat Success Example
{
  id: '00000185766cdab4007b99d90e20f526',
  type: 'baccarat.playerBetResponse',
  args: {
    gameId: '1736ba45bb5c5bce45613b49',
    timestamp: 1672729122826,
    state: {
      status: 'Betting',
      totalAmount: 30000.0,
      currency: 'KRW',
      currentChips: { Player: 25000.0, PlayerLightning: 5000.0 },
      acceptedBets: {},
      rejectedBets: {},
      chipHistory: [{}],
      timedChipHistory: [{ chips: {}, timestamp: 1672729123502 }],
      lastGameChips: { Player: 25000.0, PlayerLightning: 5000.0 },
      canUndo: true,
      canRepeat: { AllBets: true, MainOnly: true, MainAndPairs: true },
      canDouble: true,
      lastPlacedOn: 1672729082266,
      canDoubleTo: 50000.0,
    },
    tableId: 'gwbaccarat000001',
  },
  time: 1672729123508,
}

Action Undo Success Example
{
  id: '0000018576615e6700759977f36379ec',
  type: 'baccarat.playerBetResponse',
  args: {
    gameId: '1736b99614f5f7db40e64535',
    timestamp: 1672728370120,
    state: {
      status: 'Betting',
      totalAmount: 0.0,
      currency: 'KRW',
      currentChips: {},
      acceptedBets: {},
      rejectedBets: {},
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: { Player: 25000.0, PlayerLightning: 5000.0 },
      canUndo: false,
      canRepeat: { AllBets: true, MainOnly: true, MainAndPairs: true },
      canDouble: false,
      lastPlacedOn: 1672728250053,
    },
    tableId: 'gwbaccarat000001',
  },
  time: 1672728370791,
}

Action Move Success Example
{
  id: '000001857662a0e3003899832c96b2a4',
  type: 'baccarat.playerBetResponse',
  args: {
    gameId: '1736b9a84d157a1efd355ccf',
    timestamp: 1672728452666,
    state: {
      status: 'Betting',
      totalAmount: 30000.0,
      currency: 'KRW',
      currentChips: { Tie: 25000.0, TieLightning: 5000.0 },
      acceptedBets: {},
      rejectedBets: {},
      chipHistory: [{ Player: 25000.0, PlayerLightning: 5000.0 }, {}],
      timedChipHistory: [
        { chips: { Player: 25000.0, PlayerLightning: 5000.0 }, timestamp: 1672728453332 },
        { chips: {}, timestamp: 1672728447595 },
      ],
      lastGameChips: { Player: 25000.0, PlayerLightning: 5000.0 },
      canUndo: true,
      canRepeat: { AllBets: true, MainOnly: true, MainAndPairs: true },
      canDouble: true,
      lastPlacedOn: 1672728370784,
      canDoubleTo: 50000.0,
    },
    tableId: 'gwbaccarat000001',
  },
  time: 1672728453347,
}

Action Remove Success Example
{
  id: '000001857662a5040046998358a3102b',
  type: 'baccarat.playerBetResponse',
  args: {
    gameId: '1736b9a84d157a1efd355ccf',
    timestamp: 1672728453733,
    state: {
      status: 'Betting',
      totalAmount: 0.0,
      currency: 'KRW',
      currentChips: {},
      acceptedBets: {},
      rejectedBets: {},
      chipHistory: [{ Tie: 25000.0, TieLightning: 5000.0 }, { Player: 25000.0, PlayerLightning: 5000.0 }, {}],
      timedChipHistory: [
        { chips: { Tie: 25000.0, TieLightning: 5000.0 }, timestamp: 1672728454399 },
        { chips: { Player: 25000.0, PlayerLightning: 5000.0 }, timestamp: 1672728453332 },
        { chips: {}, timestamp: 1672728447595 },
      ],
      lastGameChips: { Player: 25000.0, PlayerLightning: 5000.0 },
      canUndo: true,
      canRepeat: { AllBets: true, MainOnly: true, MainAndPairs: true },
      canDouble: false,
      lastPlacedOn: 1672728370784,
    },
    tableId: 'gwbaccarat000001',
  },
  time: 1672728454404,
}

Action Chip Error Example
{
  id: '0000018575bce17e006e944d08a957bd',
  type: 'baccarat.playerBetResponse',
  args: {
    gameId: '1736afc56a6b7b5e4e0847a7',
    timestamp: 1672717591803,
    state: {
      status: 'Betting',
      totalAmount: 6000,
      currency: 'KRW',
      currentChips: {
        BankerLightning: 600,
        PlayerPair: 1000,
        TieLightning: 200,
        PlayerPairLightning: 200,
        Banker: 3000,
        Tie: 1000,
      },
      acceptedBets: {},
      rejectedBets: {},
      chipHistory: [],
      timedChipHistory: [],
      lastGameChips: {
        BankerLightning: 600,
        PlayerPair: 1000,
        TieLightning: 200,
        PlayerPairLightning: 200,
        Banker: 3000,
        Tie: 1000,
      },
      canUndo: false,
      canRepeat: {},
      canDouble: false,
      lastPlacedOn: 1672717590437,
    },
    errorCode: '1007',
    tableId: 'gwbaccarat000001',
  },
  time: 1672717590910,
}
*/
