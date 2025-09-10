import { createApp } from './app'
const formatMemoryUsage = (data) => `rss ${Math.round((data / 1024 / 1024) * 100) / 100} MB`

async function bootstrap() {
  try {
    console.log(formatMemoryUsage(process.memoryUsage().rss))

    await createApp()

    setInterval(() => {
      console.log(formatMemoryUsage(process.memoryUsage().rss))
    }, 30000)
  } catch (err) {
    console.log(err)
  }
}
bootstrap().catch((err) => {
  console.log(err)
})
