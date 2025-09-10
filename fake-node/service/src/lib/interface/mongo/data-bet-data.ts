// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { ObjectIdColumn, Column, Index } from 'typeorm'
import { ObjectId } from 'mongodb'

import { type BetStatus } from '../../common/types/bet-status'
import { type HistoryStatus } from '../../common/types/history-status'

import { type BetTransactionType } from './data-bet-transaction'
import { WalletMode } from '../../common/types/wallet-mode'

export type GameStatuse =
  | 'BET' // 베팅
  | 'GAME_END' // 게임 종료 마감
  | 'HISTROY' // 히스토리 업데이트
  | 'ROLL' // 롤링 들어감

export class Benefit {
  @Column()
  agentId: string

  @Column()
  giveBalance: number

  @Column()
  percent: number

  @Column()
  afterBalance: number
}

export interface BetDataTransaction {
  id: string
  orgId?: string
  betId?: string
  type: BetTransactionType
  amount: number
  incFields?: Partial<BetData>
}

export interface BetMasterUser {
  master: string
  name: string
  percent: number
  amountBet?: number
  amountWin?: number
  amountCancel?: number
  amountRollback?: number
}
// 베팅 요약 콜렉션

export class BetData {
  @ObjectIdColumn()
  _id: ObjectId

  // 리액트에서 _가 들어가면 문제가 생기는 부분이 있어서 id값을 따로 추가
  @ObjectIdColumn({ name: '_id' })
  id: string

  @Index('bet_status')
  @Column()
  betStatus: BetStatus

  @Index('history_status')
  @Column()
  historyStatus: HistoryStatus

  @Index('bet_agentCode')
  @Column()
  agentCode: string

  @Index('bet_userID')
  @Column()
  userId: string

  @Index('bet_agentId')
  @Column()
  agentId: string

  // 사용안되서 인덱스 삭제
  // @Index('bet_agentTree')
  @Column()
  agentTree: string

  @Column()
  agentTreeKo: string

  topAgent: string

  // thirdparty의 betId 고유하지 않을 수 있다.
  @Index('bet_summaryId')
  @Column()
  summaryId: string

  @Column()
  gameId: string

  @Column()
  roundId: string

  @Index('bet_betTime')
  @Column()
  betTime: Date

  @Index('bet_updatedAt')
  @Column()
  updatedAt: Date

  @Column()
  historyTime: Date

  // @Index('bet_timestamp')
  @Column()
  timestemp: number

  @Index('bet_tableId')
  @Column()
  tableId: string

  @Column()
  tableName: string

  // 베팅 금액(양수만 들어가야 한다.)
  @Column()
  amountBet?: number

  // 실제 이겨서 지급된 금액 (maxWin에 제한됨)
  @Index('bet_amountWin')
  @Column()
  amountWin?: number

  // 원본 이긴 금액
  @Index('bet_amountOrgWin')
  @Column()
  amountOrgWin?: number

  // 취소된 금액
  @Column()
  amountCancel?: number

  // 롤백된 금액
  @Column()
  amountRollback?: number

  // 기타 이유로 금액이 변동될 때 (팁, 프로모션 등)
  @Column()
  amountEtc?: number

  @Column()
  balanceEnd: number

  @Column()
  gameName: string

  @Column()
  ip: string

  @Column()
  gameType: string

  @Column()
  thirdParty: string

  @Index('bet_vendor')
  @Column()
  vendor: string

  @Column()
  brand: string

  @Column()
  ignored: string

  @Column()
  userRolling: number

  @Column()
  userPercent: number

  @Column()
  content: any

  @Column()
  isDetail: boolean

  @Column()
  isCancel: boolean

  @Column()
  walletMode: WalletMode

  @Column()
  lastStatus: number

  @Column()
  transactions: BetDataTransaction[]

  @Column()
  masterUsers: BetMasterUser[]
  // @Column()
  // rollingSlot: number

  @Column()
  rollingCasino: number

  @Column()
  benefits: Benefit[]

  @Column()
  packet: any[]

  @Column()
  trees: string[]

  @Column()
  isStream: boolean

  // 베팅 했을 때의 게임토큰
  @Column()
  gameToken?: string

  // 에볼루션에 가짜로 작게 올리는 금액
  @Column()
  betFake: Record<string, number>

  // 유저가 실제 베팅한 금액
  @Column()
  betOrg: Record<string, number>

  // 계산된 페이크 베팅
  @Column()
  calBetFake: Record<string, number>

  // 계산된 오리지널 베팅
  @Column()
  calBetOrg: Record<string, number>

  // 유저가 실제 베팅한 금액중 베팅에 성공한 금액
  @Column()
  betAccepted: Record<string, number>

  // 유저가 베팅하고 배당받은 베팅
  @Column()
  betSettled: Record<string, { amount: number; payoff: number; limited?: boolean }>

  // 페이크 베팅인지 여부
  @Column()
  isFakeBet: boolean

  // 페이크 벤더 인지 여부
  @Column()
  isFakeVendor: boolean

  // 페이크 벤더 인지 여부
  @Column()
  fakeRoundId: string

  // 디버깅 용도
  @Column()
  debug: string

  @Column()
  fakeAmountBet: number

  @Column()
  fakeAmountWin: number

  @Column()
  fakeRejectedBets: Record<string, { amount: number; error: string }>
}
// }
