import { type Method, type ResponseType } from 'axios'

import { callAxios } from './call-axios'

export interface CallEvoOptions {
  username?: string
  evolutionUrl?: string  // Evolution 메인 도메인 (예: https://babylonvg.evo-games.com)
  headers?: Record<string, string | string[]>
  responseType?: ResponseType
  method?: Method
  body?: any
  timeout?: number
}

export interface CallEvoResponse {
  data?: any
  sendHeaders: Record<string, string | string[]>
  recvHeaders?: Record<string, string | string[]>
  status: number
}

// export const callEvo = callFetch
export const callEvo = callAxios
// export const callEvo = callCurl
