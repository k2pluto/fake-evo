export const betRequest = {
  id: 'yao121o4r3',
  type: 'dragontiger.bet',
  args: {
    replyId: 'dragontiger.bet-284248223-1682515589282',
    gameId: '17597f02f2936fbce10fa9d0',
    timestamp: 1682515589282,
    mwLayout: 8,
    openMwTables: 1,
    orientation: 'landscape',
    appVersion: 4,
    btVideoQuality: 'HD',
    videoProtocol: 'fmp4',
    action: { name: 'Chip', chip: { spot: 'Dragon', amount: 5000 } },
  },
}

export const betResponse = {
  id: '00000187bdbe7934003a09675645d2aa',
  type: 'dragontiger.bet',
  args: {
    gameId: '17597f02f2936fbce10fa9d0',
    replyId: 'dragontiger.bet-284248223-1682515589282',
    bets: {
      status: 'Betting',
      chips: { Dragon: 5000 },
      totalAmount: 5000,
      double: { Dragon: 10000 },
      undo: {},
      balanceId: 'combined',
    },
    version: 2932829556,
  },
  time: 1682515589428,
}
