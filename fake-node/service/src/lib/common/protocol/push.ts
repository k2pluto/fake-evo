import { UserModel } from '../model/user.model'

import { RoomStateType } from '../types/room.state.type'

export  class PushLobbyHistory {
  tableId: string

  historyWin: number[]

  winType: any
}

export  class PushGameFinish {
  tableId: string

  gameId: string

  historyOrder : any

  historyWin: number[]

  winder: number[]

  winType: any
}
export  class PushGameFinishBalance {
  balance: number

  tableId: string

  betState: string

  gameId: string

  historyOrder : any

  historyWin: number[]

  winder: number[]

  winType: any
}
export  class PushBetStart {
  tableId: string

  gameId: string

  betDelay : number
}
export  class PushBetEnd {
  tableId: string

  gameId: string
}
export  class PushBalance {
  balance: number

  constructor(init?: Partial<PushBalance>){
    Object.assign(this, init)
  }
}

export  class PushBetFinish {
  tableId: string

  gameId: string

  balance: number
}
export  class PushEnterRoom {
  tableId: string

  slot: number

  roomState: RoomStateType

  dealerSlot: Number

  user: UserModel
}
export  class PushLeaveRoom {
  tableId: string

  roomState: RoomStateType

  dealerSlot: Number

  user: UserModel
}
export  class PushGameError {
  tableId: string

  roomState: RoomStateType

  message: string
}
export  class PushGameStart {
  tableId: string

  roomState: RoomStateType

  dealerSlot: number
}

export  class PushNeedBet {
  tableId: String

  roomState: RoomStateType

  user: UserModel

  legalMoves: string[]

  aliveCount: number
}

class Winder {
  userId: string

  balance: Number
}

export  class PushBetWinder {
  winder: Winder[]

  constructor(init?: Partial<PushBetWinder>){
    Object.assign(this, init)
  }
}

export  class PushRank {
  ranks: Winder[]

  constructor(init?: Partial<PushRank>){
    Object.assign(this, init)
  }
}


export {}
