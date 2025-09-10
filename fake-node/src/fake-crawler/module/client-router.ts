import {
  type DragonTigerCardDealt,
  type EvolutionGameState,
  type EvolutionPotentialMultipliers,
} from '../../common/types'
import { type FakeGameData } from '@service/src/lib/interface/mongo/fake-game-data'
import { type SocketClient } from './socket-client'
import { evolutionTableInfos } from '@service/src/lib/common/data/evolution-tables'
import { randomString } from '../../common/util'
import { mongoBet } from '../app'

function createFetchBalance() {
  return { id: randomString(10), type: 'fetchBalance', args: {} }
}

function createLogBalanceUpdated(id, balance) {
  return {
    log: {
      type: 'CLIENT_BALANCE_UPDATED',
      value: {
        currency: 'KRW',
        balance,
        updateBalanceMessageId: id,
        channel: 'PCMac',
        orientation: 'landscape',
        gameDimensions: { width: 1600, height: 900 },
        gameId: '',
      },
    },
  }
}

interface BalanceUpdatedPacket {
  id: string // '1697790177707-1234'
  type: string // 'balanceUpdated'
  args: {
    balance: number // 202200.0
    balances: [
      {
        id: 'combined'
        version: number // 1697790177589;
        amount: number // 202200.0
      },
    ]
    currencySymbol: string // '₩'
    currencyCode: string // 'KRW'
    tableId: string // 'onokyd4wn7uekbjx'
  }
  time: number // 1697790177707
}

function processBalanceUpdated(client: SocketClient, packet: BalanceUpdatedPacket, vendor: string) {
  const {
    id,
    args: { balance },
  } = packet
  console.log('balance Update : ' + balance)
  if (!client.balanceUpdated) {
    client.balanceUpdated = true
    client.ws.send(JSON.stringify(createLogBalanceUpdated(id, balance)))
  }
}

function processTableState(client: SocketClient, packet: any, vendor: string) {
  // console.log('table State')
  client.ws.send(JSON.stringify(createFetchBalance()))
}

function processDragonTigerCardDealt(
  client: SocketClient,
  cardDealt: DragonTigerCardDealt,
  vendor: string,
  tableId: string,
) {
  const {
    args: { gameId, cards, version },
    time,
  } = cardDealt

  const eventTime = new Date(time)
  const updatedAt = new Date()

  mongoBet.fakeGameData
    .updateOne(
      {
        gameId,
        tableId,
      },
      {
        $set: {
          gameData: {
            cards,
          },
          dealing: 'Finished',
          updatedAt: new Date(time),
          [`packet.${version}`]: cardDealt,
        } as Partial<FakeGameData>,
      },
    )
    .catch((err) => {
      console.log(err)
    })

  const tableName = evolutionTableInfos[tableId]?.name ?? ''
  mongoBet.fakeTableData
    .updateOne(
      {
        tableId,
      },
      {
        $set: {
          eventTime,
          updatedAt,
          [`updatedVendor.${vendor}`]: new Date(),
          tableName,
          gameId,
        } as Partial<FakeGameData>,
      },
      {
        upsert: true,
      },
    )
    .catch((err) => {
      console.log(err)
    })
}

function processGameState(client: SocketClient, gameState: EvolutionGameState, vendor: string) {
  const {
    args: { gameId, gameNumber, gameData, tableId, betting, dealing },
    time,
    id,
  } = gameState

  console.log(`GameState`, tableId, betting, dealing, id, time)

  const eventTime = new Date(time)
  const updatedAt = new Date()

  const packetId = id.split('-')[0]

  mongoBet.fakeGameData
    .updateOne(
      {
        gameId,
        tableId,
      },
      {
        $set: {
          updatedAt: eventTime,
          ...gameData,
          betting,
          dealing,
          ...(dealing === 'Finished' && { resultTime: eventTime }),
          [`packet.${packetId}`]: gameState,
        } as Partial<FakeGameData>,
        $setOnInsert: {
          gameNumber,
        } as Partial<FakeGameData>,
      },
      {
        upsert: true,
      },
    )
    .catch((err) => {
      console.log(err)
    })

  const tableName = evolutionTableInfos[tableId]?.name ?? ''
  mongoBet.fakeTableData
    .updateOne(
      {
        tableId,
      },
      {
        $set: {
          eventTime,
          updatedAt,
          [`updatedVendor.${vendor}`]: new Date(),
          tableName,
          gameData,
          gameId,
          betting,
          dealing,
        } as Partial<FakeGameData>,
      },
      {
        upsert: true,
      },
    )
    .catch((err) => {
      console.log(err)
    })
}

export function processPotentialMultipliers(
  client: SocketClient,
  packet: EvolutionPotentialMultipliers,
  vendor: string,
) {
  const {
    args: { gameId, tableId, multipliers },
    time,
    id,
  } = packet

  mongoBet.fakeGameData
    .updateOne(
      {
        gameId,
        tableId,
      },
      {
        $set: {
          updatedAt: new Date(time),
          multipliers,
          [`packet.${id}`]: packet,
        } as Partial<FakeGameData>,
      },
      {
        upsert: true,
      },
    )
    .catch((err) => {
      console.log(err)
    })
}

export const processTables = {
  // 'baccarat.resolved': processBetResolved,
  // 'baccarat.cardDealt': processCardDealt,
  balanceUpdated: processBalanceUpdated,
  tableState: processTableState,
  'dragontiger.cardDealt': processDragonTigerCardDealt,
  'baccarat.gameState': processGameState,
  // 'baccarat.potentialMultipliers': processPotentialMultipliers,
} as Record<string, (client: SocketClient, packet: any, vendor: string, tableId?: string) => void>
