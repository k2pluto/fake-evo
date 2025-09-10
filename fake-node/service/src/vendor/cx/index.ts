import { Md5 } from 'md5-typescript'
import axios from 'axios'
import { JTDDataType, SomeJTDSchemaType } from 'ajv/dist/jtd'

import { JoinResult, Vendor, JoinOptions, LegacyHistoryOptions, CreateResult, APIEnv } from '..'
import { User } from '../../lib/interface/sql/user'
import { makeErrorObj, querystring } from '../util'
import { BetDataCasino } from '../../lib/interface/mongo/data-bet-data-casino'
import { BetDataSlot } from '../../lib/interface/mongo/data-bet-data-slot'
import { GameInfo } from '../../lib/interface/mongo/data-game-info'
import { VendorCode } from '../../lib/common/types/vendor-code'

import { Sleep } from '../../lib/utility/helper'
import { GameListItem } from './interface'
import { errorToString } from '../../lib/utility/util'

export interface CXEnv extends APIEnv {
  API_URL: string

  OP_KEY: string

  THIRDPARTY_CODE?: number

  GAME_CODE?: string
}

export const CXConfigSchema = {
  optionalProperties: {
    bet_limit: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F'] },
  },
} satisfies SomeJTDSchemaType

type CXParam = JTDDataType<typeof CXConfigSchema>

export function makeUrl(apiFunction: string, { OP_KEY, API_URL }: CXEnv, body: any) {
  const paramsStr = querystring({
    opkey: OP_KEY,
    ...body,
  })

  const encoded = Md5.init(OP_KEY + '|' + paramsStr)

  return `${API_URL}${apiFunction}?${paramsStr}&hash=${encoded}`
}

export class ThirdPartyCX extends Vendor<CXEnv> {
  //env: CXEnv

  async create(user: User, userId: string) {
    const result = new CreateResult<unknown>()

    try {
      result.url = makeUrl('/create_account', this.env, {
        userid: userId,
        nick: userId,
      })

      const res = await axios.get(result.url)

      const createRes = (result.result = res.data as {
        result: number
        msg: string
        data: unknown
      })

      if (createRes.result !== 1) {
        result.error = {
          type: 'vendor',
          message: createRes.msg,
          code: createRes.result.toString(),
        }
        return result
      }

      result.success = true
    } catch (err) {
      result.error = makeErrorObj(err)
    }

    return result
  }

  async join({ agentCode, userId, code, vendorSetting }: JoinOptions) {
    const result = new JoinResult<unknown>()

    try {
      result.url = makeUrl('/play', this.env, {
        userid: agentCode + userId,
        //thirdpartycode: '17',
        //gamecode: 'WAZ-9lions',
        thirdpartycode: this.env.THIRDPARTY_CODE,
        gamecode: this.env.GAME_CODE ?? code,
        platform: 'PC',
        ...(vendorSetting?.config as CXParam),
      })

      const res = await axios.get(result.url)

      const joinRes = (result.result = res.data as {
        result: number
        msg: string
        data: any
      })

      if (joinRes.result !== 1) {
        result.error = {
          type: 'vendor',
          message: joinRes.msg,
          code: joinRes.result.toString(),
        }
        return result
        // throw new Error('result is ' + joinRes.result)
      }

      result.gameUrl = joinRes.data?.link

      result.success = true
    } catch (err) {
      result.error = makeErrorObj(err)
    }

    return result
  }

  pad = (number, length) => {
    let str = `${number}`
    while (str.length < length) {
      str = `0${str}`
    }

    return str
  }

  ConvertCloneDate = (date: any): any => {
    const today = new Date(date)

    const yyyy = today.getFullYear().toString()
    const MM = this.pad(today.getMonth() + 1, 2)
    const dd = this.pad(today.getDate(), 2)
    const hh = this.pad(today.getHours(), 2)
    const mm = this.pad(today.getMinutes(), 2)
    //const ss = this.pad(today.getSeconds(), 2)
    //const kk = this.pad(today.getMilliseconds(), 2)

    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:00`
  }

  async getGameBet(options: LegacyHistoryOptions, token: string, page: number) {
    const detailInfo = []

    await Sleep(page * 3000)
    try {
      const infoURL = `https://cp_log.vedaapi.com/list?token=${token}&page=${page}`
      const { list } = (await axios.get(infoURL, {})).data as any

      if (list == null || list.length <= 0) {
        return []
      }

      for (const game of list) {
        if (game == null) {
          continue
        }

        const { participants, result, table } = game as {
          participants: any
          result: any
          gameType: string
          id: string
          table: any
        }
        for (const participant of participants) {
          const { playerId, vg_round_id } = participant as {
            playerId: string
            vg_round_id: string
            playerGameId: string
          }

          //const Code = playerGameId.split('-')

          const userId = playerId.substring(3 + 4).toLowerCase()

          if (userId.toLowerCase() === 'cuTo621' || userId.toLowerCase() === 'thanh9787') {
            console.log(userId)
          }
          //const code = sessionId.substring(0, 16)
          const ID = `cxevc-${table.id}-${vg_round_id}`

          if (this.memHistroy[`${ID}-${userId}`] != null) {
            continue
          }
          //ts-nocheckhistoryStatus: 'DO',

          const bet = await options.betRepo.findOne({
            where: {
              historyStatus: 'DO',
              vendor: VendorCode.CX_EVOLUTION,
              summaryId: ID,
              userId: userId,
            },
          })

          this.memHistroy[`${ID}-${userId}`] = true

          if (bet == null || bet.betStatus !== 'SETTLE') {
            continue
          }

          if (bet.packet.length === 0 || bet.packet[0] === null || bet.packet[0].data === null) {
            continue
          }

          bet.tableId = table.id
          bet.tableName = table.name

          bet.content = {
            result: {
              player: result?.player,
              banker: result?.banker,
              result: result,
            },
            participants: [participant],
          }

          detailInfo.push(bet)
        }
      }
    } catch (ex) {
      console.log(`error getGameBet page : ${page}`)
    }

    return detailInfo
  }

  async getGamesList(options: LegacyHistoryOptions, begin: Date) {
    const ex = []

    try {
      console.log(begin)

      // beDate.setHours(beDate.getHours() - 1)
      // const enDate = new Date()
      // enDate.setHours(enDate.getHours() + 1)

      const Minutes = 5
      begin.setMinutes(begin.getMinutes() - (50 + Minutes))
      const enDate = new Date()
      enDate.setMinutes(enDate.getMinutes() - Minutes)

      const startdate = this.ConvertCloneDate(begin)
      const enddate = this.ConvertCloneDate(enDate)

      // const url = makeUrl('/req', this.env, {
      //   thirdpartycode: 1,
      //   startdate: startdate,
      //   enddate: enddate,
      // })

      const url = `https://cp_log.vedaapi.com/req?opkey=${this.env.OP_KEY}&thirdpartycode=1&startdate=${startdate}&enddate=${enddate}`
      //const url = `https://casinolog-sa.vedaapi.com/req?opkey=${this.env.OP_KEY}&thirdpartycode=1&startdate=${startdate}&enddate=${enddate}`

      axios.defaults.timeout = 60000

      const res = await axios.get(url, {})

      console.log('swix log ' + JSON.stringify(res.data))

      const { pagecount, token } = res.data

      const promiseBets = []
      // let page = 1
      for (let page = 1; page < Number(pagecount) + 1; page++) {
        promiseBets.push(this.getGameBet(options, token, page))
      }

      const bets = await Promise.all(promiseBets)

      for (const bet of bets) {
        bet && ex.push(...bet)
      }

      return ex
    } catch (err) {
      console.log(errorToString(err))
    }

    return ex
  }

  async history(options: LegacyHistoryOptions): Promise<BetDataCasino[]> {
    try {
      //await Sleep(1000 * 30)

      const bets = []

      const ex = []
      for (const bet of bets) {
        bet && ex.push(...bet)
      }

      console.log(`evt history : ${ex?.length} `)
      return ex
    } catch (err) {
      console.log(errorToString(err))
    }
  }

  async historySlot(options: LegacyHistoryOptions): Promise<{ [master: string]: BetDataSlot[] }> {
    //const result = new APIResult()

    const detailInfo: { [id: string]: BetDataSlot[] } = {}

    try {
      const now = new Date()
      now.setMinutes(now.getMinutes() - 10)

      const where = {
        vendor: {
          $in: [
            VendorCode.CX_PP,
            VendorCode.CX_WAZDAN,
            VendorCode.CX_RELAX_GAMING,
            VendorCode.CX_GAMEART,
            VendorCode.CX_BLUEPRINT_GAMING,
            VendorCode.CX_THUNDER_KICK,
            VendorCode.CX_NOLIMIT_CITY,
            VendorCode.CX_MOBILOTS,
            VendorCode.CX_PLAY_PEARLS,
            VendorCode.CX_1X2_GAMING,
            VendorCode.CX_ELK_STUDIOS,
          ],
        },
        historyStatus: { $in: ['DO', 'WAIT'] },
        betTime: { $lt: now },
      }
      const bets = await options.betSlotRepo.find({ where: where, take: 5000 })

      for (const bet of bets as any) {
        bet.gameType = 'slot'
        bet.gameId = bet.packet[0]?.game_code

        if (bet.amountBet == null) {
          bet.amountBet = 0
        }
        if (bet.amountWin == null) {
          bet.amountWin = 0
        }

        if (detailInfo[bet.agentCode] == null) {
          detailInfo[bet.agentCode] = []
        }

        detailInfo[bet.agentCode].push(bet)
      }
    } catch (err) {
      console.log(errorToString(err))
    }

    return detailInfo
  }

  async getGameList(): Promise<Partial<GameInfo>[]> {
    const gameListRes = await this.gameList()

    if (gameListRes == null) {
      return []
    }

    const result: Partial<GameInfo>[] = []

    for (const [index, game] of gameListRes.entries()) {
      result.push({
        imgUrl: game.img_1,
        code: game.code,
        historyId: game.code,
        nameEn: game.name_eng,
        nameKo: game.name_kor,
        brand: this.nameEn,
        order: index,
      })
    }

    return result
  }

  async gameList(): Promise<GameListItem[]> {
    try {
      const url = makeUrl('/gamelist', this.env, {
        thirdpartycode: this.env.THIRDPARTY_CODE,
      })
      const res = await axios.get(url)

      if (res.data == null) {
        return null
      }

      return res?.data.data.list as GameListItem[]
    } catch (err) {
      console.log(errorToString(err))
    }

    return null
  }
}
