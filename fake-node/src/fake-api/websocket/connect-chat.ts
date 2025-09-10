import { WebSocket } from 'ws'
// import { ChatRequest } from './packet-types'
import { type SocketData } from './socket-data'
import { errorToString, errorToObj } from '../../common/util'
import { mongoDB } from '../app'
import { type ChatRequest, type ChatResponse } from '../../common/fake-packet-types'
import { changePacketHostname } from '../../common/fake-util'
// import { ChatRequest } from './packet-types'

export async function connectChat(
  socketData: SocketData,
  clientWs: WebSocket,
  evolutionWs: WebSocket,
  tableId: string,
) {
  const { user } = socketData
  let evolutionOpenResolve: (value?) => void
  const evolutionOpenPromise = new Promise((resolve) => {
    evolutionOpenResolve = resolve
  })

  const username = user.agentCode + user.userId

  evolutionWs.on('open', () => {
    console.log(`evolution chat socket open ${username} tableId ${tableId} uuid ${socketData.uuid}`)
    evolutionOpenResolve()
  })

  // 챗이거나 로비 소켓이면 분석하지 않고 그냥 바로 보낸다.
  evolutionWs.on('message', (data) => {
    const jsonObj: ChatResponse = JSON.parse(data.toString())
    if (jsonObj.type === 'chat.text' && jsonObj.args.source.type === 'system') {
      mongoDB.logFakeChat
        .save({
          _id: jsonObj.id,
          username,
          tableId,
          chat: jsonObj.args.text,
          type: 'receive',
          ip: socketData.ip,
          chatTime: new Date(),
        })
        .catch((err) => {
          console.log(JSON.stringify({ where: 'logFakeChat', ...errorToObj(err), username }))
        })
    }
    clientWs.send(data.toString())
  })

  socketData.requestListener = async (jsonStr) => {
    await evolutionOpenPromise
    if (evolutionWs.readyState === WebSocket.OPEN) {
      const jsonObj: ChatRequest = JSON.parse(jsonStr)

      changePacketHostname(jsonObj, socketData.evolutionUrl.hostname)

      if (jsonObj.type === 'chat.text') {
        mongoDB.logFakeChat
          .save({
            _id: jsonObj.id,
            username,
            tableId,
            chat: jsonObj.args.text,
            type: 'send',
            ip: socketData.ip,
            chatTime: new Date(),
          })
          .catch((err) => {
            console.log(JSON.stringify({ where: 'logFakeChat', ...errorToObj(err), username }))
          })
      }
      /*
      const jsonObj: ChatRequest = JSON.parse(jsonStr)

      if (jsonObj.type === 'chat.text') {
        clientWs.send(
          JSON.stringify({
            id: '00000185066491ad003108a7efc4a7c7',
            type: 'chat.text',
            args: {
              messageId: jsonObj.id,
              text: jsonObj.args.text,
              source: {
                type: 'player',
                id: 'qrdwizfr7jp6bjmh',
                name: user.userId,
                casino: null,
                tags: [],
                warned: false,
                privateChatAllowed: true,
              },
              destination: {
                type: 'players',
                casino: 'skylinemtgsea101',
                casinos: ['skylinemtgsea101'],
                table: tableId,
              },
              mode: 'common',
              time: new Date().getTime(),
            },
            time: new Date().getTime(),
          }),
        )
      } else {
        evolutionWs.send(jsonStr)
      } */
      evolutionWs.send(jsonStr)
    }
  }

  for (const request of socketData.initRequestQueue) {
    socketData.requestListener(request).catch((err) => {
      console.log(err)
    })
  }
  socketData.initRequestQueue = []

  evolutionWs.on('close', (code, reason) => {
    console.log(
      `evolution chat socket closed ${user.agentCode}${user.userId} tableId ${tableId} uuid ${socketData.uuid}`,
    )
    clientWs.close(1000, reason)
  })

  evolutionWs.on('error', (err) => {
    console.log(errorToString(err))
    clientWs.close(1000, 'evolution error')
  })

  clientWs.on('close', async (code, reason) => {
    console.log(`client chat socket closed ${user.agentCode}${user.userId} tableId ${tableId} uuid ${socketData.uuid}`)
    if (evolutionWs.readyState === WebSocket.OPEN) {
      evolutionWs.close(1000, reason)
    }
  })
  clientWs.on('error', (err) => {
    console.log(`client chat error ${errorToString(err)}`)
    if (evolutionWs.readyState === WebSocket.OPEN) {
      evolutionWs.close(1000, 'error')
    }
  })
}
