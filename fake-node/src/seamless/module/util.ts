import { Guid } from 'guid-typescript'
import { type FastifyReply, type FastifyRequest } from 'fastify'
import { DecryptData } from '../../common/util'

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
}

export const GetGUID = (): string => {
  return Guid.create().toString() // ==> b77d409a-10cd-4a47-8e94-b0cd0ab50aa1
}

export function decimalFloor(value: number, place: number) {
  return Number(`${Math.floor(`${value}e${place}` as any)}e-${place}`)
}
