import axios from 'axios'
import * as path from 'path'
import * as fsx from 'fs-extra'

const evolution_version = 'r2'
const evolution_path = `frontend/evo/${evolution_version}`
const cdn = 'https://static.egcdn.com'
const project_dir = './'

const mp3Reg = new RegExp(`"[\/a-zA-Z0-9-_.]+.mp3"`, 'g')
const oggReg = new RegExp(`"[\/a-zA-Z0-9-_.]+.ogg"`, 'g')
const svgReg = new RegExp(`"[\/a-zA-Z0-9-_.]+.svg"`, 'g')
const pngReg = new RegExp(`"[\/a-zA-Z0-9-_.]+.png"`, 'g')
const jpgReg = new RegExp(`"[\/a-zA-Z0-9-_.]+.jpg"`, 'g')
const cssSvgReg = new RegExp(`[(][\/a-zA-Z0-9-_.]+[.]svg[)]`, 'g')
const woffReg = new RegExp(`[(][\/a-zA-Z0-9-_.]+[.]woff[)]`, 'g')
const woff2Reg = new RegExp(`[(][\/a-zA-Z0-9-_.]+[.]woff2[)]`, 'g')

export async function crawlIndex() {
  console.log('crawlIndex')

  const data = fsx.readFileSync(`${evolution_path}/index.html`).toString()

  const svgMatches = data.match(svgReg)
  const pngMatches = data.match(pngReg)
  const jpgMatches = data.match(jpgReg)

  await saveJsResources('index.html', svgMatches ?? [])
  await saveJsResources('index.html', pngMatches ?? [])
  await saveJsResources('index.html', jpgMatches ?? [])

  const jsReg = new RegExp(`\/frontend\/evo\/${evolution_version}\/js[\/a-zA-Z0-9-_.]*`, 'g')

  const jsMatches = data.match(jsReg)

  const cssReg = new RegExp(`\/frontend\/evo\/${evolution_version}\/styles[\/a-zA-Z0-9-_.]*`, 'g')

  const cssMatches = data.match(cssReg)

  for (const jsUrl of jsMatches) {
    const jsRes = await axios.get(cdn + jsUrl)

    const jsFile = jsRes.data

    const dir = path.dirname(jsUrl)

    fsx.ensureDirSync(project_dir + dir)

    fsx.writeFileSync(project_dir + jsUrl, jsFile)

    console.log('saved ' + jsUrl)
  }

  for (const cssUrl of cssMatches) {
    try {
      const cssRes = await axios.get(cdn + cssUrl)

      const cssFile = cssRes.data

      const dir = path.dirname(cssUrl)

      fsx.ensureDirSync(project_dir + dir)

      fsx.writeFileSync(project_dir + cssUrl, cssFile)

      console.log('saved ' + cssUrl)
    } catch (err) {
      console.log('can not saved ' + cssUrl)
    }
  }
}

async function saveJsResources(jsCss: string, filenames: string[]) {
  for (const rawFilename of filenames) {
    const filename = rawFilename.slice(1, rawFilename.length - 1)

    try {
      if (fsx.existsSync(project_dir + evolution_path + '/' + filename)) {
        continue
      }

      const resourceRes = await axios.get(cdn + '/' + evolution_path + '/' + filename, {
        responseType: 'arraybuffer',
      })

      const dir = path.dirname(filename)

      fsx.ensureDirSync(project_dir + evolution_path + '/' + dir)

      fsx.writeFileSync(project_dir + evolution_path + '/' + filename, resourceRes.data)
      console.log('save resource : ' + filename)
    } catch (err) {
      console.log(`can not saved js ${jsCss} resource : ` + filename)
    }
  }
}

async function saveCssResources(jsCss: string, filenames: string[]) {
  for (const rawFilename of filenames) {
    const filename = rawFilename.slice(1, rawFilename.length - 1).replace('/' + evolution_path + '/', '')

    try {
      if (fsx.existsSync(project_dir + evolution_path + '/' + filename)) {
        continue
      }

      const resourceRes = await axios.get(cdn + '/' + evolution_path + '/' + filename, {
        responseType: 'arraybuffer',
      })

      const dir = path.dirname(filename)

      fsx.ensureDirSync(project_dir + evolution_path + '/' + dir)

      fsx.writeFileSync(project_dir + evolution_path + '/' + filename, resourceRes.data)
      console.log('save resource : ' + filename)
    } catch (err) {
      console.log(`can not saved css ${jsCss} resource : ` + filename)
    }
  }
}

export async function crawlJsResource() {
  console.log('crawlJsResource')

  const files = fsx.readdirSync(`${evolution_path}/js`)

  for (const jsFile of files) {
    console.log(`crawl jsFile ${jsFile}`)

    const data = fsx.readFileSync(`${evolution_path}/js/` + jsFile).toString()

    const mp3Matches = data.match(mp3Reg)
    const oggMatches = data.match(oggReg)
    const svgMatches = data.match(svgReg)
    const pngMatches = data.match(pngReg)
    const jpgMatches = data.match(jpgReg)

    await saveJsResources(jsFile, mp3Matches ?? [])
    await saveJsResources(jsFile, oggMatches ?? [])
    await saveJsResources(jsFile, svgMatches ?? [])
    await saveJsResources(jsFile, pngMatches ?? [])
    await saveJsResources(jsFile, jpgMatches ?? [])
  }
}
export async function crawlCssResource() {
  console.log('crawlJsResource')

  const files = fsx.readdirSync(`${evolution_path}/styles`)

  for (const cssFile of files) {
    console.log(`crawl cssFile ${cssFile}`)

    const data = fsx.readFileSync(`${evolution_path}/styles/` + cssFile).toString()

    const woffMatches = data.match(woffReg)
    const woff2Matches = data.match(woff2Reg)
    const svgMatches = data.match(cssSvgReg)

    await saveCssResources(cssFile, woffMatches ?? [])
    await saveCssResources(cssFile, woff2Matches ?? [])
    await saveCssResources(cssFile, svgMatches ?? [])
  }
}

export async function main() {
  await crawlIndex()
  await crawlJsResource()
  //await crawlCssResource()

  return
}

main()
