import { chromium } from 'playwright'

async function bootstrap() {
  const browser = await chromium.launch({ headless: false }) // Or 'firefox' or 'webkit'.

  browser.contexts()
  const page = await browser.newPage()
  // other actions...

  const ctx = page.context()

  await ctx.addCookies([{ url: 'https://example.com', name: 'foo', value: 'bar' }])

  console.log('cookies', await ctx.cookies())

  await page.goto('https://example.com')

  await browser.close()
}
bootstrap().catch((err) => {
  console.log(err)
})
