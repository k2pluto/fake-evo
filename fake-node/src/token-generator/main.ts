import 'source-map-support/register'
import 'module-alias/register'
import { initApp } from './app'
const formatMemoryUsage = (data) => `rss ${Math.round((data / 1024 / 1024) * 100) / 100} MB`

async function bootstrap() {
  try {
    console.log(formatMemoryUsage(process.memoryUsage().rss))

    const app = await initApp()
    // fastify는 host 까지 넣어줘야 ecs 에서 잘 돌아간다.
    await app.listen({ port: 10000, host: '0.0.0.0' })
    console.log('listen port 10000')

    setInterval(() => {
      console.log(formatMemoryUsage(process.memoryUsage().rss))
    }, 30000)
  } catch (err) {
    console.log(err)
  }
}
bootstrap()
