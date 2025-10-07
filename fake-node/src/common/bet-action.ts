import { type MongoBet } from '@service/src/lib/interface/mongo'
import { type PlayerBetRequest } from './fake-packet-types'
import { evolutionTableInfos } from '@service/src/lib/common/data/evolution-tables'
import { type User } from '@service/src/lib/interface/sql/user'
import { type FakeBetData } from '@service/src/lib/interface/mongo/fake-bet-data'
import { type Chips } from './types'
import { errorToString } from './util'
import { addHours } from 'date-fns'

export const FakeChipDict = {
  // 1000원 칩은 하프 베팅시 거절될수도 있기 때문에 2000원으로 수정
  // 5000: 1000,
  //5000: 2000,
  // 거의 모든 테이블의 최소 베팅이 1만칩 이상으로 변경되서 1만칩으로 수정
 // 25000: 10000,
 // 50000: 10000,
 // 100000: 10000,
 // 500000: 10000,
 // 1000000: 25000,
  25000: 10000,
  50000: 10000,
  100000: 25000,
  500000: 50000,
  1000000: 100000,
}

export type SaveBetType = PlayerBetRequest & {
  Undo?: boolean
  proceed?: boolean
  receiveTime?: Date
  incOrgChips?: Record<string, number>
  incFakeChips?: Record<string, number>
}

export function getFakeChip(orgAmount) {
  let fakeChip = FakeChipDict[orgAmount] == null ? orgAmount : FakeChipDict[orgAmount]
  if (fakeChip >= 1000000) {
    // 페이크 칩을 10만원으로 제한
    fakeChip = 100000
  }
  return fakeChip
}

export async function processBetAction(params: {
  mongoDB: MongoBet
  fakeBet: FakeBetData
  user: User
  vendor: string
  requestPacket: PlayerBetRequest & {
    incOrgChips?: Record<string, number>
    incFakeChips?: Record<string, number>
    responseChips?: Record<string, number>
  }
  setObj: Partial<FakeBetData>
  betOrg: Record<string, number>
  betFake: Record<string, number>
  limits: Record<
    string,
    {
      min: number
      max: number
    }
  >
}) {
  const { mongoDB, fakeBet, user, vendor, requestPacket, setObj, betOrg, betFake, limits } = params

  const { action } = requestPacket.args

  const { name } = action

  const { agentCode, userId } = user

  const username = agentCode + userId

  const { tableId, roundId } = fakeBet

  let incOrgChips: Record<string, number> = {}
  let incFakeChips: Record<string, number> = {}

  console.log(`bet action ${name} ${username} tableId ${tableId} round ${roundId} ${JSON.stringify(action)}`)

  // const unsetObj: Record<BetDataCasino, ''> = {}
  if (name === 'Chips') {
    const { chips } = action
    for (const spot in chips) {
      // 클라이언트 오류로 칩을 테이블 리밋 이상 걸어도 테이블 리밋 이상 안걸리게 수정
      // 에볼루션 봇들이 string으로 보낼 때가 있음
      let incOrgAmount = Number(chips[spot])
      const betMax = limits?.[spot]?.max
      const betOrgAmount = betOrg[spot] ?? 0
      if (betMax != null && incOrgAmount + betOrgAmount > betMax) {
        incOrgAmount = betMax - betOrgAmount
      }
      incOrgChips[spot] = incOrgAmount

      incFakeChips[spot] = getFakeChip(chips[spot])

      const tableInfo = evolutionTableInfos[tableId]

      const gameType = tableInfo?.gameTypeUnified
      if (gameType != null) {
        mongoDB.fakeLoginData
          .updateOne(
            {
              username,
            },
            {
              $set: {
                [`lastSelectedChips.${gameType}`]: incOrgAmount,
              },
            },
          )
          .catch((err) => {
            console.log(errorToString(err))
          })
      }
    }
  } else if (name === 'Chip') {
    // 클라이언트 오류로 칩을 테이블 리밋 이상 걸어도 테이블 리밋 이상 안걸리게 수정
    const { chip } = action
    const { spot } = chip
    // 에볼루션 봇들이 string으로 보낼 때가 있음
    let incOrgAmount = Number(chip.amount)
    const betMax = limits?.[spot]?.max
    const betOrgAmount = betOrg[spot] ?? 0
    if (betMax != null && incOrgAmount + betOrgAmount > betMax) {
      incOrgAmount = betMax - betOrgAmount
    }
    incOrgChips[spot] = incOrgAmount

    incFakeChips[spot] = getFakeChip(chip.amount)

    const tableInfo = evolutionTableInfos[tableId]

    const gameType = tableInfo?.gameTypeUnified
    if (gameType != null) {
      mongoDB.fakeLoginData
        .updateOne(
          {
            username,
          },
          {
            $set: {
              [`lastSelectedChips.${gameType}`]: incOrgAmount,
            },
          },
        )
        .catch((err) => {
          console.log(errorToString(err))
        })
    }
  } else if (name === 'Undo') {
    const saveBets = Object.values(fakeBet.saveBet) as Array<
      PlayerBetRequest & {
        Undo?: boolean
        incOrgChips?: Record<string, number>
        incFakeChips?: Record<string, number>
      }
    >

    const undoTimestamp = requestPacket.args.timestamp

    for (let undoIndex = saveBets.length - 1; undoIndex >= 0; undoIndex--) {
      const bet = saveBets[undoIndex]
      if (
        !bet.Undo &&
        bet.args.action.name !== 'Undo' &&
        bet.args.action.name !== 'UndoAll' &&
        bet.args.timestamp < undoTimestamp &&
        bet.incOrgChips != null // incOrgChips 가 있어야 처리가 된 패킷이기 때문에
      ) {
        for (const [key, value] of Object.entries(bet.incOrgChips)) {
          incOrgChips[key] = -value
        }
        for (const [key, value] of Object.entries(bet.incFakeChips)) {
          incFakeChips[key] = -value
        }

        bet.Undo = true
        setObj[`saveBet.${bet.args.timestamp}.Undo`] = true
        break
      }
    }
  } else if (name === 'UndoAll') {
    // Undo 버튼 누르고 있으면 3번 Undo 됬다가 4번째에 UndoAll이 호출된다.

    const saveBets = Object.values(fakeBet.saveBet) as SaveBetType[]

    const undoTimestamp = requestPacket.args.timestamp

    for (let undoBetIndex = saveBets.length - 1; undoBetIndex >= 0; undoBetIndex--) {
      const bet = saveBets[undoBetIndex]
      if (
        !bet.Undo &&
        bet.args.action.name !== 'Undo' &&
        bet.args.action.name !== 'UndoAll' &&
        bet.args.timestamp < undoTimestamp &&
        bet.incOrgChips != null // incOrgChips 가 있어야 처리가 된 패킷이기 때문에
      ) {
        bet.Undo = true
        setObj[`saveBet.${bet.args.timestamp}.Undo`] = true
      }
    }

    for (const [key, value] of Object.entries(betOrg)) {
      incOrgChips[key] = (incOrgChips[key] ?? 0) - value
    }
    for (const [key, value] of Object.entries(betFake)) {
      incFakeChips[key] = (incFakeChips[key] ?? 0) - value
    }
  } else if (name === 'Repeat') {
    // 전 판에 베팅 했던 금액을 다시 똑같이 베팅함.

    let previousBetOrg: Chips = {}
    let previousBetFake: Chips = {}

    const { responseChips } = requestPacket
    if (fakeBet.repeatData != null && responseChips != null) {
      console.log(
        `repeatData ${username} ${JSON.stringify(fakeBet.repeatData)} reasponseChips ${JSON.stringify(responseChips)}`,
      )

      for (const spot in fakeBet.repeatData) {
        if (spot.includes('Lightning')) {
          continue
        }
        if (spot.includes('Fee')) {
          continue
        }
        previousBetOrg[spot] = fakeBet.repeatData[spot] ?? 0
        previousBetFake[spot] = responseChips[spot] ?? 0
      }
    } else {
      const previousBetData = await mongoDB.betDataCasino.findOne({
        where: {
          vendor,
          userId,
          agentCode,
          tableId,
          //8시간 전까지의 베팅만 참조한다.
          betTime: { $gt: addHours(fakeBet.betTime, -8) },
          // 2023-02-10 에서 CANCEL된 베팅을 Repeat이 먹혀서 생기는 문제 때문에 CANCEL 된 betStatus도 참조하게 변경
          // 2024-08-14 에서 아직 완료 처리가 되지 않았는데 Repeat이 되서 전전판의 베팅 데이터를 가져오는 참사가 발생해서 Bet 상태도 먹도록 변경
          //$or: [{ betStatus: 'SETTLE' }, { betStatus: 'CANCEL' }],
          // betStatus: 'SETTLE',
        },
        order: {
          betTime: -1,
        },
      })
      if (previousBetData == null) {
        throw new Error(`previousBetData is null ${vendor} ${userId + agentCode} ${tableId}`)
      }
      previousBetOrg = previousBetData.betOrg
      previousBetFake = previousBetData.betFake
    }

    // const feeName = getFeeName(tableId)

    // const amountBet = Object.values(previousBetOrg).reduce((a, b) => a + b, 0) * (feeName != null ? 1.2 : 1)

    // 유저 잔고 보다 베팅 금액이 많아도 원본 에볼 클라이언트에서는 걸어는 지고. 유저가 다시 칩을 제거해서 금액을 맞출 수 있다.
    incOrgChips = previousBetOrg
    incFakeChips = previousBetFake

    /* if (amountBet > user.balance) {
      console.log(`repeat insufficient ${username} amountBet(${amountBet}) > user.balance(${user.balance}) `)
    } else if (amountBet > 0) {
      incOrgChips = previousBetOrg
      incFakeChips = previousBetFake
    } */
  } else if (name === 'Double') {
    for (const spot of Object.keys(betOrg)) {
      let incOrgAmount = betOrg[spot]
      const betMax = limits?.[spot]?.max
      if (betMax != null && incOrgAmount + betOrg[spot] > limits[spot].max) {
        incOrgAmount = limits[spot].max - betOrg[spot]
      }

      incOrgChips[spot] = incOrgAmount
      incFakeChips[spot] = betFake[spot]
    }
  } else if (name === 'Move') {
    // 칩을 드래그로 옳기면 Move가 호출된다.
    const { betSpotFrom, betSpotTo } = action

    const betMax = limits?.[betSpotTo]?.max

    const orgFrom = betOrg[betSpotFrom]
    const fakeFrom = betFake[betSpotFrom]

    incOrgChips[betSpotFrom] = -orgFrom
    incFakeChips[betSpotFrom] = -fakeFrom
    if (betSpotTo != null) {
      let incOrgAmount = orgFrom
      const betOrgAmount = betOrg[betSpotTo] ?? 0
      console.log('betAction_Move', username, betSpotTo, betMax, betOrgAmount, incOrgAmount)
      if (betMax != null && incOrgAmount + betOrgAmount > betMax) {
        incOrgAmount = betMax - betOrgAmount
      }
      incOrgChips[betSpotTo] = incOrgAmount
      incFakeChips[betSpotTo] = fakeFrom
    }
  }

  requestPacket.incOrgChips = incOrgChips
  requestPacket.incFakeChips = incFakeChips

  const incOrgChipArr = Object.entries(incOrgChips ?? {})
  const incFakeChipArr = Object.entries(incFakeChips ?? {})

  for (const [spot, value] of incOrgChipArr) {
    betOrg[spot] = (betOrg[spot] ?? 0) + value
  }
  for (const [spot, value] of incFakeChipArr) {
    betFake[spot] = (betFake[spot] ?? 0) + value
  }

  if (incOrgChipArr.length > 0) {
    setObj[`saveBet.${requestPacket.args.timestamp}.incOrgChips`] = incOrgChips
  }
  if (incFakeChipArr.length > 0) {
    setObj[`saveBet.${requestPacket.args.timestamp}.incFakeChips`] = incFakeChips
  }
  setObj[`saveBet.${requestPacket.args.timestamp}.proceed`] = true

  return { incOrgChips, incFakeChips }
}

export async function updateBetAction(
  mongoDB: MongoBet,
  fakeBet: FakeBetData,
  incOrgChips: Record<string, number>,
  incFakeChips: Record<string, number>,
  setObj: Partial<FakeBetData>,
) {
  const incObj = {}

  const incOrgChipArr = Object.entries(incOrgChips ?? {})
  const incFakeChipArr = Object.entries(incFakeChips ?? {})

  for (const [spot, value] of incOrgChipArr) {
    incObj[`betOrg.${spot}`] = value
  }
  for (const [spot, value] of incFakeChipArr) {
    incObj[`betFake.${spot}`] = value
  }

  await mongoDB.fakeBetData.updateOne(
    {
      _id: fakeBet._id,
    } as Partial<FakeBetData>,
    {
      $setOnInsert: {
        betTime: new Date(),
      },
      $set: {
        updatedAt: new Date(),
        ...setObj,
      } as Partial<FakeBetData>,
      $inc: incObj,
    },
  )
}
