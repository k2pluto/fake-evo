import { Chips } from '../../common/types'

import { AcceptedBets, GameStateData, PlayerBetRequest, RejectedBets } from '../../common/fake-packet-types'

import { SaveBetType } from '../../common/bet-action'

export class UserGameData {
  tableId: string
  gameId: string
  firstBet = true
  currentChips: Chips = {}
  acceptedBets: AcceptedBets = {}
  rejectedBets: RejectedBets = {}
  currentFakeChips: Chips = {}
  accepted = false
  betting = false
  resolved = false
  repeatData: Chips

  betFakeRequests: PlayerBetRequest[] = []
  betOrgRequests: { [timestamp: string]: SaveBetType } = {}

  betRequestStack: PlayerBetRequest[] = []

  gameStateData?: GameStateData

  createdAt = new Date()

  constructor(data: Partial<UserGameData>) {
    Object.assign(this, data)
  }
}
