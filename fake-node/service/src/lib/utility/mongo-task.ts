// // import { Queue } from 'queue-typescript';

import { addSeconds } from 'date-fns'
import { Column, Entity, Index, MongoRepository, ObjectIdColumn } from 'typeorm'

// import { async } from 'rxjs/internal/scheduler/async'

// // import { AnyARecord } from 'dns'

@Index('username_jobId_createdAt', ['username', 'jobId', 'createdAt'], { unique: false })
@Entity('task')
export class TaskEntity {
  @ObjectIdColumn()
  _id: string

  @Index()
  @Column()
  jobId: string

  @Index()
  @Column()
  username: string

  @Index()
  @Column()
  createdAt: Date
}

export interface TaskParams<T> {
  taskRepo: MongoRepository<TaskEntity>
  username: string
  jobId: string
  job: () => Promise<T>
  secondsPerTask?: number
}

export async function useTask<T>({
  taskRepo,
  username,
  jobId,
  job,
  // 기본 값으로 1초마다 작업 호출 가능
  secondsPerTask = 1,
}: TaskParams<T>): Promise<{ res?: T; exist?: boolean }> {
  // if (this.waitJobs[id] != null) {
  //   return null
  // }

  let res: T
  //let objectId: ObjectId
  let catchedErr: any

  try {
    // 미리 시간이 지난 작업들을 삭제 해야 upserted가 제대로 됨

    const secondsAgo = addSeconds(new Date(), -secondsPerTask)

    await taskRepo.deleteMany({ username, jobId, createdAt: { $lte: secondsAgo } })

    const taskObj = await taskRepo.findOneAndUpdate(
      { username, jobId, createdAt: { $gt: addSeconds(new Date(), -secondsPerTask) } },
      { $setOnInsert: { username, jobId, createdAt: new Date() } },
      { upsert: true },
    )
    console.log('useTask', username, jobId, JSON.stringify(taskObj))

    if (taskObj != null) {
      return { exist: true }
    }

    res = await job()
  } catch (err) {
    catchedErr = err
  } finally {
  }

  if (catchedErr != null) {
    throw catchedErr
  }

  return { res, exist: false }
}
