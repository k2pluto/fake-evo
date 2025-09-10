/*

import { type CallEvoOptions, type CallEvoResponse } from './call-evo'
import { headerToObject } from './util'


import { curly, type CurlyResult } from 'node-libcurl'

export async function callCurl(
  urlstr: string,
  { headers, responseType, body, method }: CallEvoOptions = {},
): Promise<CallEvoResponse> {
  try {
    const url = new URL(urlstr)

    const newReqHeaders = {
      ...headers,
      ...(headers.host != null && { host: url.host }),
      origin: url.origin,
      'user-agent': headers['user-agent'] as string,
      ...(headers.cookie != null && { cookie: headers.cookie as string }),
    } as Record<string, string>

    delete newReqHeaders['content-length']
    delete newReqHeaders.referer
    delete newReqHeaders['x-forwarded-for']
    delete newReqHeaders['x-forwarded-proto']
    delete newReqHeaders['x-forwarded-port']
    delete newReqHeaders['x-amzn-trace-id']
    delete newReqHeaders['if-none-match']
    delete newReqHeaders['if-modified-since']
    delete newReqHeaders['if-modified-since']
    delete newReqHeaders['accept-encoding']


    // const { statusCode, data, headers } = await curly.get(evolutionUrl.toString())

    const httpHeader = Object.entries(newReqHeaders).map(([key, value]) => `${key}: ${value}`)

    let res: CurlyResult
    if (method == null || method === 'GET') {
      res = await curly.get(urlstr, {
        httpHeader,
      })
    } else if (method === 'POST') {
      res = await curly.post(urlstr, {
        httpHeader,
        postFields: JSON.stringify(body),
      })
    }

    const { statusCode, data } = res

    const rawHeaderObj = res.headers[0] as Record<string, string | string[]>

    // make all key lowercase
    const headerObj = Object.fromEntries(Object.entries(rawHeaderObj).map(([key, value]) => [key.toLowerCase(), value]))

    console.log('callCurl', urlstr, statusCode, headerObj, typeof data, data.length)

    delete headerObj.result
    delete headerObj['content-encoding']
    delete headerObj['access-control-allow-origin']
    delete headerObj['cross-orgin-resource-policy']

    if (responseType === 'arraybuffer') {
      return {
        data,
        headers: headerObj,
        status: statusCode,
      }
    }

    if (headers['content-type']?.includes('application/json')) {
      return {
        data: JSON.parse(data as string),
        headers: headerObj,
        status: statusCode,
      }
    }

    return {
      data,
      headers: headerObj,
      status: statusCode,
    }
  } catch (err) {
    const { response, cause } = err
    if (response != null) {
      return {
        data: response.data,
        headers: headerToObject(response.headers as Headers),
        status: response.status,
      }
    }

    if (cause != null) {
      return cause
    }

    throw err
  }
}
*/
