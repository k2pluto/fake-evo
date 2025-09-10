import { Entity, ObjectIdColumn, Column, ObjectId, Index, MongoRepository } from 'typeorm'

export enum LogErrorType {
  api_transfer_in = 'api_transfer_in',
  api_transfer_out = 'api_transfer_out',
}

@Entity('log_error')
export class LogError {
  @ObjectIdColumn()
  _id: ObjectId

  @Column()
  @Index()
  type: LogErrorType

  @Column()
  agentId: string

  @Column()
  agentCode: string

  @Column()
  userId: string

  @Column()
  @Index()
  error: {
    message: string
    stack: string
    obj: unknown
  }

  @Column()
  timestamp: Date
}

interface SaveLogErrorParams {
  logError: MongoRepository<LogError>
  agentId: string
  agentCode: string
  userId: string
  type: LogErrorType
  err: Error | any
}
export async function saveLogError({ logError, agentId, agentCode, userId, type, err }: SaveLogErrorParams) {
  // JSON.stringify 에서 에러가 나도 .catch 문에서 잡을 수 있게 async로 함수를 만듬
  const jsonStr = JSON.stringify(err)
  return logError.save({
    type,
    agentId: agentId,
    agentCode: agentCode,
    userId: userId,
    err: {
      message: err.toString(),
      stack: err?.stack,
      obj: jsonStr.length > 10000 ? `too big JSON string length ${jsonStr.length}` : JSON.parse(jsonStr),
    },
    timestamp: new Date(),
  })
}
