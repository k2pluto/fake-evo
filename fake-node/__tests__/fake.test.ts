import { describe, expect, test } from '@jest/globals'

process.env.STAGE_ENV = 'prod'

import { makeOddsTable } from '../src/common/settle'

describe('fake test', () => {
  beforeEach(() => {})
  afterEach(() => {})
  test('red envelop test', async () => {
    const gameState = {
      _id: '66ad1c1ce13eab3ab9b530fe',
      gameId: '17e7fa9efbb1c14d361bee84',
      tableId: 'qgdk6rtpw6hax4fe',
      result: {
        winner: 'Tie',
        playerScore: 8,
        bankerScore: 8,
        playerPair: false,
        bankerPair: false,
        natural: false,
      },
      winningSpots: ['Small', 'Tie'],
      playerHand: {
        cards: ['8C', 'KS'],
        score: 8,
      },
      bankerHand: {
        cards: ['QD', '8D'],
        score: 8,
      },
      redEnvelopePayouts: {
        Tie: 18,
        PlayerPair: 15,
      },
    }
    const oddsTable = makeOddsTable('qgdk6rtpw6hax4fe', gameState)

    expect(oddsTable.Tie).toEqual(19)
    expect(oddsTable.PlayerPair).toEqual(0)

    console.log(oddsTable)
  })
})
