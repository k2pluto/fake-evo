//import 'reflect-metadata'
//import 'source-map-support/register'
// import 'module-alias/register'

import { config } from './config'
import { errorToString } from '../common/util'
import { initApp } from './app'
const formatMemoryUsage = (data) => `rss ${Math.round((data / 1024 / 1024) * 100) / 100} MB`

async function bootstrap() {
  try {
    console.log(formatMemoryUsage(process.memoryUsage().rss))

    const app = await initApp(false)
    // fastify는 host 까지 넣어줘야 ecs 에서 잘 돌아간다.
    // await app.listen({ port: config.PORT, host: '0.0.0.0' })
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    console.log(`listen port ${config.PORT}`)

    setInterval(() => {
      console.log(formatMemoryUsage(process.memoryUsage().rss))
    }, 30000)
  } catch (err) {
    console.log(errorToString(err))
  }
}
bootstrap().catch((err) => {
  console.log(err)
})

process.on('uncaughtException', (err) => {
  //console.log('예기치 못한 에러', err)
  console.log('uncaughtException', errorToString(err))
})
