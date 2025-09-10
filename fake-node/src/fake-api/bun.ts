import { initApp } from './app'
import { config } from './config'
import { errorToString } from '../common/util'

//Bun.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1'

const formatMemoryUsage = (data) => `rss ${Math.round((data / 1024 / 1024) * 100) / 100} MB`

async function bootstrap() {
  try {
    console.log(formatMemoryUsage(process.memoryUsage().rss))

    const app = await initApp(false)
    // fastify는 host 까지 넣어줘야 ecs 에서 잘 돌아간다.
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
