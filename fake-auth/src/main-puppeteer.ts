//import 'reflect-metadata'
//import 'source-map-support/register'
// import 'module-alias/register'
import puppeteer from 'puppeteer'

async function bootstrapPuppeteer() {
  const browser = await puppeteer.launch({
    headless: false,
    //args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()

  // Navigate the page to a URL.
  await page.goto('https://developer.chrome.com/')

  // Set screen size.
  await page.setViewport({ width: 1080, height: 1024 })

  // Type into search box.
  await page.locator('.devsite-search-field').fill('automate beyond recorder')

  // Wait and click on first result.
  await page.locator('.devsite-result-item-link').click()

  const cookies = await page.cookies()

  console.log('cookies', cookies)

  //await page.setCookie([])

  // Locate the full title with a unique string.
  const textSelector = await page.locator('text/Customize and automate').waitHandle()
  const fullTitle = await textSelector?.evaluate((el) => el.textContent)

  // Print the full title.
  console.log('The title of this blog post is "%s".', fullTitle)
}
bootstrapPuppeteer().catch((err) => {
  console.log(err)
})
