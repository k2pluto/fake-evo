import { Guid } from 'guid-typescript'

function pad(number, length) {
  let str = `${number}`
  while (str.length < length) {
    str = `0${str}`
  }

  return str
}

export const MakeAPIKEY = (): string => {
  const key =
    Guid.create().toString().replace('-', '').replace('-', '').replace('-', '').replace('-', '').replace('-', '') +
    RandomString(10)
  return key.toLocaleLowerCase() // ==> b77d409a-10cd-4a47-8e94-b0cd0ab50aa1
}

export const GetNow = (): Date => {
  return new Date()
}

export const pad2 = (n) => {
  return (n < 10 ? '0' : '') + n
}

export const GetTimeKey = () => {
  const date = new Date()

  const yy = date.getFullYear().toString().substring(2, 4)
  return (
    yy +
    pad2(date.getMonth() + 1) +
    pad2(date.getDate()) +
    pad2(date.getHours()) +
    pad2(date.getMinutes()) +
    pad2(date.getSeconds()) +
    pad2(date.getMilliseconds())
  )

  //return date;
}

export const GetTimeStemp = (): number => {
  return parseInt((new Date().getTime() / 1000).toString(), 0)
}

export const UserCheckID = (origen: string, subscripte: string): any => {
  if (origen.length !== 3) {
    return false
  }

  const name = subscripte.substring(0, 3)
  if (name.trim() === origen.trim()) {
    return true
  }

  return false
}

export const ConverDateFull2 = (): any => {
  const today = GetNow()

  const yyyy = today.getFullYear().toString()
  const MM = pad(today.getMonth() + 1, 2)
  const dd = pad(today.getDate(), 2)
  const hh = pad(today.getHours(), 2)
  const mm = pad(today.getMinutes(), 2)
  const ss = pad(today.getSeconds(), 2)
  const kk = pad(today.getMilliseconds(), 2)

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}.${kk}`
}

export const MakeDate = (): any => {
  const today = GetNow()

  const yyyy = today.getFullYear().toString()
  const MM = pad(today.getMonth() + 1, 2)
  const dd = pad(today.getDate(), 2)

  return `${yyyy}${MM}${dd}`
}

export const TupleToUrl = (unsortedArray) => {
  const sort = Object.keys(unsortedArray).sort((obj1, obj2) => {
    if (obj1 > obj2) {
      return 1
    }

    if (obj1 < obj2) {
      return -1
    }

    return 0
  })

  let url = ''
  for (const key of sort) {
    url = url + `${key}=${unsortedArray[key]}&`
  }

  return url.substring(0, url.length - 1)
}

export const String2Bin = (str: any) => {
  const result = []
  for (let i = 0; i < str.length; i++) {
    result.push(str.charCodeAt(i))
  }
  return result
}

export const MakeID = (idx: number) => {
  if (idx < 10) {
    return '000' + idx
  }
  if (idx < 100) {
    return '00' + idx
  }
  if (idx < 1000) {
    return '0' + idx
  }
  return idx
}

export const getRandomArbitrary = (min, max) => {
  return Math.trunc(Math.random() * (max - min) + min)
}

export const RandomString = (_nLength = 6) => {
  const strPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
  let chRandom = ''
  for (let i = 0; i < _nLength; i++) {
    const num = getRandomArbitrary(0, strPool.length)
    chRandom = chRandom + strPool[num]
  }
  return chRandom
}

export const MakeKey = () => {
  const today = GetNow()

  const yyyy = today.getFullYear().toString()
  const MM = pad(today.getMonth() + 1, 2)
  const dd = pad(today.getDate(), 2)
  const hh = pad(today.getHours(), 2)
  const mm = pad(today.getMinutes(), 2)
  const ss = pad(today.getSeconds(), 2)
  const kk = pad(today.getMilliseconds(), 2)

  return `${yyyy}${MM}${dd}${hh}${mm}${ss}${kk}${RandomString()}`
}

export const Sleep = async (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export const GetKoTime = (): any => {
  const today = GetNow()

  const yyyy = today.getFullYear().toString()
  const MM = pad(today.getMonth() + 1, 2)
  const dd = pad(today.getDate(), 2)
  const hh = pad(today.getHours(), 2)
  const mm = pad(today.getMinutes(), 2)
  const ss = pad(today.getSeconds(), 2)
  const kk = pad(today.getMilliseconds(), 2)

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}.${kk}`
}

export const GetKey = (): any => {
  const today = GetNow()

  const yyyy = today.getFullYear().toString()
  const MM = pad(today.getMonth() + 1, 2)
  const dd = pad(today.getDate(), 2)
  const hh = pad(today.getHours(), 2)
  const mm = pad(today.getMinutes(), 2)

  return `${yyyy}${MM}${dd}${hh}${mm}`
}

export const ConverDateStreetUTC = (date): any => {
  const today = new Date(date)

  const yyyy = today.getUTCFullYear().toString()
  const MM = pad(today.getUTCMonth() + 1, 2)
  const dd = pad(today.getUTCDate(), 2)
  const hh = pad(today.getUTCHours(), 2)
  const mm = pad(today.getUTCMinutes(), 2)

  return `${yyyy}${MM}${dd}${hh}${mm}00`
}

export const ConverDateUTC = (): any => {
  const today = new Date()

  const yyyy = today.getUTCFullYear().toString()
  const MM = pad(today.getUTCMonth() + 1, 2)
  const dd = pad(today.getUTCDate(), 2)
  const hh = pad(today.getUTCHours(), 2)
  const mm = pad(today.getUTCMinutes(), 2)
  const ss = pad(today.getUTCSeconds(), 2)

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`
}

export const ConverDateBooongoString = (date): any => {
  const yyyy = date.getFullYear().toString()
  const MM = pad(date.getMonth() + 1, 2)
  const dd = pad(date.getDate(), 2)
  const hh = pad(date.getHours(), 2)
  const mm = pad(date.getMinutes(), 2)

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`
}

export const ConverDateStreetCQ9 = (date): any => {
  const today = new Date(new Date(date).getTime() - 4 * 60 * 60 * 1000)
  // today.setMinutes(-1 * today.getTimezoneOffset())
  const now_utc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
    today.getUTCHours(),
    today.getUTCMinutes(),
    today.getUTCSeconds(),
  )

  today.setMinutes(today.getMinutes() - today.getTimezoneOffset())

  return `${new Date(now_utc).toISOString().replace('.000Z', '')}-04:00`
}

export const findGetParameter = (parameterName) => {
  const result = {}
  let tmp = []
  const items = parameterName.split('&')
  for (let index = 0; index < items.length; index++) {
    tmp = items[index].split('=')
    // if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    result[tmp[0]] = tmp[1]
  }
  return result
}

export const ConvertCloneDate = (date: any): any => {
  const today = new Date(date)

  const yyyy = today.getFullYear().toString()
  const MM = pad(today.getMonth() + 1, 2)
  const dd = pad(today.getDate(), 2)
  const hh = pad(today.getHours(), 2)
  const mm = pad(today.getMinutes(), 2)

  return `${yyyy}${MM}${dd}${hh}${mm}`
}

export const ConvertCloneGameDate = (now: any): any => {
  const date = now.split('')

  return `${date[0]}${date[1]}${date[2]}${date[3]}-${date[4]}${date[5]}-${date[6]}${date[7]} ${date[8]}${date[9]}:${date[10]}${date[11]}:${date[12]}${date[13]}`
}

export const MakeMasterKey = (index) => {
  const name = 'abcdefghijklmnopqrstuvwxyz'

  const key1 = Number(Math.floor(index / Math.floor(650)).toFixed(0))
  const key2 = Number((Math.floor(index / 25) % 26).toFixed(0))
  const key3 = index % 26

  console.log(`${key1} - ${key2} - ${key3}`)
  return name.charAt(key1) + name.charAt(key2) + name.charAt(key3)
}

export const ConvertTree = (trees) => {
  let count = 1
  const ex = {}
  for (const tree of trees.split('|')) {
    if (tree !== '') {
      ex[`${count}`] = tree
      count++
    }
  }

  return ex
}

export function printMemoryUsage() {
  const mem = process.memoryUsage()
  for (const key in mem) {
    mem[key] = `${(mem[key] / 1024 / 1024).toFixed(1)}MB`
  }
  return JSON.stringify(mem)
}

export const MINUTE_MS = 60_000
export const HOUR_MS = MINUTE_MS * 60
export const DAY_MS = HOUR_MS * 24
