import { v4 } from 'uuid'
import axios from 'axios'
import { JTDDataType, SomeJTDSchemaType } from 'ajv/dist/jtd'

import { APIResult, JoinResult, Vendor, JoinOptions, LegacyHistoryOptions, GamesOptions, APIEnv } from '..'
import { BetDataCasino } from '../../lib/interface/mongo/data-bet-data-casino'
import { VendorCode } from '../../lib/common/types/vendor-code'
import { BrandName } from '../../lib/common/types/brand-name'
import { GameInfo } from '../../lib/interface/mongo/data-game-info'
import { BetDataSlot } from '../../lib/interface/mongo/data-bet-data-slot'

import { User } from '../../lib/interface/sql/user'

import { EvolutionHistoryItem, LobbyResponse } from './interface'
import { Sleep } from '../../lib/utility/helper'
import { addMinutes } from 'date-fns'
import { IncomingMessage } from 'http'
import { makeErrorObj } from '../util'
import { errorToString } from '../../lib/utility/util'
import { getUserInfo } from '../../lib/common/game/auth-manager'
import { BetData } from '../../lib/interface/mongo/data-bet-data'
import { evolutionTableInfos } from '../../lib/common/data/evolution-tables'

export interface EvolutionEnv extends APIEnv {
  CASINO_ID: string

  API_URL: string

  UA2_TOKEN: string

  GAME_HISTORY_API_TOKEN: string

  EXTERNAL_LOBBY_API_TOKEN: string

  // Seamless에서 들어온 패킷 확인하는 용도
  AUTH_TOKEN: string

  SKIN?: string
}

export const EvolutionConfigSchema = {
  optionalProperties: {
    skin: { type: 'string', enum: ['1', '2', 'F'] },
  },
} satisfies SomeJTDSchemaType

type EvolutionParam = JTDDataType<typeof EvolutionConfigSchema>

export class ThirdPartyEvolution extends Vendor<EvolutionEnv> {
  async create(user: User, userId: string): Promise<APIResult<any>> {
    const result = new APIResult()
    result.success = true
    return result
  }

  async join({ agentCode, userId, userRepo, nick, code, vendorSetting }: JoinOptions): Promise<JoinResult<any>> {
    const result = new JoinResult()

    try {
      const sessionId = v4()

      await userRepo.update({ agentCode, userId: userId }, { gameToken: sessionId })

      const validNick = nick != null && nick.length > 2

      const config = vendorSetting?.config as EvolutionParam

      result.url = `${this.env.API_URL}/ua/v1/${this.env.CASINO_ID}/${this.env.UA2_TOKEN}`
      result.body = {
        uuid: v4(),
        player: {
          id: agentCode + userId,
          update: true,
          //firstName: 'firstName',
          //lastName: 'lastName',
          nickname: validNick ? nick : userId,
          country: 'KR',
          language: 'ko',
          currency: 'KRW',
          session: {
            id: sessionId,
            ip: '192.168.0.1',
          },
          group: {
            //id: '234sdkjhdjkhvsdfs',
            action: 'clear',
          },
        },
        config: {
          brand: {
            id: agentCode,
            //skin: config?.skin ?? '1',
            skin: this.env.SKIN ?? '1',
          },
          game: {
            //category: 'top_games',
            //category: code ?? 'top_games',
            category: this.gameType === 'casino' ? 'top_games' : 'slots',
            interface: 'view1',

            ...(this.gameType === 'slot' && {
              table: {
                id: code,
              },
            }),
            /*table: {
              id: 'vip-roulette-123',
            },*/
          },
          channel: {
            wrapped: false,
            mobile: false,
          },
          urls: {
            cashier: 'http://www.chs.ee',
            responsibleGaming: 'http://www.RGam.ee',
            lobby: 'http://www.lobb.ee',
            //sessionTimeout: 'https://cdn.os-game.com/html/sessionTimeout.html',
          },
          freeGames: false,
        },
      }

      const res = await axios.post(result.url, result.body, {})
      const packet: { entry: string; entryEmbedded: string; gameURL: string } = res.data
      result.result = packet

      result.gameUrl = this.env.API_URL + packet.entry
      result.success = true
    } catch (err) {
      //console.log(JSON.stringify(err))
      console.log(errorToString(err))
      const responseError = err.response?.data?.errors?.[0]
      if (responseError != null) {
        result.error = {
          type: 'vendor',
          code: responseError.code,
          message: responseError.message,
        }
      } else {
        result.error = makeErrorObj(err)
      }
    }

    return result
  }

  async getHistory(bet: BetDataCasino): Promise<EvolutionHistoryItem> {
    if (bet.packet.length === 0 || bet.packet[0] === null || bet.packet[0].data === null) {
      return null
    }

    //await Sleep(index)

    const userId: string = bet.packet[0].userId
    const historyId: string = bet.packet[0].game.id
    try {
      const { CASINO_ID, GAME_HISTORY_API_TOKEN, API_URL } = this.env

      const token = `${CASINO_ID}:${GAME_HISTORY_API_TOKEN}`
      const encodedToken = Buffer.from(token).toString('base64')

      const url = `${API_URL}/api/gamehistory/v1/players/${userId}/games/${historyId}`

      console.log(`evolution getHistory ${bet.betTime.toString()} ${url}`)

      //const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
      const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

      if (res.data == null) {
        return
      }

      const info = res.data.data as EvolutionHistoryItem

      return info

      /*bet.tableId = info.table.id
      bet.tableName = info.table.name

      bet.content = {
        result: {
          player: info?.result?.player,
          banker: info?.result?.banker,
          result: info?.result,
        },
        participants: info.participants,
      }*/
    } catch (err) {
      console.log(`error evo getHistory`)
      console.log(errorToString(err))

      return null
    }
  }
  async getCasinoHistory(index: number): Promise<BetDataCasino> {
    //await Sleep(Number(index % 50) * 1000)
    //await Sleep(index)

    try {
      const { CASINO_ID, GAME_HISTORY_API_TOKEN, API_URL } = this.env

      const token = `${CASINO_ID}:${GAME_HISTORY_API_TOKEN}`
      const encodedToken = Buffer.from(token).toString('base64')

      const minuteAgo = addMinutes(new Date(), -1)

      const url = `${API_URL}/api/gamehistory/v1/casino/games?startDate=${minuteAgo.toISOString()}`
      //const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
      const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

      if (res.data == null) {
        return
      }

      return res.data
    } catch (err) {
      console.log(`error evo getCasinoHistory`)
      console.log(JSON.stringify(err))

      return null
    }

    return null
  }

  // EvolutionRedTiger = 'evrt',
  // EvolutionNetEnt = 'evne',

  async historySlot(options: LegacyHistoryOptions): Promise<{ [master: string]: BetDataSlot[] }> {
    //const result = new APIResult()

    const detailInfo: { [id: string]: BetDataSlot[] } = {}

    try {
      const now = new Date()
      now.setMinutes(now.getMinutes() - 5)

      const where = {
        vendor: {
          $in: [
            VendorCode.EvolutionRedTiger,
            VendorCode.EvolutionNetEnt,
            VendorCode.EvolutionBigTimeGaming,
            VendorCode.EvolutionNoLimitCity,
          ],
        },
        historyStatus: { $in: ['DO', 'WAIT'] },
        betTime: { $lt: now },
      }
      const bets = await options.betSlotRepo.find({ where: where, take: 5000 })

      for (const bet of bets as any) {
        bet.gameType = 'slot'
        bet.gameId = bet.packet[0]?.game?.details?.table?.id

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
      console.log(`error evo historySlot`)
      console.log(JSON.stringify(err))
    }

    return detailInfo
  }

  async streamingApi(): Promise<unknown[]> {
    try {
      const { CASINO_ID, GAME_HISTORY_API_TOKEN, API_URL } = this.env

      const url = `${API_URL}/api/gamehistory/v1/casino/games/stream`

      const token = `${CASINO_ID}:${GAME_HISTORY_API_TOKEN}`
      const encodedToken = Buffer.from(token).toString('base64')
      //const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
      axios.defaults.timeout = 60000

      let message: IncomingMessage
      while (true) {
        try {
          const res = await axios.get(url, {
            headers: { Authorization: 'Basic ' + encodedToken },
            responseType: 'stream',
          })

          message = res.data
          //message.pipe(process.stdout)
          message.on('data', (chunk) => {
            console.log(chunk.toString())
          })

          break
        } catch (err) {
          console.log(`error evo streamingApi`)
          console.log(JSON.stringify(err))
        }
        await Sleep(1000)
      }

      while (true) {
        await Sleep(1000)
      }
    } catch (err) {
      console.log(`error evo streamingApi`)
      console.log(JSON.stringify(err))
    }

    return []
  }

  async history(options: LegacyHistoryOptions): Promise<BetDataCasino[]> {
    try {
      //await Sleep(1000 * 30)

      const promise = []

      const begin = new Date()
      begin.setMinutes(begin.getMinutes() - 5)
      promise.push(this.getGamesStream(options))

      const minute5Before = addMinutes(begin, -5)
      promise.push(this.getGameHistory(options, minute5Before))

      const minute60Before = addMinutes(begin, -60)
      promise.push(this.getGameHistory(options, minute60Before))

      promise.push(this.getOverTimeGames(options))

      const bets = await Promise.all(promise)

      //const bets = [await this.getOverTimeGames(options)]

      const ex = []
      for (const bet of bets) {
        bet && ex.push(...bet)
      }

      console.log(`evt history : ${ex?.length} `)
      return ex
    } catch (err) {
      console.log(errorToString(err))
    }

    return []
  }

  async getGamesStream(options: LegacyHistoryOptions) {
    try {
      const bets = await options.betRepo.find({
        where: {
          historyStatus: 'DO',
          vendor: VendorCode.EvolutionCasino,
          isStream: true,
        },
        take: 2000,
      })

      return bets
    } catch (err) {
      console.log(errorToString(err))
      return null
    }
  }

  async getGameHistory(options: LegacyHistoryOptions, begin: Date) {
    const detailInfo: BetDataCasino[] = []

    try {
      console.log(begin)
      const { CASINO_ID, GAME_HISTORY_API_TOKEN, API_URL } = this.env

      const url = `${API_URL}/api/gamehistory/v1/casino/games?startDate=${begin.toISOString()}&gameProvider=evolution`

      const token = `${CASINO_ID}:${GAME_HISTORY_API_TOKEN}`
      const encodedToken = Buffer.from(token).toString('base64')
      //const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
      axios.defaults.timeout = 60000

      const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

      const { data } = res.data

      console.log(`evolution log ${options.vendorCode} ${url} data length ${data.length}`)

      if (data.length > 0) {
        for (const infoBet of data[0].games ?? ([] as any)) {
          const { table, result, participants, id } = infoBet

          for (const participant of participants) {
            const { playerId } = participant

            const { agentCode, userId } = getUserInfo(playerId)
            const ID = `${options.vendorCode}-${table.id}-${id}`

            if (this.memHistroy[`${ID}-${userId}`] != null) {
              continue
            }

            //ts-nocheckhistoryStatus: 'DO',

            const bet = await options.betRepo.findOne({
              where: {
                historyStatus: 'DO',
                vendor: options.vendorCode,
                summaryId: ID,
                agentCode,
                userId,
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
      }
    } catch (err) {
      console.log(errorToString(err))
      return null
    }

    return detailInfo
  }

  async getGameStreamList(options: LegacyHistoryOptions) {
    const detailInfo: BetDataCasino[] = []

    try {
      const { CASINO_ID, GAME_HISTORY_API_TOKEN, API_URL } = this.env
      const begin = new Date()
      begin.setHours(begin.getHours() - 2)

      const end = new Date()
      end.setHours(end.getHours() + 1)

      const url = `${API_URL}/api/gamehistory/v1/casino/games?owTransactionId=${`662020909070619015,662020574192394383`}&startDate=${begin.toISOString()}&gameProvider=evolution`

      const token = `${CASINO_ID}:${GAME_HISTORY_API_TOKEN}`
      const encodedToken = Buffer.from(token).toString('base64')
      //const url = `${HISTORY_URL}/api/generic/handHistory/${transactionId}/${historyId}`
      axios.defaults.timeout = 60000

      const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

      const files = res.data.split('\n')
      for (const infoBet of files ?? ([] as any)) {
        try {
          const { table, result, participants, gameType, id } = JSON.parse(infoBet)
          const { playerId } = participants[0]

          const userId = playerId.substring(3)
          //const code = sessionId.substring(0, 16)
          const ID = `evc-${gameType}-${id}`.toLocaleLowerCase()

          if (this.memHistroy[`${ID}-${userId}`] != null) {
            continue
          }

          //ts-nocheckhistoryStatus: 'DO',

          const bet = await options.betRepo.findOne({
            where: {
              historyStatus: 'DO',
              vendor: VendorCode.EvolutionCasino,
              summaryId: ID,
              userId: userId,
            },
          })

          this.memHistroy[`${ID}-${userId}`] = true

          if (bet == null || bet.betStatus !== 'SETTLE') {
            continue
          }

          if (bet.packet.length === 0 || bet.packet[0] === null || bet.packet[0].data === null) {
            return null
          }

          bet.tableId = table.id
          bet.tableName = table.name

          bet.content = {
            result: {
              player: result?.player,
              banker: result?.banker,
              result: result,
            },
            participants: participants,
          }

          detailInfo.push(bet)
        } catch (err) {
          console.log(JSON.stringify(err))
        }
      }
    } catch (err) {
      console.log(errorToString(err))
      return null
    }

    return detailInfo
  }

  async getOverTimeGames(options: LegacyHistoryOptions) {
    const now = new Date()
    const hourAgo = addMinutes(now, -60)
    const bets = await options.betRepo.find({
      where: {
        historyStatus: 'DO',
        vendor: options.vendorCode,
        betTime: { $lt: hourAgo } as any,
      },
      order: { betTime: -1 },
      skip: 0,
      take: 10,
    })

    const hour3Ago = addMinutes(now, -180)

    const details: BetData[] = []
    //for (let ii = 0; ii < bets.length; ii++) {
    for (const bet of bets) {
      const info = await this.getHistory(bet)

      if (info != null) {
        bet.tableId = info.table.id
        bet.tableName = info.table.name

        bet.content = {
          result: {
            player: info?.result?.player,
            banker: info?.result?.banker,
            result: info?.result,
          },
          participants: info.participants,
        }
        details.push(bet)
      } else if (bet.betTime.getTime() < hour3Ago.getTime()) {
        const tableInfo = await evolutionTableInfos[bet.tableId]

        if (bet.tableName == null) {
          bet.tableName = tableInfo.name
        }

        if (bet.content == null) {
          bet.content = 'empty'
        }
        details.push(bet)
      }

      await Sleep(2000)
    }

    return details
  }

  async getGames(gameProvider: string) {
    const token = `${this.env.CASINO_ID}:${this.env.EXTERNAL_LOBBY_API_TOKEN}`
    const encodedToken = Buffer.from(token).toString('base64')
    const url = `${this.env.API_URL}/api/lobby/v1/${this.env.CASINO_ID}/state?gameProvider=${gameProvider}`

    const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

    console.log(res.data)
    if (res.data == null) {
      return
    }

    return res.data
  }

  async updateGamesLegacy(option: GamesOptions, gameProvider: string, vendor: VendorCode, brand: BrandName) {
    const token = `${this.env.CASINO_ID}:${this.env.EXTERNAL_LOBBY_API_TOKEN}`
    const encodedToken = Buffer.from(token).toString('base64')
    const url = `${this.env.API_URL}/api/lobby/v1/${this.env.CASINO_ID}/state?gameProvider=${gameProvider}`

    const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

    console.log(res.data)
    if (res.data == null) {
      return
    }

    const { tables } = res.data as LobbyResponse
    const games = Object.values(tables)
    for (const [index, info] of games.entries()) {
      const _id = `${gameProvider}-${info.tableId}`
      console.log(`Update ${_id} : ${index + 1} / ${games.length}`)
      await option.gameRepo.updateOne(
        {
          _id: _id,
        },
        {
          $setOnInsert: {
            used: 'y',
          },
          $set: {
            imgUrl: info?.videoSnapshot?.thumbnails?.M,
            code: info.tableId,
            historyId: info.tableId,
            nameEn: info.name,
            nameKo: info.name,
            vendor,
            brand,
            order: index,
          } as GameInfo,
        },
        {
          upsert: true,
        },
      )
    }
  }

  // async getInfo(bet: BetDataCasino, option: HistoryOptions): Promise<any> {
  //   const respone = await this.getHistory(bet)
  //   return null
  // }

  async getGameList(): Promise<Partial<GameInfo>[]> {
    const slotProviderTables = {
      [BrandName.Evolution]: 'evolution',
      [BrandName.RedTiger]: 'redtiger',
      [BrandName.NetEnt]: 'netent',
      [BrandName.BigTimeGaming]: 'btg',
      [BrandName.NoLimitCity]: 'nlc',
    }

    const gameProvider = slotProviderTables[this.nameEn]

    const gameListRes = await this.lobbyState(gameProvider)

    //const temp = await this.classificationGames(gameProvider)

    if (gameListRes == null) {
      return []
    }

    const games = Object.values(gameListRes.tables)

    const result: Partial<GameInfo>[] = []

    for (const [index, info] of games.entries()) {
      result.push({
        imgUrl: info?.videoSnapshot?.thumbnails?.M,
        code: info.tableId,
        historyId: info.tableId,
        nameEn: info.name,
        nameKo: info.name,
        brand: this.nameEn,
        order: index,
      })
    }

    return result
  }

  async classificationGames(gameProvider: string): Promise<LobbyResponse> {
    try {
      const token = `${this.env.CASINO_ID}:${this.env.GAME_HISTORY_API_TOKEN}`
      const encodedToken = Buffer.from(token).toString('base64')
      const url = `${this.env.API_URL}/api/classification/v1/games?gameProvider=${gameProvider}`

      const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

      if (res.data == null) {
        return
      }

      return res.data as LobbyResponse
      //await this.updateGamesLegacy(option, 'redtiger', VendorCode.EvolutionRedTiger, BrandName.RedTiger)
      //await this.updateGamesLegacy(option, 'netent', VendorCode.EvolutionNetEnt, BrandName.NetEnt)
      //await this.updateGamesLegacy(option, 'btg', VendorCode.EvolutionBigTimeGaming, BrandName.BigTimeGaming)
      //await this.updateGamesLegacy(option, 'nlc', VendorCode.EvolutionNoLimitCity, BrandName.NoLimitCity)
    } catch (err) {
      console.log(errorToString(err))
    }

    return null
  }

  async lobbyState(gameProvider: string): Promise<LobbyResponse> {
    try {
      const token = `${this.env.CASINO_ID}:${this.env.EXTERNAL_LOBBY_API_TOKEN}`
      const encodedToken = Buffer.from(token).toString('base64')
      const url = `${this.env.API_URL}/api/lobby/v1/${this.env.CASINO_ID}/state?gameProvider=${gameProvider}`

      const res = await axios.get(url, { headers: { Authorization: 'Basic ' + encodedToken } })

      if (res.data == null) {
        return
      }

      return res.data as LobbyResponse
      //await this.updateGamesLegacy(option, 'redtiger', VendorCode.EvolutionRedTiger, BrandName.RedTiger)
      //await this.updateGamesLegacy(option, 'netent', VendorCode.EvolutionNetEnt, BrandName.NetEnt)
      //await this.updateGamesLegacy(option, 'btg', VendorCode.EvolutionBigTimeGaming, BrandName.BigTimeGaming)
      //await this.updateGamesLegacy(option, 'nlc', VendorCode.EvolutionNoLimitCity, BrandName.NoLimitCity)
    } catch (err) {
      console.log(errorToString(err))
    }

    return null
  }
}
