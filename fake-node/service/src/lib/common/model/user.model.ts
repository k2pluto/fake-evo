export class UserModel {
  id: number
  account: string
  password: string
  money: number
  savemoney: number
  point: number
  constructor(init?: UserModel) {
    Object.assign(this, init)
  }
}
