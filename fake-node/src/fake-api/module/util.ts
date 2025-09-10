import { S3Client } from '@aws-sdk/client-s3'

import { Guid } from 'guid-typescript'
import { mongoDB } from '../app'
import { config } from '../config'
import { FastifyRequest } from 'fastify'

/*
export function ApiPreHandler(request: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
  try {
    if (request.body != null) {
      const { data, encrypt } = request.body as { data: any; encrypt: boolean }
      if (encrypt) {
        const decryptedData = DecryptData(data)
        console.log(decryptedData)
        request.body = JSON.parse(decryptedData)
      } else {
        request.body = data
      }
    }
    done()
  } catch (err) {
    done(err)
  }
} */

export const GetGUID = (): string => {
  return Guid.create().toString() // ==> b77d409a-10cd-4a47-8e94-b0cd0ab50aa1
}

const blue_server = 'websocket2.blackmambalive.com'
const green_server = 'websocket-green.blackmambalive.com'

const websocketRedirectTable = {
  fhsvo_blue: blue_server,
  fhsvo_green: green_server,
  blue: blue_server,
  green: green_server,
}

export async function getWebsocketUrl(agentCode: string) {
  const dataStoreKey = config.FAKE_CONFIG_KEY

  if (dataStoreKey != null) {
    const redirectSetting = await mongoDB.agentRedirectSetting.findOne({ where: { agentCode, redirectFrom: 'reevo' } })

    let redirect = websocketRedirectTable[redirectSetting?.redirectTo]
    if (redirect != null) {
      return redirect
    }

    const fakeConfig = await mongoDB.dataStore.findOne({ where: { _id: dataStoreKey } })

    const fakeConfigData: {
      serverRedirect?: string
    } = fakeConfig?.data

    redirect = websocketRedirectTable[fakeConfigData?.serverRedirect]
    if (redirect != null) {
      return redirect
    }
  }

  // default 는 blue로 셋팅
  return blue_server
}

export function headerToObject(header: Headers) {
  const obj: Record<string, string | string[]> = {}
  for (const [key, value] of header) {
    if (obj[key] == null) {
      obj[key] = value
    } else if (typeof obj[key] === 'string') {
      obj[key] = [obj[key] as string, value]
    } else {
      ;(obj[key] as string[]).push(value)
    }
  }
  return obj
}

export function getSelfUrl(req: FastifyRequest) {
  return (req.headers['x-forwarded-proto'] ?? req.protocol) + '://' + req.headers['host']
}

export async function getEvolutionUrl(sessionId: string) {
  const loginData = await mongoDB.fakeLoginData.findOne({ where: { sessionId } })
  return loginData?.evolutionUrl
}
