import { MoreThanOrEqual, type MongoRepository, type FindOptionsWhere } from 'typeorm'

import { type BetData, type BetDataTransaction } from '../../interface/mongo/data-bet-data'

import { GameMoneyField, type User, UserType } from '../../interface/sql/user'

import { CommonReturnType } from '../types/common-return-type'

import { type BetStatus } from '../types/bet-status'
import { type HistoryStatus } from '../types/history-status'
import { type BetTransaction, type BetTransactionType } from '../../interface/mongo/data-bet-transaction'
import { type GameType } from '../types/common'

import { callSeamless, makePacketTransaction } from './call-seamless'
import { WalletMode } from '../../common/types/wallet-mode'
import { type Agent } from '../../interface/sql/agent'
import { type MongoBet } from '../../interface/mongo'
import { type PartialSQL } from '../../interface/sql'
import { getAgentGameSetting, getGameSetting, getUserGameSetting, getVendorSetting } from './game-setting-store'
import { errorToString } from '../../utility/util'

export interface SaveTransactionInfo {
  agent: Agent | { agentId: string; walletMode: WalletMode; seamlessUrl: string; balance: number }
  user: User | { agentCode: string; userId: string; balance: number; type: UserType }
  vendor: string
  brand?: string
  summaryId?: string
  gameId?: string
  roundId?: string
  tableId?: string
  betTime?: Date
  additional?: Partial<BetData>
}

export interface SaveTransactionInfoWithRepo extends SaveTransactionInfo {
  mongoBet: MongoBet
  mainSQL: PartialSQL<'user' | 'agent'>
  betDataCol: MongoRepository<BetData>
  betTransactionCol: MongoRepository<BetTransaction>
}

export interface SaveTransactionOptions {
  gameType: GameType
  info: SaveTransactionInfoWithRepo
  betStatus?: BetStatus
  historyStatus: HistoryStatus
  balanceCheck?: boolean
  useLockedMoney?: boolean
  checkUpsert?: boolean
  betTransactionType: BetTransactionType
  incAmount: number
  incFields: Partial<BetData>
  transactions: BetDataTransaction[]
  rollbackTransactionIds?: string[]
  deleteTransactionIds?: string[]
  packet: any
}

export interface StatusResult {
  status: CommonReturnType
}
export interface TransactionResult extends StatusResult {
  status: CommonReturnType
  summaryId: string
  beforeBalance?: number
  balance?: number
  amount?: number
}

export async function saveTransactions({
  info: {
    mongoBet,
    mainSQL,
    betDataCol,
    betTransactionCol,
    agent,
    user,
    vendor,
    brand,
    summaryId,
    gameId,
    roundId,
    tableId,
    betTime,
    additional,
  },
  gameType,
  betStatus,
  historyStatus,
  balanceCheck,
  useLockedMoney,
  checkUpsert = true,
  incAmount,
  incFields,
  betTransactionType,
  transactions,
  rollbackTransactionIds = [],
  deleteTransactionIds = [],
  packet,
}: SaveTransactionOptions): Promise<TransactionResult> {
  const { agentCode, userId } = user
  const username = agentCode + userId

  const { agentId } = agent
  const now = new Date()
  try {
    // const isSeamless = agent.seamlessUrl != null && agent.seamlessUrl !== ''
    const { walletMode, seamlessUrl } = agent

    if (walletMode === WalletMode.seamless && (seamlessUrl == null || seamlessUrl === '')) {
      throw CommonReturnType.TransactionExists
    }

    let calcIncAmount = incAmount

    if (incFields.amountBet > 0 || incFields.amountWin > 0) {
      const [vendorSetting, gameSetting, agentGameSetting, userGameSetting, betData] = await Promise.all([
        getVendorSetting(mongoBet, vendor, now),
        getGameSetting(mongoBet, vendor, gameId, now),
        getAgentGameSetting(mongoBet, agentId, now),
        getUserGameSetting(mongoBet, agentCode, userId),
        betDataCol.findOne({
          where: {
            userId,
            agentCode,
            summaryId,
          },
        }),
      ])

      for (const trans of transactions) {
        for (const orgTrans of betData?.transactions ?? []) {
          if (trans.id === orgTrans.id) {
            throw CommonReturnType.TransactionExists
          }
        }
      }

      if (incFields.amountBet > 0) {
        let minBet = 0
        let maxBet = 10_000_000_000

        const userGameTypeSetting = userGameSetting?.betLimitByGameType?.[gameType]
        const agentGameTypeSetting = agentGameSetting?.betLimitByGameType?.[gameType]
        const agentTableSetting = agentGameSetting?.betLimitByTable?.[tableId]
        const agentVendorGameSetting = agentGameSetting?.vendorGameSettings?.[vendor]?.gameSettings?.[gameId]

        if (
          user.type !== UserType.Admin &&
          (vendorSetting?.used === 'n' ||
            gameSetting?.used === 'n' ||
            userGameTypeSetting?.allowBet === false ||
            agentGameTypeSetting?.allowBet === false ||
            agentVendorGameSetting?.allowBet === false ||
            agentTableSetting?.allowBet === false)
        ) {
          throw CommonReturnType.NotAllowedBet
        }

        // null >= 0 is true

        if (userGameTypeSetting?.minBet != null && userGameTypeSetting.minBet >= 0) {
          minBet = userGameTypeSetting.minBet
        } else if (agentTableSetting?.minBet != null && agentTableSetting.minBet >= 0) {
          minBet = agentTableSetting.minBet
        } else if (agentVendorGameSetting?.minBet != null && agentVendorGameSetting.minBet >= 0) {
          minBet = agentVendorGameSetting.minBet
        } else if (agentGameTypeSetting?.minBet != null && agentGameTypeSetting.minBet >= 0) {
          minBet = agentGameTypeSetting.minBet
        }

        if (userGameTypeSetting?.maxBet != null && userGameTypeSetting.maxBet >= 0) {
          maxBet = userGameTypeSetting.maxBet
        } else if (agentTableSetting?.maxBet != null && agentTableSetting.maxBet >= 0) {
          maxBet = agentTableSetting.maxBet
        } else if (agentVendorGameSetting?.maxBet != null && agentVendorGameSetting.maxBet >= 0) {
          maxBet = agentVendorGameSetting.maxBet
        } else if (agentGameTypeSetting?.maxBet != null && agentGameTypeSetting.maxBet >= 0) {
          maxBet = agentGameTypeSetting.maxBet
        }

        const calcMinBet = minBet ?? 0
        const calcMaxBet = maxBet ?? 10_000_000_000

        // 이미 베팅이 존재 하는지 확인한 후 기존의 베팅액과 합산하여 베팅 리밋을 체크 합니다.
        const betAmount = (betData?.amountBet ?? 0) + (incFields.amountBet ?? 0)

        console.log(
          'save_transaction_bet_limit',
          username,
          agentId,
          vendor,
          gameId,
          tableId,
          betAmount,
          calcMinBet,
          calcMaxBet,
          JSON.stringify(userGameTypeSetting),
          JSON.stringify(agentTableSetting),
          JSON.stringify(agentVendorGameSetting),
          JSON.stringify(agentGameTypeSetting),
        )

        if (betAmount < calcMinBet) {
          console.log('betlimit betAmount min', username, betAmount, calcMinBet)
          throw CommonReturnType.InvalidBetMoney
        } else if (betAmount > calcMaxBet) {
          console.log('betlimit betAmount max', username, betAmount, calcMaxBet)
          throw CommonReturnType.InvalidBetMoney
        }
      }
      if (incFields.amountWin > 0) {
        incFields.amountOrgWin = incFields.amountWin

        let maxWin = 10_000_000_000

        const userGameTypeSetting = userGameSetting?.betLimitByGameType?.[gameType]
        const agentGameTypeSetting = agentGameSetting?.betLimitByGameType?.[gameType]
        const agentTableSetting = agentGameSetting?.betLimitByTable?.[tableId]
        const agentVendorGameSetting = agentGameSetting?.vendorGameSettings?.[vendor]?.gameSettings?.[gameId]

        if (userGameTypeSetting?.maxWin != null && userGameTypeSetting.maxWin >= 0) {
          maxWin = userGameTypeSetting.maxWin
        } else if (agentTableSetting?.maxWin != null && agentTableSetting.maxWin >= 0) {
          maxWin = agentTableSetting.maxWin
        } else if (agentVendorGameSetting?.maxWin != null && agentVendorGameSetting.maxWin >= 0) {
          maxWin = agentVendorGameSetting.maxWin
        } else if (agentGameTypeSetting?.maxWin != null && agentGameTypeSetting.maxWin >= 0) {
          maxWin = agentGameTypeSetting.maxWin
        }

        const calcMaxWin = maxWin ?? 10_000_000_000

        // 이미 베팅이 존재 하는지 확인한 후 기존의 베팅액과 합산하여 베팅 리밋을 체크 합니다.
        const beforeWinAmount = betData?.amountWin ?? 0
        const totalWinAmount = beforeWinAmount + incFields.amountWin
        if (totalWinAmount > calcMaxWin) {
          const newWinAmount = calcMaxWin - beforeWinAmount
          const decreaseAmount = incFields.amountWin - newWinAmount
          console.log(`decrease winAmount ${incFields.amountWin} ${calcMaxWin} ${newWinAmount} ${decreaseAmount}`)
          calcIncAmount -= decreaseAmount
          incFields.amountWin = newWinAmount
        }
      }
    }

    const [, upsertRes] = await Promise.all([
      betDataCol.updateOne(
        {
          vendor,
          userId,
          agentCode,
          summaryId,
        } as Partial<BetData>,
        {
          $setOnInsert: {
            thirdParty: vendor,
            agentId,
            brand,
            gameId,
            roundId,
            ...(tableId != null && { tableId }),
            betTime: betTime ?? new Date(),
            gameType,
            walletMode,
          } as Partial<BetData>,
          $set: { updatedAt: now, ...additional },
          $push: {
            transactions: {
              $each: transactions,
            },
            packet,
          } as any,
        },
        {
          upsert: true,
        },
      ),
      betTransactionCol.bulkWrite(
        transactions.map((value) => ({
          updateOne: {
            filter: {
              agentCode,
              userId,
              summaryId,
              transId: value.id,
            },
            update: {
              $setOnInsert: {
                ...(({ id, ...o }) => o)(value), // value에서 id만 제거 후 나머지를 setOnInsert에 넣는다.
                agentId,
                status: 'CREATED',
                thirdParty: vendor,
                vendor,
                brand,
                gameId,
                roundId,
                createdAt: now,
                //packet,
              } as Partial<BetTransaction>,
            },
            upsert: true,
          },
        })),
      ),
    ])

    // 잔고 업데이트 하기 전에 먼저 트랜잭션을 생성을 시도 해서 베팅 패킷이 똑같은 시간에 동시에 여러개가 들어오는지 체크한다.
    if (checkUpsert && upsertRes.upsertedCount !== transactions.length) {
      throw CommonReturnType.TransactionExists
    }

    const needBalanceCheck = betStatus === 'BET' || betStatus === 'TIP' || balanceCheck

    const totalUseAmount = incFields.amountBet ?? 0 + -(incFields.amountEtc ?? 0)

    let res: TransactionResult
    if (walletMode === WalletMode.seamless) {
      if (needBalanceCheck && agent.balance < totalUseAmount) {
        throw CommonReturnType.InsufficientAgentBalance
      }

      const packetTransaction = makePacketTransaction(betTransactionType, transactions)

      res = {
        ...(await callSeamless({
          seamlessUrl,
          agentId,
          body: {
            type: betTransactionType,
            vendor,
            brand,
            gameType,
            roundId,
            gameId,
            username: userId,
            transactions: packetTransaction,
          },
        })),
        summaryId,
      }

      if (res.status === CommonReturnType.Success) {
        mainSQL.repos.agent.increment({ agentCode }, GameMoneyField, calcIncAmount).catch((err) => {
          console.log(err)
        })

        // bettingMoney 업데이트 기능은 원래 필요할거 같았는데 fake-evo에서 필요가 없을거 같아서 주석처리
        /* if (betStatus === 'BET') {
          await mainSQL.repos.user.increment({ agentCode, userId }, 'bettingMoney', -incAmount)
        } else if (betStatus === 'SETTLE' || betStatus === 'CANCEL') {
          await mainSQL.repos.user.update({ agentCode, userId }, { bettingMoney: 0 })
        } */
      }
    } else {
      // 트랜스퍼에 에이전트 금액을 안빼는 이유는 유저가 입금하고 출금시에 에이전트 금액을 차감하기 때문에 여기서 빼지 않는다.

      const beforeBalance = user.balance
      let updatedBalance = user.balance

      if (needBalanceCheck && user.balance < totalUseAmount) {
        throw CommonReturnType.InsufficientBalance
      }

      const totalAmount = Math.abs(calcIncAmount)

      const gameMoneyField: keyof User = useLockedMoney ? 'lockedBalance' : 'balance'

      if (calcIncAmount !== 0) {
        const incrementCondition: FindOptionsWhere<User> = {
          agentCode,
          userId,
          ...(needBalanceCheck && { [gameMoneyField]: MoreThanOrEqual(totalUseAmount) }),
        }

        let affected = false

        for (let i = 0; i < 2; i++) {
          try {
            const result = await mainSQL.repos.user.increment(incrementCondition, gameMoneyField, calcIncAmount)

            // bettingMoney 업데이트 기능은 원래 필요할거 같았는데 fake-evo에서 필요가 없을거 같아서 주석처리
            /* const result = await mainSQL.repos.user.update(incrementCondition, {
            ...(betStatus === 'BET' && { bettingMoney: () => `bettingMoney + ${-incAmount}` }),
            ...((betStatus === 'SETTLE' || betStatus === 'CANCEL') && { bettingMoney: 0 }),
            balance: () => `balance + ${incAmount}`,
            }) */

            if (result.affected > 0) {
              affected = true
              break
            }

            console.log(
              `save transaction not_affected`,
              agentCode + userId,
              summaryId,
              calcIncAmount,
              JSON.stringify(incrementCondition),
              result,
            )

            if (needBalanceCheck) {
              const user = await mainSQL.repos.user.findOne({ where: { agentCode, userId }, select: [gameMoneyField] })

              if (user?.[gameMoneyField] < totalUseAmount) {
                throw CommonReturnType.InsufficientBalance
              }
            }
          } catch (err) {
            console.log(errorToString(err))
            // db 에러가 나도 몇번더 시도한다.
          }
        }
        if (!affected) {
          throw CommonReturnType.DatabaseError
        }
      }

      // 220992.8 - 0.01 의 결과를 맞추기 위해 이렇게 수정
      updatedBalance = Number((user[gameMoneyField] + calcIncAmount).toFixed(2))

      if (seamlessUrl != null && seamlessUrl !== '') {
        // callSeamless로 기다리면 너무 처리가 늦어져서 베팅거절이 많이 나온다.
        const packetTransaction = makePacketTransaction(betTransactionType, transactions)
        callSeamless({
          seamlessUrl,
          agentId,
          body: {
            type: betTransactionType,
            vendor,
            brand,
            gameType,
            roundId,
            gameId,
            username: userId,
            transactions: packetTransaction,
          },
        }).catch((err) => {
          console.log(err)
        })
      }

      res = {
        status: CommonReturnType.Success,
        summaryId,
        beforeBalance,
        balance: updatedBalance,
        amount: totalAmount,
      }
    }

    user.balance = res.balance

    const successedTransaction = []
    let accumBeforeBalance = res.beforeBalance
    for (const transaction of transactions) {
      const afterBalance = accumBeforeBalance + transaction.amount
      successedTransaction.push({
        updateOne: {
          filter: {
            agentCode,
            userId,
            summaryId,
            transId: transaction.id,
          } as Partial<BetTransaction>,
          update: {
            $set: {
              status: 'OK',
              statusCode: 0,
              beforeBalance: accumBeforeBalance,
              afterBalance,
            } as Partial<BetTransaction>,
          },
        },
      })
      accumBeforeBalance = afterBalance
    }

    // 여기서 안기다리고 그냥 넘어가면 베팅 리밋 테스트가 제대로 테스트가 안된다.
    await betDataCol.updateOne(
      {
        userId,
        agentCode,
        summaryId,
      } as Partial<BetData>,
      {
        $set: {
          ...(betStatus != null && { betStatus }),
          historyStatus,
          lastStatus: res.status,
          updatedAt: new Date(),
          ...(res.balance != null && { balanceEnd: res.balance }),
        },
        $inc: incFields as any,
      },
    )

    betTransactionCol
      .bulkWrite([
        ...successedTransaction,
        ...rollbackTransactionIds.map((value) => ({
          updateOne: {
            filter: {
              agentCode,
              userId,
              summaryId,
              transId: value,
            } as Partial<BetTransaction>,
            update: {
              $set: {
                status: 'ROLLBACK',
              } as Partial<BetTransaction>,
            },
          },
        })),
        ...deleteTransactionIds.map((value) => ({
          deleteOne: {
            filter: {
              agentCode,
              userId,
              summaryId,
              transId: value,
            } as Partial<BetTransaction>,
          },
        })),
      ])
      .catch((err) => {
        console.log(err)
      })

    return res
  } catch (err) {
    console.log(`save transaction error ${agentCode + userId} ${summaryId} ${err.toString()}`)

    const statusCode = Number.isNaN(err) ? CommonReturnType.DatabaseError : err

    try {
      // status error 로 바꾸는걸 시도한다.
      // transaction이 에러난 것도 저장하기 위해 upsert 를 한다.
      betTransactionCol
        .bulkWrite(
          transactions.map((value) => ({
            updateOne: {
              filter: {
                agentCode,
                userId,
                summaryId,
                transId: value.id,
                $or: [{ status: { $exists: false } }, { status: 'CREATED' }],
              } as Partial<BetTransaction>,
              update: {
                $setOnInsert: {
                  ...(({ id, ...o }) => o)(value), // value에서 id만 제거 후 나머지를 setOnInsert에 넣는다.
                  thirdParty: vendor,
                  vendor,
                  gameId,
                  roundId,
                  createdAt: now,
                } as Partial<BetTransaction>,
                $set: {
                  status: 'ERROR',
                  statusCode,
                } as Partial<BetTransaction>,
              },
              upsert: true,
            },
          })),
        )
        .catch((err) => {
          console.log(err)
        })
      // betDataCol이 있는데 betStatus가 없으면 베팅중에 취소가 난 것이므로 취소가 됬음을 표시해 둔다.
      betDataCol
        .updateOne(
          {
            userId,
            agentCode,
            summaryId,
            betStatus: null,
          },
          {
            $set: {
              betStatus: 'CANCEL',
              historyStatus: 'DONE',
              updatedAt: new Date(),
            } as Partial<BetData>,
          },
        )
        .catch((err) => {
          console.log(err)
        })
    } catch (err) {}

    // 만약에 에러가 나더라도 beforeBalance와 updatedBalance는 넣어준다.
    return {
      status: Number.isNaN(err) ? CommonReturnType.DatabaseError : err,
      summaryId,
    }
  }
}

// 트랜잭션 취소
export async function rollbackTransaction({
  info,
  gameType,
  transId,
  orgTransId,
  betId,
  incAmount,
  betStatus,
  deleteOrigTrans,
  useLockedMoney,
  betTransactionType: rawBetTransactionType,
  packet,
}: {
  info: SaveTransactionInfoWithRepo
  gameType: GameType
  transId: string
  orgTransId?: string
  betId?: string
  incAmount?: number
  betStatus?: BetStatus
  deleteOrigTrans?: boolean
  useLockedMoney?: boolean
  betTransactionType?: 'CANCELBET' | 'ROLLBACKSETTLE' | 'CANCELBETNSETTLE' | 'ROLLBACK'
  packet
}): Promise<TransactionResult> {
  const { user, vendor, summaryId } = info
  // 둘다 없으면 안된다.
  if (orgTransId == null && incAmount == null && info.roundId == null) {
    return { status: CommonReturnType.InvalidParameter, summaryId }
  }

  let betTransactionType = rawBetTransactionType

  // let summaryId = thirdParty + '-' + gameId + '-' + roundId

  const rollbackFields: Partial<BetData> = {}
  let rollbackAmount = incAmount

  let orgTransIds = []

  const { agentCode, userId } = user
  if (orgTransId != null) {
    // 트랜잭션 ID만 주는 경우가 있어서 이렇게 수정 (Pragmatic Play)
    const orgTransaction = await info.betTransactionCol.findOne({
      where: {
        userId,
        agentCode,
        vendor,
        transId: orgTransId,
      },
    })

    if (orgTransaction == null) {
      // status는 CommonReturnType.TransactionNotFound 로 하고 미리 Cancel 트랜잭션을 하나 만들어서 넣어둔다.
      rollbackAmount = 0
    } else {
      if (orgTransaction.status === 'ROLLBACK') {
        return { status: CommonReturnType.TransactionAlreadyRollback, summaryId }
      } else if (orgTransaction.status !== 'OK') {
        return { status: CommonReturnType.TransactionNotFound, summaryId }
      }
      if (orgTransaction.betId != null && betTransactionType === 'CANCELBET') {
        // 이미 마감되었는지 찾아본다.
        const settleTransaction = await info.betTransactionCol.findOne({
          where: {
            userId,
            agentCode,
            vendor,
            betId: orgTransaction.betId,
            type: 'SETTLE',
          },
        })
        if (settleTransaction != null) {
          return { status: CommonReturnType.AlreadySettle, summaryId }
        }
      }

      if (summaryId == null) {
        info.summaryId = orgTransaction.summaryId
        info.gameId = orgTransaction.gameId
        info.roundId = orgTransaction.roundId
      }

      if (rollbackAmount == null) {
        rollbackAmount = -orgTransaction.amount
      }

      if (orgTransaction.incFields != null) {
        for (const key of Object.keys(orgTransaction.incFields)) {
          rollbackFields[key] = -orgTransaction.incFields[key]
        }
      }

      if (betTransactionType == null) {
        if (orgTransaction.type === 'BET') {
          betTransactionType = 'CANCELBET'
        } else if (orgTransaction.type === 'SETTLE') {
          betTransactionType = 'ROLLBACKSETTLE'
        } else if (orgTransaction.type === 'BETNSETTLE') {
          betTransactionType = 'CANCELBETNSETTLE'
        } else {
          betTransactionType = 'ROLLBACK'
        }
      }
    }
    orgTransIds = [orgTransId]
  } else if (betId != null) {
    const orgTransactions = await info.betTransactionCol.find({
      userId,
      agentCode,
      vendor,
      betId,
    })

    if (orgTransactions.length === 0) {
      return { status: CommonReturnType.TransactionNotFound, summaryId }
    }

    let newRollbackAmount = 0
    if (orgTransactions.length > 0) {
      let betCount = 0
      let rollbackCount = 0
      for (const orgTransaction of orgTransactions) {
        if (orgTransaction.type === 'BET') {
          betCount++
          // 이미 롤백됬거나 에러면 rollback금액을 차감한다.
          if (orgTransaction.status === 'ERROR' || orgTransaction.status === 'ROLLBACK') {
            rollbackCount++
          } else {
            newRollbackAmount -= orgTransaction.amount
            orgTransIds.push(orgTransaction.transId)
          }
        }
      }
      // 전부다 롤백됬으면 에러를 리턴한다.
      if (rollbackCount === betCount) {
        return { status: CommonReturnType.TransactionAlreadyRollback, summaryId }
      }
      if (betTransactionType === 'CANCELBET') {
        // 이미 마감되었는지 찾아본다.
        const settleTransaction = orgTransactions.find((value) => value.type === 'SETTLE')

        if (settleTransaction != null) {
          return { status: CommonReturnType.AlreadySettle, summaryId }
        }
      }
    }

    if (rollbackAmount == null) {
      rollbackAmount = newRollbackAmount
    }
  } else if (info.roundId != null) {
    // bota, livebar, wm 이 여기로 들어온다.

    let newRollbackAmount = 0
    // betId만 주는 경우가 있어서 이렇게 수정(livebar)
    const orgTransactions = await info.betTransactionCol.find({
      userId,
      agentCode,
      vendor,
      summaryId: info.summaryId,
    })

    if (orgTransactions.length > 0) {
      let betCount = 0
      let rollbackCount = 0
      for (const orgTransaction of orgTransactions) {
        if (orgTransaction.type === 'BET') {
          betCount++
          // 이미 롤백됬거나 에러면 rollback금액을 차감한다.
          if (orgTransaction.status === 'ERROR' || orgTransaction.status === 'ROLLBACK') {
            rollbackCount++
          } else {
            newRollbackAmount -= orgTransaction.amount
            orgTransIds.push(orgTransaction.transId)
          }
        }
      }
      // 전부다 롤백됬으면 에러를 리턴한다.
      if (rollbackCount === betCount) {
        return { status: CommonReturnType.TransactionAlreadyRollback, summaryId }
      }
      if (betTransactionType === 'CANCELBET') {
        // 이미 마감되었는지 찾아본다.
        const settleTransaction = orgTransactions.find((value) => value.type === 'SETTLE')

        if (settleTransaction != null) {
          return { status: CommonReturnType.AlreadySettle, summaryId }
        }
      }
    }

    if (rollbackAmount == null) {
      rollbackAmount = newRollbackAmount
    }
  }

  // CANCEL 일때는 rollbackAmount 가 + 이고 아닐때는 -다.
  const {
    historyStatus,
    incFields,
  }: {
    historyStatus: HistoryStatus
    incFields: Partial<BetData>
  } = (() => {
    switch (betTransactionType) {
      case 'CANCELBET':
        return {
          historyStatus: 'DO',
          incFields: { amountCancel: rollbackAmount, amountBet: -rollbackAmount },
        }
      case 'CANCELBETNSETTLE':
        return {
          historyStatus: 'DO',
          incFields: { amountRollback: rollbackAmount, ...rollbackFields },
        }
      case 'ROLLBACKSETTLE':
        return {
          historyStatus: 'DO',
          incFields: { amountRollback: -rollbackAmount, amountWin: rollbackAmount },
        }

      case 'ROLLBACK':
        return {
          historyStatus: 'DO',
          incFields: { amountRollback: Math.abs(rollbackAmount) },
        }
    }
  })()

  const transObj: BetDataTransaction = {
    type: betTransactionType,
    id: transId,
    amount: rollbackAmount,
    ...(betId != null && { betId }),
    incFields,
  }

  const res = await saveTransactions({
    info,
    gameType,
    betStatus,
    historyStatus,
    betTransactionType,
    incAmount: rollbackAmount,
    incFields,
    transactions: [transObj],
    ...(deleteOrigTrans ? { deleteTransactionIds: orgTransIds } : { rollbackTransactionIds: orgTransIds }),
    useLockedMoney,
    packet,
  })

  if (rollbackAmount === 0) {
    // rollbackAmount 가 0 이면 베팅이 아직 없는데 미리 Cancel이 와서 취소가 된거라 미리 Cancel 트랜잭션을 만들려고 넣은거라 TransactionNotFound를 리턴한다.
    return { status: CommonReturnType.ZeroCancelBet, summaryId }
  }

  return res
}

// 라운드 취소
export async function cancelRound({
  info,
  gameType,
  transId,
  betId,
  betStatus,
  deleteOrigTrans,
  packet,
}: {
  info: SaveTransactionInfoWithRepo
  gameType: GameType
  transId: string
  betId: string
  betStatus?: BetStatus
  deleteOrigTrans?: boolean
  packet
}): Promise<TransactionResult> {
  const { user, vendor, summaryId } = info

  const rollbackFields: Partial<BetData> = {}

  const { agentCode, userId } = user
  const betIdTrans = await info.betTransactionCol.find({
    agentCode,
    userId,
    vendor,
    betId,
  })

  const orgTransactions = betIdTrans.filter((value) => value.type === 'BET' || value.type === 'SETTLE')

  let rollbackAmount = 0
  let alreadyRollback = 0
  const rollbackTransactionIds: string[] = []
  for (const orgTransaction of orgTransactions) {
    if (summaryId == null) {
      info.summaryId = orgTransaction.summaryId
      info.gameId = orgTransaction.gameId
      info.roundId = orgTransaction.roundId
    }

    // 이미 롤백됬으면 rollback금액을 차감한다.
    if (orgTransaction.status === 'ROLLBACK') {
      alreadyRollback++

      continue
    }

    rollbackAmount -= orgTransaction.amount

    if (orgTransaction.incFields != null) {
      for (const key of Object.keys(orgTransaction.incFields)) {
        rollbackFields[key] = -orgTransaction.incFields[key]
      }
    } else if (orgTransaction.type === 'BET') {
      rollbackFields.amountBet = orgTransaction.amount
    } else if (orgTransaction.type === 'SETTLE') {
      rollbackFields.amountWin = -orgTransaction.amount
    }

    rollbackTransactionIds.push(orgTransaction.transId)
  }

  // 전부다 롤백됬으면 에러를 리턴한다.
  if (alreadyRollback === orgTransactions.length) {
    return { status: CommonReturnType.TransactionAlreadyRollback, summaryId }
  }

  const historyStatus = 'DO'
  const incFields = { amountRollback: rollbackAmount, ...rollbackFields }

  const transObj: BetDataTransaction = {
    type: 'CANCELROUND',
    id: transId,
    amount: rollbackAmount,
    betId,
    incFields,
  }

  const res = await saveTransactions({
    info,
    gameType,
    betStatus,
    historyStatus,
    betTransactionType: 'CANCELROUND',
    incAmount: rollbackAmount,
    incFields,
    transactions: [transObj],
    ...(deleteOrigTrans ? { deleteTransactionIds: rollbackTransactionIds } : { rollbackTransactionIds }),
    packet,
  })

  if (rollbackTransactionIds.length === 0) {
    // rollbackTransactionIds 가 없으면 베팅이 아직 없는데 미리 Cancel이 와서 취소가 된거라 미리 Cancel 트랜잭션을 만들려고 넣은거라 TransactionNotFound를 리턴한다.
    return { status: CommonReturnType.TransactionNotFound, summaryId }
  }

  return res
}

// 트랜잭션 재마감
export async function resettleTransaction({
  info,
  gameType,
  transId,
  amountWin,
  betId,
  packet,
}: {
  info: SaveTransactionInfoWithRepo
  gameType: GameType
  transId: string
  amountWin: number
  betId?: string
  packet
}): Promise<TransactionResult> {
  const { user, vendor, summaryId } = info

  const { agentCode, userId } = user

  let orgAmountWin = 0

  if (betId != null) {
    const orgTransaction = await info.betTransactionCol.findOne({
      where: {
        userId,
        agentCode,
        vendor,
        betId,
        type: 'SETTLE',
      },
    })

    if (orgTransaction == null) {
      return { status: CommonReturnType.TransactionNotFound, summaryId }
    }

    if (orgTransaction.amount === amountWin) {
      return { status: CommonReturnType.TransactionAlreadyRollback, summaryId }
    }

    orgAmountWin = orgTransaction.amount
  } else {
    const summaryDoc = await info.betDataCol.findOne({
      where: {
        userId,
        agentCode,
        vendor,
        summaryId,
      },
    })

    if (summaryDoc == null) {
      return { status: CommonReturnType.TransactionNotFound, summaryId }
    }

    if (summaryDoc.amountWin === amountWin) {
      return { status: CommonReturnType.TransactionAlreadyRollback, summaryId }
    }

    orgAmountWin = summaryDoc.amountWin ?? 0
  }

  const incAmount = amountWin - orgAmountWin

  const incFields = {
    amountWin: incAmount,
  }

  const transObj: BetDataTransaction = {
    type: 'SETTLE',
    id: transId,
    amount: incAmount,
    incFields,
  }

  return await saveTransactions({
    info,
    gameType,
    betStatus: 'SETTLE',
    historyStatus: 'DO',
    checkUpsert: false,
    betTransactionType: 'RESETTLE',
    incAmount,
    incFields,
    transactions: [transObj],
    packet,
  })
}
