import { RoomStateType } from '../types/room.state.type'

export class Chip {
  order: number

  balance: number

  text: number

  id: string
}

export class Bet {
  order: number

  id: string

  name: string

  rate: number

  result: string
}

export class Game {
  id: string

  order: number

  viewText: string

  rate: number

  bets: Bet[]
}

export class Video {
  name: string

  url: string
}

// export class RoomUserModel {
//   user: UserModel

//   state: RoomUserStateType
// }

export class EnterModel {
  tableId: string

  state: RoomStateType

  historyWin: number[]

  historyOrder: any

  bets: Game[]

  chips: Chip[]

  balance: Chip[]

  videos: Video[]

  userId: string

  userBalance: number

  tableBetDelay: number

  tableState: string

  betDelay: number

  betCount: number

  constructor(init?: Partial<EnterModel>) {
    Object.assign(this, init)
  }
}
