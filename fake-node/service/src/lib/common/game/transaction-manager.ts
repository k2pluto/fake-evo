import { type BetData, type BetDataTransaction } from '../../interface/mongo/data-bet-data'
import { type BetTransaction } from '../../interface/mongo/data-bet-transaction'

import { type BetStatus } from '../types/bet-status'

import { type MongoRepository, InsertResult } from 'typeorm'
// import { mongoBet, mainSQL } from '../app.module'
import {
  saveTransactions,
  rollbackTransaction,
  resettleTransaction,
  type TransactionResult,
  type SaveTransactionInfo,
  cancelRound,
} from './save-transaction'
import { type GameType } from '../types/common'
import { CommonReturnType } from '../types/common-return-type'
import { type MongoBet } from '../../interface/mongo'
import { type PartialSQL } from '../../interface/sql'

export class TransactionManager {
  constructor(public mongoBet: MongoBet, public mainSQL: PartialSQL<'user' | 'agent'>) {}

  // 처음 클래스가 만들어 질 때는 DB가 아직 접속하기 전이라 collection 변수들이 할당되기 전이라서 변수에서 함수로 변경
  getBetDataCol(): MongoRepository<BetData> {
    return null
  }

  getBetTransactionCol(): MongoRepository<BetTransaction> {
    return null
  }

  gameType: GameType

  async singleBet({
    info,
    transId,
    betId,
    incAmount,
    useLockedMoney,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    betId?: string
    incAmount: number
    useLockedMoney?: boolean
    packet: any
  }): Promise<TransactionResult> {
    return await this.multiBet({
      info,
      incAmount,
      transactions: [{ id: transId, ...(betId != null && { betId }), amount: incAmount }],
      useLockedMoney,
      packet,
    })
  }

  async multiBet(params: {
    info: SaveTransactionInfo
    incAmount: number // - 값이 와야 함
    transactions: Array<{
      id: string
      betId?: string
      amount: number
    }>
    useLockedMoney?: boolean
    packet: any
  }): Promise<TransactionResult> {
    // console.log('multiBet', JSON.stringify(params))
    const { info, incAmount, transactions, useLockedMoney, packet } = params
    const { user, vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    const { agentCode, userId } = user

    const betStatus = 'BET'
    const historyStatus = 'WAIT'
    const incFields = { amountBet: -incAmount }

    const newTransactions: BetDataTransaction[] = []

    for (const tx of transactions) {
      if (tx.betId != null) {
        const canceledTrans = await this.getBetTransactionCol().findOne({
          where: {
            type: 'CANCELBET',
            agentCode,
            userId,
            betId: tx.betId,
          },
        })

        // 같은 betId로 취소된 트랜잭션이 있다면 FINAL_ERROR_ACTION_FAILED를 리턴
        if (canceledTrans != null) {
          return {
            status: CommonReturnType.AlreadySettle,
            summaryId: info.summaryId,
          }
        }
      }

      if (tx.amount > 0) {
        return {
          status: CommonReturnType.InvalidParameter,
          summaryId: info.summaryId,
        }
      }

      newTransactions.push({
        type: 'BET',
        incFields: {
          amountBet: Math.abs(tx.amount),
        },
        ...tx,
      })
    }

    return await saveTransactions({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      betStatus,
      historyStatus,
      useLockedMoney,
      betTransactionType: 'BET',
      incAmount,
      incFields,
      transactions: newTransactions,
      packet,
    })
  }

  // 스트리머에게 팁 줄 때
  async tip({
    info,
    incAmount,
    transactions,
    packet,
  }: {
    info: SaveTransactionInfo
    incAmount: number // - 값이 와야 함
    transactions: Array<{
      id: string
      amount: number // - 값이 와야 함
    }>
    packet: any
  }): Promise<TransactionResult> {
    const transObj = transactions.map<BetDataTransaction>((value) => ({
      type: 'TIP',
      ...value,
      incFields: {
        amountEtc: value.amount,
      },
    }))

    info.gameId ??= 'tip'
    const { vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    const betStatus = 'TIP'
    const historyStatus = 'DONE'
    const incFields = { amountEtc: incAmount }

    return await saveTransactions({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      betStatus,
      historyStatus,
      betTransactionType: 'TIP',
      incAmount,
      incFields,
      transactions: transObj,
      packet,
    })
  }

  // 게임사에서 프로모션 공짜 돈을 받을 때
  async give({
    info,
    incAmount,
    transactions,
    betTransactionType,
    packet,
  }: {
    info: SaveTransactionInfo
    incAmount: number // + 값이 와야 함
    transactions: Array<{
      id: string
      amount: number // + 값이 와야 함
    }>
    betTransactionType: 'GIVE' | 'JACKPOT' | 'BONUS'
    packet: any
  }): Promise<TransactionResult> {
    const transObj = transactions.map<BetDataTransaction>((value) => ({
      type: betTransactionType,
      ...value,
      incFields: {
        amountEtc: value.amount,
      },
    }))
    info.gameId ??= 'give'
    const { vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    const betStatus = betTransactionType
    const historyStatus = 'DONE'
    const incFields = { amountEtc: incAmount }

    return await saveTransactions({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      betStatus,
      historyStatus,
      betTransactionType,
      incAmount,
      incFields,
      transactions: transObj,
      packet,
    })
  }

  // 게임사에서 필요에 따라 유저의 돈을 조절할 때
  async adjustment({
    info,
    incAmount,
    transactions,
    packet,
  }: {
    info: SaveTransactionInfo
    incAmount: number
    transactions: Array<{
      id: string
      betId?: string
      amount: number
    }>
    packet: any
  }): Promise<TransactionResult> {
    const { user, vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    const { agentCode, userId } = user

    const betStatus = 'ADJUST'
    const historyStatus = 'DO'
    const incFields = { amountEtc: incAmount, amountWin: incAmount }

    const newTransactions: BetDataTransaction[] = []
    for (const tx of transactions) {
      if (tx.betId != null) {
        // betId가 있으면 베팅이 있는지 검사한다.
        const betIdTrans = await this.getBetTransactionCol().find({
          agentCode,
          userId,
          betId: tx.betId.toString(),
        })

        const betTrans = betIdTrans.find((value) => value.type === 'BET')

        // 베팅이 아직 없으면 에러를 리턴한다.
        if (betTrans == null) {
          return {
            status: CommonReturnType.TransactionNotFound,
            summaryId: info.summaryId,
          }
        }
      }

      newTransactions.push({
        type: 'ADJUST',
        incFields: {
          amountEtc: tx.amount,
          amountWin: tx.amount,
        },
        ...tx,
      })
    }

    return await saveTransactions({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      betStatus,
      historyStatus,
      balanceCheck: true,
      betTransactionType: 'ADJUST',
      incAmount,
      incFields,
      transactions: newTransactions,
      packet,
    })
  }

  // 마감 처리
  async betSettlement({
    info,
    transId,
    betId,
    incAmount,
    allowAdditionalSettle,
    useLockedMoney,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    betId?: string
    incAmount: number
    allowAdditionalSettle?: boolean
    useLockedMoney?: boolean
    packet: any
  }): Promise<TransactionResult> {
    return await this.multiSettlement({
      info,
      incAmount,
      transactions: [{ id: transId, ...(betId != null && { betId }), amount: incAmount }],
      allowAdditionalSettle,
      useLockedMoney,
      packet,
    })
  }

  // 마감 처리
  async multiSettlement({
    info,
    incAmount,
    transactions,
    allowAdditionalSettle,
    useLockedMoney,
    packet,
  }: {
    info: SaveTransactionInfo
    incAmount: number
    allowAdditionalSettle?: boolean
    useLockedMoney?: boolean
    transactions: Array<{
      id: string
      betId?: string
      amount: number
    }>
    packet: any
  }): Promise<TransactionResult> {
    const { user, vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    const { agentCode, userId } = user

    const betStatus = 'SETTLE'
    const historyStatus = 'DO'
    const incFields = { amountWin: incAmount }

    const newTransactions: BetDataTransaction[] = []

    for (const tx of transactions) {
      if (tx.betId != null) {
        const betIdTrans = await this.getBetTransactionCol().find({
          agentCode,
          userId,
          betId: tx.betId.toString(),
        })

        const betTrans = betIdTrans.find((value) => value.type === 'BET')

        if (betTrans == null) {
          return {
            status: CommonReturnType.TransactionNotFound,
            summaryId: info.summaryId,
          }
        }

        if (!allowAdditionalSettle) {
          const settledTrans = betIdTrans.find((value) => value.type === 'SETTLE' || value.type === 'CANCELBET')

          if (settledTrans != null) {
            return {
              status: CommonReturnType.AlreadySettle,
              summaryId: info.summaryId,
            }
          }
        }
      }

      if (tx.amount < 0) {
        return {
          status: CommonReturnType.InvalidParameter,
          summaryId: info.summaryId,
        }
      }

      newTransactions.push({
        type: 'SETTLE',
        incFields: {
          amountWin: Math.abs(tx.amount),
        },
        ...tx,
      })
    }

    return await saveTransactions({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      betStatus,
      historyStatus,
      useLockedMoney,
      betTransactionType: 'SETTLE',
      incAmount,
      incFields,
      transactions: newTransactions,
      packet,
    })
  }

  // 트랜잭션 재마감
  async resettlement({
    info,
    transId,
    amountWin,
    betId,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    amountWin: number
    betId?: string
    packet
  }): Promise<TransactionResult> {
    const { vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    return await resettleTransaction({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      transId,
      amountWin,
      betId,
      packet,
    })
  }

  // 베팅과 마감 처리
  async betNSettlement({
    info,
    transId,
    betId,
    incAmount,
    amountBet,
    amountWin,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    betId?: string
    incAmount: number
    amountBet: number
    amountWin: number
    packet: any
  }): Promise<TransactionResult> {
    const { vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    const transObj: BetDataTransaction[] = [
      {
        id: transId,
        type: 'BETNSETTLE',
        ...(betId != null && { betId }),
        amount: incAmount,
        incFields: {
          amountWin,
          amountBet,
        },
      },
    ]

    return await saveTransactions({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      betStatus: 'SETTLE',
      historyStatus: 'DO',
      betTransactionType: 'BETNSETTLE',
      balanceCheck: true,
      incAmount,
      incFields: { amountWin, amountBet },
      transactions: transObj,
      packet,
    })
  }

  // 트랜잭션 취소
  async rollbackTransaction({
    info,
    transId,
    orgTransId,
    incAmount,
    betStatus = 'CANCEL',
    deleteOrigTrans,
    betTransactionType,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    orgTransId?: string
    incAmount?: number
    betStatus?: BetStatus
    deleteOrigTrans?: boolean
    betTransactionType?: 'CANCELBET' | 'ROLLBACKSETTLE' | 'CANCELBETNSETTLE' | 'ROLLBACK'
    packet
  }): Promise<TransactionResult> {
    const { vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    return await rollbackTransaction({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      transId,
      orgTransId,
      incAmount,
      betStatus,
      deleteOrigTrans,
      betTransactionType,
      packet,
    })
  }

  // 마감 취소
  async cancelBetNSettlement({
    info,
    transId,
    orgTransId,
    incAmount,
    betStatus = 'CANCEL',
    deleteOrigTrans,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    orgTransId?: string
    incAmount?: number
    betStatus?: BetStatus
    deleteOrigTrans?: boolean
    packet
  }): Promise<TransactionResult> {
    const { vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    return await rollbackTransaction({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      transId,
      orgTransId,
      incAmount,
      betStatus,
      deleteOrigTrans,
      betTransactionType: 'CANCELBETNSETTLE',
      packet,
    })
  }

  // 트랜잭션 취소
  async rollbackSettlement({
    info,
    transId,
    orgTransId,
    incAmount,
    betStatus = 'VOID',
    deleteOrigTrans,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    orgTransId?: string
    incAmount?: number
    betStatus?: BetStatus
    deleteOrigTrans?: boolean
    packet
  }): Promise<TransactionResult> {
    const { vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    return await rollbackTransaction({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      transId,
      orgTransId,
      incAmount,
      betStatus,
      deleteOrigTrans,
      betTransactionType: 'ROLLBACKSETTLE',
      packet,
    })
  }

  // 트랜잭션 취소
  async betCancel({
    info,
    transId,
    orgTransId,
    betId,
    incAmount,
    betStatus = 'CANCEL',
    deleteOrigTrans,
    useLockedMoney,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    orgTransId?: string
    betId?: string
    incAmount?: number
    betStatus?: BetStatus
    deleteOrigTrans?: boolean
    useLockedMoney?: boolean
    packet
  }): Promise<TransactionResult> {
    const { vendor, gameId, roundId } = info
    if (roundId != null) {
      info.summaryId = vendor + '-' + gameId + '-' + roundId
    }

    if (incAmount != null && incAmount < 0) {
      return {
        status: CommonReturnType.InvalidParameter,
        summaryId: info.summaryId,
      }
    }

    return await rollbackTransaction({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      transId,
      orgTransId,
      betId,
      incAmount,
      betStatus,
      deleteOrigTrans,
      useLockedMoney,
      betTransactionType: 'CANCELBET',
      packet,
    })
  }

  // 마감 베팅 둘다 롤백
  async voidSettle({
    info,
    transId,
    orgTransId,
    betId,
    incAmount,
    betStatus = 'VOID',
    deleteOrigTrans,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    orgTransId?: string
    betId?: string
    incAmount?: number
    betStatus?: BetStatus
    deleteOrigTrans?: boolean
    packet
  }): Promise<TransactionResult> {
    const { vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    // 마감도 롤백 하고
    let betRes: TransactionResult
    betRes = await rollbackTransaction({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      transId: 'vs' + transId,
      orgTransId: 's' + orgTransId,
      betId,
      incAmount,
      betStatus,
      deleteOrigTrans,
      betTransactionType: 'CANCELBET',
      packet,
    })
    if (betRes.status !== CommonReturnType.Success && betRes.status !== CommonReturnType.TransactionAlreadyRollback) {
      return betRes
    }
    // 베팅도 롤백 해야 됨
    betRes = await rollbackTransaction({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      transId: 'vsb' + transId,
      orgTransId,
      incAmount,
      betStatus,
      deleteOrigTrans,
      betTransactionType: 'ROLLBACKSETTLE',
      packet,
    })
    return betRes
  }

  // voidSettle 을 트랜잭션 하나로 수정한 버젼
  async cancelRound({
    info,
    transId,
    betId,
    betStatus = 'CANCEL',
    deleteOrigTrans,
    packet,
  }: {
    info: SaveTransactionInfo
    transId: string
    betId: string
    incAmount?: number
    betStatus?: BetStatus
    deleteOrigTrans?: boolean
    packet
  }): Promise<TransactionResult> {
    const { vendor, gameId, roundId } = info
    info.summaryId = vendor + '-' + gameId + '-' + roundId

    // 마감 베팅 둘다 롤백
    const betRes = await cancelRound({
      info: {
        ...info,
        mainSQL: this.mainSQL,
        mongoBet: this.mongoBet,
        betDataCol: this.getBetDataCol(),
        betTransactionCol: this.getBetTransactionCol(),
      },
      gameType: this.gameType,
      transId,
      betId,
      betStatus,
      deleteOrigTrans,
      packet,
    })
    return betRes
  }

  async searchTransaction({
    vendor,
    summaryId,
    transId,
    userId,
    agentCode,
  }: {
    vendor?: string
    summaryId?: string
    transId: string
    userId?: string
    agentCode?: string
  }) {
    const vendorSummaryId = vendor + '-' + summaryId
    return await this.getBetTransactionCol().findOne({
      where: {
        ...(agentCode != null && { agentCode }),
        ...(userId != null && { userId }),
        ...(summaryId != null && { summaryId: vendorSummaryId }),
        ...(vendor != null && { vendor }),
        transId,
      },
    })
  }
}

export class CasinoTransactionManager extends TransactionManager {
  getBetDataCol(): MongoRepository<BetData> {
    return this.mongoBet.betDataCasino
  }

  getBetTransactionCol(): MongoRepository<BetTransaction> {
    return this.mongoBet.betTransactionCasino
  }

  gameType: GameType = 'casino'
}

export class SlotTransactionManager extends TransactionManager {
  getBetDataCol(): MongoRepository<BetData> {
    return this.mongoBet.betDataSlot
  }

  getBetTransactionCol(): MongoRepository<BetTransaction> {
    return this.mongoBet.betTransactionSlot
  }

  gameType: GameType = 'slot'
}

export class SportTransactionManager extends TransactionManager {
  getBetDataCol(): MongoRepository<BetData> {
    return this.mongoBet.betDataSport
  }

  getBetTransactionCol(): MongoRepository<BetTransaction> {
    return this.mongoBet.betTransactionSport
  }

  async searchTransactions({
    vendor,
    summaryId,
    transId,
    userId,
    agentCode,
  }: {
    vendor?: string
    summaryId?: string
    transId?: string
    userId?: string
    agentCode?: string
  }) {
    const vendorSummaryId = vendor + '-' + summaryId
    return await this.getBetTransactionCol().find({
      where: {
        ...(agentCode != null && { agentCode }),
        ...(userId != null && { userId }),
        ...(summaryId != null && { summaryId: vendorSummaryId }),
        ...(vendor != null && { vendor }),
        ...(transId != null && { transId }),
      },
    })
  }

  async saveTransaction(data: any): Promise<InsertResult> {
    return await this.getBetTransactionCol().insert(data)
  }

  async updateBetData(where: any, data: any): Promise<any> {
    return await this.getBetDataCol().updateOne(
      where,
      {
        $set: data as Partial<any>,
      },
      {
        upsert: true,
      },
    )
  }

  gameType: GameType = 'sport'
}
