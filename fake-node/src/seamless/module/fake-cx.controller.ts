import { FastifyInstance } from 'fastify'

import { MINUTE_MS, getUserInfo } from '../../common/util'
import { CommonReturnType } from '@service/src/lib/common/types/common-return-type'
import { authManager, casinoManager, mainSQL, mongoDB } from '../app'
import { AuthRequest, ReturnCodes, TransferRequest, convertReturnCode } from '@service/src/vendor/cx/interface'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'

import { GameStatePacket } from '../../common/fake-packet-types'
import { SaveBetType, processBetAction } from '../../common/bet-action'
import { getFeeInfo } from '../../common/fake-util'

import { TransactionResult } from '@service/src/lib/common/game/save-transaction'
import { BetData } from '@service/src/lib/interface/mongo/data-bet-data'
import { FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'
import { getEvolutionTable } from '@service/src/lib/common/game/evolution-table-store'
import { errorToString } from '@service/src/lib/utility/error'

const vendorCode = VendorCode.FakeCX_Evolution

export function registerFakeSwixController(fastify: FastifyInstance) {
  fastify.get('/cx', async (req, reply) => {
    return {
      hello: 'swix',
    }
  })

  fastify.post('/cx/authenticate', async (req, reply) => {
    const body = req.body as AuthRequest

    const { userid: username } = body

    const { agentCode, userId } = getUserInfo(username)

    const balanceRes = await authManager.balance(agentCode, userId)

    if (balanceRes.status !== CommonReturnType.Success) {
      // 크롤링 아이디를 위해서 아이디가 없어도 balance를 0으로 리턴해 준다.
      return {
        result: ReturnCodes.Success,
        balance: 0,
      }
    }

    console.log(`fc_authenticate_success ${username} : ${balanceRes.balance}`)
    const { user } = balanceRes

    if (user.fakeMode) {
      // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
      let balance = user.fakeBalance
      if (user.fakeBalance < balanceRes.balance && user.fakeBalance < 3_000_000) {
        console.log(`fh_balance_update ${username} ${balance} ${balanceRes.balance}`)
        await mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: balanceRes.balance })
        balance = balanceRes.balance
      }

      console.log(`fc_fake_authenticate_result ${username} ${balance}`)

      return {
        result: ReturnCodes.Success,
        balance,
      }
    }

    return {
      result: ReturnCodes.Success,
      balance: balanceRes.balance,
    }
  })
  fastify.post('/cx/balance', async (req, reply) => {
    const body = req.body as AuthRequest

    const { userid: username } = body

    const { agentCode, userId } = getUserInfo(username)

    const balanceRes = await authManager.balance(agentCode, userId)

    if (balanceRes.status !== CommonReturnType.Success) {
      // 크롤링 아이디를 위해서 아이디가 없어도 balance를 0으로 리턴해 준다.
      return {
        result: ReturnCodes.Success,
        balance: 0,
      }
    }

    console.log(`fc_balance_res ${username} ${balanceRes.status} ${balanceRes.balance}`)
    const { user } = balanceRes

    if (user.fakeMode) {
      // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
      let balance = user.fakeBalance
      if (user.fakeBalance < balanceRes.balance && user.fakeBalance < 3_000_000) {
        console.log(`fh_balance_update ${username} ${balance} ${balanceRes.balance}`)
        await mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: balanceRes.balance })
        balance = balanceRes.balance
      }

      console.log(`fc_fake_balance_success ${username} ${balance}`)

      return {
        result: ReturnCodes.Success,
        balance,
      }
    }
    return {
      result: ReturnCodes.Success,
      balance: balanceRes.balance,
    }
  })

  fastify.post('/cx/bet', async (req, reply) => {
    const body = req.body as TransferRequest

    const {
      userid: username,
      game_code: tableId,
      table_code: tableName,
      table_type,
      round_id,
      trans_id,
      amount,
      third_party_code,
      game_type,
    } = body

    const summaryId = vendorCode + '-' + tableId + '-' + round_id

    console.log(`fc_bet_start ${username} ${tableId} ${summaryId}`)

    if (third_party_code !== '1' || game_type !== 'live') {
      return {
        result: ReturnCodes.InternalServerError,
      }
    }

    /*if (tableId === 'PowerBall0000001') {
      return {
        result: ReturnCodes.InternalServerError,
      }
    }*/

    const { userId, agentCode } = getUserInfo(username)

    const authInfo = await authManager.checkAuth(username)

    const { user, agent } = authInfo

    const amountFakeBet = -Number(amount)

    console.log('fc_bet_1 : ' + user.fakeMode)

    const evolutionTable = await getEvolutionTable(mongoDB, tableId)

    if (evolutionTable == null) {
      await mongoDB.dataEvolutionTable
        .insertOne({
          _id: tableId,
          name: tableName,
          gameType: table_type,
          gameTypeUnified: table_type,
        })
        .catch((err) => console.log(errorToString(err)))
    }

    if (user.fakeMode) {
      let betRes: TransactionResult

      const summaryId = vendorCode + '-' + tableId + '-' + round_id

      const fakeBet = await mongoDB.fakeBetData.findOne({
        where: {
          vendor: vendorCode,
          userId,
          agentCode,
          tableId,
          summaryId: null,
        },
        order: {
          betTime: -1,
        },
      })

      if (fakeBet != null) {
        console.log(`fc_fake_bet_2 ${username} ${JSON.stringify(fakeBet)}`)

        const MINUTE_2 = MINUTE_MS * 2

        if (new Date().getTime() - fakeBet.betTime.getTime() > MINUTE_2) {
          //페이크 데이터가 있는데 베팅 시간이 너무 오래 지났으면 에러를 리턴한다.
          return {
            result: ReturnCodes.InternalServerError,
          }
        }

        const { betLimits } = fakeBet

        // 만약 처리 안된 베팅이 있으면 처음부터 다시 betOrg 를 생성한다.
        // 처음에만 처리되고 중간에 재접속했을 때 중간에 처리안된 패킷들이 있기 때문이다.
        let unproceedPacket = false

        for (const unknownBet of Object.values(fakeBet.saveBet)) {
          const bet: any = unknownBet
          if (bet.proceed !== true) {
            unproceedPacket = true
          }
        }

        let fakeBetSetObj = {}

        if (fakeBet.betOrg == null || unproceedPacket) {
          const setObj: Partial<FakeBetData> = {}

          console.log(`create betOrg ${username} ${summaryId}`)

          const gameData = await mongoDB.fakeGameData.findOne({
            where: {
              gameId: fakeBet.roundId,
              tableId: tableId,
            },
          })

          let betClosedTimestamp: number = null
          for (const id in gameData?.packet ?? {}) {
            const packet = gameData.packet[id] as GameStatePacket
            if (packet == null) {
              continue
            }

            if (packet.args?.betting === 'BetsClosed') {
              betClosedTimestamp = packet.time
              break
            }
          }

          fakeBet.betOrg = {}
          fakeBet.betFake = {}

          const totalIncOrgChips: { [spot: string]: number } = {}
          const totalIncFakeChips: { [spot: string]: number } = {}

          // 중간까지만 처리되었던 결과들을 전부 삭제한다.
          for (const key in fakeBet.saveBet) {
            const packet = fakeBet.saveBet[key] as SaveBetType
            delete packet.Undo
            delete packet.proceed
            delete packet.incOrgChips
            delete packet.incFakeChips
          }

          for (const key in fakeBet.saveBet) {
            const packet = fakeBet.saveBet[key] as SaveBetType

            if (betClosedTimestamp != null && packet.args.timestamp > betClosedTimestamp) {
              console.log(
                `skip after closed bet ${username} ${summaryId} ${packet.args.timestamp} > ${betClosedTimestamp}`,
              )
              continue
            }

            const { incOrgChips, incFakeChips } = await processBetAction({
              mongoDB,
              fakeBet,
              user,
              vendor: vendorCode,
              requestPacket: packet,
              setObj,
              betOrg: fakeBet.betOrg,
              betFake: fakeBet.betFake,
              limits: betLimits,
            })

            for (const [spot, value] of Object.entries(incOrgChips)) {
              totalIncOrgChips[spot] = (totalIncOrgChips[spot] ?? 0) + value
            }
            for (const [spot, value] of Object.entries(incFakeChips)) {
              totalIncFakeChips[spot] = (totalIncFakeChips[spot] ?? 0) + value
            }
          }

          console.log(`update bet action ${username} ${summaryId} ${JSON.stringify(totalIncOrgChips)}`)

          //await updateBetAction(mongoDB, fakeBet, totalIncOrgChips, totalIncFakeChips, setObj)
          fakeBetSetObj = {
            calculatedOrg: fakeBet.betOrg,
            calculatedFake: fakeBet.betFake,
          }
        }

        mongoDB.fakeBetData
          .updateOne(
            {
              _id: fakeBet._id,
            } as Partial<FakeBetData>,
            {
              $set: {
                updatedAt: new Date(),
                summaryId,
                vendorRoundId: round_id,
                ...fakeBetSetObj,
              } as Partial<FakeBetData>,
            },
          )
          .catch((err) => console.log(err))

        const feeInfo = getFeeInfo(tableId)

        const betAccepted: { [spot: string]: number } = {}

        let betAmount = 0
        for (const spot of Object.keys(fakeBet.betOrg)) {
          const orgChip = fakeBet.betOrg[spot]
          if (orgChip < betLimits?.[spot]?.min) {
            delete fakeBet.betOrg[spot]
            delete fakeBet.betFake[spot]
          } else {
            betAmount += orgChip
            betAccepted[spot] = orgChip
            if (feeInfo != null) {
              const fee = fakeBet.betOrg[spot] * feeInfo.rate
              betAccepted[spot + feeInfo.name] = fee
              betAmount += fee
            }
          }
        }

        if (betAmount <= 0) {
          //위에서 칩이 삭제될 수도 있으니깐 여기서 한번 베팅금액이 있는지 확인한다.
          return {
            result: ReturnCodes.InternalServerError,
          }
        }

        console.log('fc_fake_bet_3')

        betRes = await casinoManager.singleBet({
          info: {
            agent,
            user,
            vendor: vendorCode,
            gameId: tableId,
            roundId: round_id,
            tableId: tableId,
            betTime: fakeBet.betTime,
            additional: {
              betOrg: fakeBet.betOrg,
              betFake: fakeBet.betFake,
              betAccepted,
              fakeAmountBet: -amountFakeBet,
              isFakeVendor: true,
              fakeRoundId: fakeBet.roundId,
              isFakeBet: true,
            },
          },
          transId: trans_id,
          betId: round_id,
          incAmount: -betAmount,
          packet: body,
        })
      } else {
        //없으면 일반 베팅
        betRes = await casinoManager.singleBet({
          info: {
            agent,
            user,
            vendor: vendorCode,
            gameId: tableId,
            roundId: round_id,
            tableId,
            additional: {
              isFakeVendor: true,
            },
          },
          transId: trans_id,
          betId: round_id,
          incAmount: amountFakeBet,
          packet: body,
        })
      }

      console.log(`fc_fake_bet_res : ${betRes.status}`)

      if (betRes.status === CommonReturnType.TransactionExists) {
        betRes.status = CommonReturnType.Success
      }

      console.log(`fc_fake_bet_success ${username} : ${betRes.balance}`)

      if (betRes.balance == null) {
        const { agentCode, userId } = user
        const balanceRes = await authManager.balance(agentCode, userId)
        betRes.balance = balanceRes.balance
      }

      let updatedFakeBalance = user.fakeBalance + amountFakeBet

      // 실 밸런스보다 작고 페이크로 최대 베팅할 수 있는 300만원보다 작으면 페이크 밸런스를 업데이트 한다.
      if (updatedFakeBalance < betRes.balance && updatedFakeBalance < 3_000_000) {
        mainSQL.repos.user.update({ idx: user.idx }, { fakeBalance: betRes.balance }).catch((err) => console.log(err))
        updatedFakeBalance = betRes.balance
      } else {
        // 베팅이 성공했고 페이크 밸런스가 충분히 크면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
        mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountFakeBet).catch((err) => console.log(err))
      }

      betRes.balance = updatedFakeBalance

      return {
        result: convertReturnCode(betRes.status),
        balance: betRes.balance,
      }
    }

    const res = await casinoManager.singleBet({
      info: {
        agent,
        user,
        vendor: vendorCode,
        gameId: tableId,
        roundId: round_id,
        tableId,
        additional: {
          isFakeVendor: true,
        },
      },
      transId: trans_id,
      betId: round_id,
      incAmount: amountFakeBet,
      packet: body,
    })

    console.log(`fc_bet_res : ${res.status}`)

    if (res.status === CommonReturnType.TransactionExists) {
      res.status = CommonReturnType.Success
    }

    if (res.balance == null) {
      const { agentCode, userId } = user
      const balanceRes = await authManager.balance(agentCode, userId)
      res.balance = balanceRes.balance
    }

    console.log(`fc_bet_success ${username} : ${res.balance}`)

    return {
      result: convertReturnCode(res.status),
      balance: res.balance,
    }
  })

  fastify.post('/cx/result', async (req, reply) => {
    const body = req.body as TransferRequest

    const { userid: username, game_code: tableId, round_id, trans_id, amount, third_party_code, game_type } = body

    const summaryId = vendorCode + '-' + tableId + '-' + round_id

    console.log(`fc_result_start ${username} ${tableId} ${summaryId}`)

    if (third_party_code !== '1' || game_type !== 'live') {
      return {
        result: ReturnCodes.InternalServerError,
      }
    }

    const { userId, agentCode } = getUserInfo(username)

    const authInfo = await authManager.checkAuth(username)

    const { user, agent } = authInfo
    const amountWin = Number(amount)

    if (user.fakeMode) {
      const fakeBet = await mongoDB.fakeBetData.findOne({
        where: {
          summaryId,
          userId,
          agentCode,
        },
      })

      let res: TransactionResult

      if (fakeBet != null) {
        await mongoDB.betDataCasino.updateOne(
          {
            summaryId,
            agentCode,
            userId,
            vendor: vendorCode,
          },
          {
            $set: {
              fakeAmountWin: amountWin,
            } as Partial<BetData>,
          },
        )

        res = {
          status: CommonReturnType.Success,
          summaryId,
        }
      } else {
        //betOrg가 없을때만 일반적인 마감처리를 하고 페이크 베팅은 따로 fake-resolver 서버에 맞긴다.
        res = await casinoManager.betSettlement({
          info: {
            agent,
            user,
            vendor: vendorCode,
            gameId: tableId,
            roundId: round_id,
            tableId,
          },
          transId: trans_id,
          betId: round_id,
          incAmount: amountWin,
          allowAdditionalSettle: true,
          packet: body,
        })
      }

      console.log(`fc_fake_result_res : ${res.status}`)

      if (res.status === CommonReturnType.TransactionExists || res.status === CommonReturnType.AlreadySettle) {
        res.status = CommonReturnType.Success
      }

      const updatedFakeBalance = user.fakeBalance + amountWin

      res.balance = updatedFakeBalance

      // 마감이 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
      mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountWin).catch((err) => console.log(err))

      console.log(`fc_fake_result_success ${username} : ${res.balance}`)
      return {
        result: convertReturnCode(res.status),
        balance: res.balance,
      }
    }

    const res = await casinoManager.betSettlement({
      info: {
        agent,
        user,
        vendor: vendorCode,
        gameId: tableId,
        roundId: round_id,
        tableId,
      },
      transId: trans_id,
      betId: round_id,
      incAmount: amountWin,
      allowAdditionalSettle: true,
      packet: body,
    })

    console.log(`fc_result_res : ${res.status}`)

    if (res.status === CommonReturnType.TransactionExists || res.status === CommonReturnType.AlreadySettle) {
      res.status = CommonReturnType.Success
    }

    if (res.balance == null) {
      const { agentCode, userId } = user
      const balanceRes = await authManager.balance(agentCode, userId)
      res.balance = balanceRes.balance
    }

    console.log(`fc_result_success ${username} : ${res.balance}`)
    return {
      result: convertReturnCode(res.status),
      balance: res.balance,
    }
  })

  fastify.post('/cx/refund', async (req, reply) => {
    const body = req.body as TransferRequest

    const { userid: username, game_code: tableId, round_id, trans_id, amount, third_party_code, game_type } = body

    const summaryId = vendorCode + '-' + tableId + '-' + round_id

    console.log(`fc_refund_start ${username} ${tableId} ${summaryId}`)

    if (third_party_code !== '1' || game_type !== 'live') {
      return {
        result: ReturnCodes.InternalServerError,
      }
    }

    const { userId, agentCode } = getUserInfo(username)

    const [authInfo, betData] = await Promise.all([
      authManager.checkAuth(username),
      mongoDB.betDataCasino.findOne({
        where: {
          summaryId,
          agentCode,
          userId,
          vendor: vendorCode,
        },
      }),
    ])
    const { user, agent } = authInfo

    const amountCancel = Number(amount)

    let res: TransactionResult
    if (betData?.isFakeBet) {
      res = {
        status: CommonReturnType.Success,
        summaryId,
      }
    } else {
      res = await casinoManager.betCancel({
        info: {
          agent,
          user,
          vendor: vendorCode,
          gameId: tableId,
          roundId: round_id,
          tableId: tableId,
        },
        transId: 'c' + trans_id,
        orgTransId: trans_id,
        incAmount: amountCancel,
        packet: body,
      })
    }

    console.log(`fc_refund_res ${username} ${res.status}`)

    if (
      res.status === CommonReturnType.TransactionExists ||
      res.status === CommonReturnType.TransactionAlreadyRollback
    ) {
      res.status = CommonReturnType.Success
    }

    if (user.fakeMode) {
      const updatedFakeBalance = user.fakeBalance + amountCancel

      res.balance = updatedFakeBalance

      // 마감이 성공했으면 Fake 금액만큼을 FakeBalance에서 빼서 결과처리 해준다.
      mainSQL.repos.user.increment({ idx: user.idx }, 'fakeBalance', amountCancel).catch((err) => console.log(err))
    }

    console.log(`fc_refund_success ${username} ${res.balance}`)

    return {
      result: convertReturnCode(res.status),
      balance: res.balance,
    }
  })
}
