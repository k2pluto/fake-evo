import { parse } from 'date-fns'

export function errorToObj(err) {
  if (err instanceof Error) {
    const data = (err as any).response?.data
    return {
      error: err.message,
      stack: err.stack,
      data,
    }
  }
  return {
    error: err,
  }
}

export function errorToString(err) {
  return JSON.stringify(errorToObj(err))
}

export function removeUndefines(obj) {
  const newObj = {}
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key]
    }
  }
  return newObj
}

export function shuffleArray(array: unknown[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

export function convertToSeoulTime(dateString: string) {
  // yyyy-MM-dd 형식의 문자열을 Date 객체로 파싱합니다.
  const localDate = parse(dateString, 'yyyy-MM-dd', new Date())

  // 현재 로컬 타임존의 오프셋(분 단위)을 구합니다.
  const localOffset = localDate.getTimezoneOffset()

  // 서울 타임존의 오프셋은 UTC+9:00이므로, 이를 분 단위로 변환합니다.
  const seoulOffset = -540 // 9 hours * 60 minutes

  // 로컬 시간에 서울 타임존 오프셋을 적용하여 서울 시간을 구합니다.
  const seoulTime = new Date(localDate.getTime() + (seoulOffset - localOffset) * 60 * 1000)

  return seoulTime
}
