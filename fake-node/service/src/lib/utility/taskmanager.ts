export class BaseTask {
  createdAt: Date = new Date()

  params: any

  job: (any) => any

  promise: Promise<any>

  resolve: (result: any) => any

  reject: (result: any) => void
}

class TaskContainer<T> extends BaseTask {
  promise: Promise<T>
}

class TaskQueue {
  containers: BaseTask[] = []

  addTask<T>(doFun: (params: any) => Promise<T>, params: any = {}): TaskContainer<T> {
    // if (this.waitJobs[id] != null) {
    //   return null
    // }

    const newJob = new BaseTask()

    newJob.params = params
    newJob.job = doFun

    newJob.promise = new Promise<any>((resolve, reject) => {
      newJob.resolve = resolve
      newJob.reject = reject
    })

    this.containers.push(newJob)

    return newJob
  }

  async processJobs() {
    const copyContainers = [...this.containers]
    for (const i of copyContainers) {
      try {
        const jobRes = await i.job(i.params)
        i.resolve(jobRes)
      } catch (err) {
        i.reject(err)
      }
    }
    this.containers = this.containers.slice(copyContainers.length)
  }
}

export class TaskManager {
  // 유저별 잡 큐
  queues: { [userId: string]: TaskQueue } = {}

  addTask<T>(id: string, job: (params: any) => Promise<T>, params: any = {}): TaskContainer<T> {
    // if (this.waitJobs[id] != null) {
    //   return null
    // }

    // 유저 별로 queue를 만든다.
    let queue = this.queues[id]
    if (queue == null) {
      queue = this.queues[id] = new TaskQueue()

      setImmediate(async () => {
        while (queue.containers.length > 0) {
          await queue.processJobs()
        }
        // 더 이상 작업이 없으므로 큐를 삭제한다.
        delete this.queues[id]
      })
    }

    return queue.addTask(job, params)
  }
}
