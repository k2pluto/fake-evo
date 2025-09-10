import { RoomUserStateType } from '../types/room.state.type'
import { UserModel } from './user.model'

export class OrderWiner {
  name: string

  order: number[]

  constructor(init?: Partial<OrderWiner>) {
    Object.assign(this, init)
  }
}

export class RoomUserModel {
  user: UserModel

  state: RoomUserStateType
}

export class RoomModel {
  tableId: string

  gameType: string

  state: string

  dealerSlot: number

  totalBetBalance: number

  historyWin: number[]

  historyOrder: OrderWiner[]

  betBalance: number[]

  constructor(init?: Partial<RoomModel>) {
    Object.assign(this, init)
  }
}
