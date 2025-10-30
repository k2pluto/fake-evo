export interface SeamlessResponse {
  result: number // 0 : success 1 : fail
  balance?: number // 100000
  message: string // 'F00'
  messageid: string // '1075738151_123456'
}

export interface BalanceRequest {
  messageid: string // '1734606988510_066721'
  username: string // 'ajatestkrw2'
  tickettype: string // 'BALANCE'
  amount: number // 0
  utc_messagetime: string // '2024-12-19 11:16:28.514611272'
  currency: string // 'KRW'
  extra_info: {
    gameId: null
    gamecode: string // '12'
    gameKey: null
    currencytype: string // 'KRW'
    amount: 0
    winamount: null
    revertamount: null
    pvpseq: null
    codehash: null
    data: null
    dataList: null
    bonus: null
    promotion: null
    freespin: null
    jackpot: null
  }
}

export interface ChangeBalanceRequest {
  roundid: string // 'b9896e25-5eb3-470f-b094-4cfb4c060e7f'
  messageid: string // '1734607251373_178936'
  username: string // 'ajatestkrw2'
  tickettype: string // 'BET'
  vendor_id: number // 43
  vendorname: string // '에볼루션'
  game_id: number // 4201
  transaction_id: string // '0316252072'
  amount: number // 1000
  utc_messagetime: string // '2024-12-19 11:20:51.411142766'
  currency: string // 'KRW'
  gameid: string // '18129017989c59396627032f-sppht77q35aat3vy'
  gamename: string // '코리안 스피드 바카라 A'
  extra_info: {
    gameId: null
    gamecode: string // '12'
    gameKey: string // 'p63cmvmwagteemoy'
    currencytype: string // 'KRW'
    amount: number // 1000
    winamount: null
    revertamount: null
    pvpseq: null
    codehash: null
    data: null
    dataList: null
    bonus: null
    promotion: null
    freespin: null
    jackpot: null
  }
}

export enum SeamlessMessageCode {
  Success = 'F00',
  InsufficientBalance = 'F01',
  InternalServerError = 'F02',
  UserNotFound = 'F99',
}

export function convertReturnCode(messageCode: SeamlessMessageCode): SeamlessMessageCode {
  switch (messageCode) {
    case SeamlessMessageCode.Success:
      return SeamlessMessageCode.Success
    case SeamlessMessageCode.InsufficientBalance:
      return SeamlessMessageCode.InsufficientBalance
    case SeamlessMessageCode.InternalServerError:
      return SeamlessMessageCode.InternalServerError
    case SeamlessMessageCode.UserNotFound:
      return SeamlessMessageCode.UserNotFound
    default:
      return SeamlessMessageCode.InternalServerError
  }
}
