import { AxiosError } from 'axios'
import { APIError } from '.'

export function generateSortedQueryString(
  unsortedDict: { [id: string]: string | { toString: () => string } } | unknown,
): string {
  const sort = Object.entries(unsortedDict).sort((obj1, obj2) => {
    if (obj1 > obj2) {
      return 1
    }

    if (obj1 < obj2) {
      return -1
    }

    return 0
  })

  return sort.map((value) => `${value[0]}=${value[1].toString()}`).join('&')
}

export function generateSortedDictionary(
  unsortedDict: { [id: string]: string | { toString: () => string } } | unknown,
): [string, unknown][] {
  const sort = Object.entries(unsortedDict).sort((obj1, obj2) => {
    if (obj1 > obj2) {
      return 1
    }

    if (obj1 < obj2) {
      return -1
    }

    return 0
  })

  return sort
}

export function querystring(dict: { [id: string]: string | { toString: () => string } }): string {
  return Object.entries(dict)
    .map((value) => `${value[0]}=${value[1]?.toString() ?? ''}`)
    .join('&')
}

export function makeErrorObj(err: AxiosError): APIError {
  if (err?.response != null)
    return {
      type: 'network',
      message: err.response?.statusText,
      data: err.response?.data,
      code: err.response?.status.toString(),
    }

  return {
    type: 'system',
    message: err.toString(),
  }
}

export function parseCsv<T>(csv: string): T[] {
  const parsed = csv
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => line.split(','))

  const headers = parsed[0]
  const data = parsed.slice(1)

  return data.map((row) => {
    const obj: { [key: string]: string } = {}
    headers.forEach((header, index) => {
      obj[header] = row[index]
    })

    return obj as T
  })
}

export function cardsToScore(cards: string[]): number {
  const store = cards.reduce((acc, card) => {
    const cardValue = card.slice(0, -1)
    const value =
      cardValue === 'A' ? 1 : cardValue === 'K' || cardValue === 'Q' || cardValue === 'J' ? 0 : Number(cardValue)
    return acc + value
  }, 0)

  return store % 10
}
