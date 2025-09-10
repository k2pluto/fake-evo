import { type CallEvoOptions, type CallEvoResponse } from './call-evo'
import { headerToObject } from './util'

export async function callFetch(
  urlstr: string,
  { headers, responseType, body, method }: CallEvoOptions = {},
): Promise<CallEvoResponse> {
  let newHeaders: Record<string, string> = {}
  try {
    const url = new URL(urlstr)

    newHeaders = {
      ...headers,
      ...(headers.host != null && { host: url.host }),
      origin: url.origin,
      'user-agent': headers['user-agent'] as string,
      ...(headers.cookie != null && { cookie: headers.cookie as string }),
    } as Record<string, string>

    delete newHeaders['content-length']
    delete newHeaders.referer
    delete newHeaders['x-forwarded-for']
    delete newHeaders['x-forwarded-proto']
    delete newHeaders['x-forwarded-port']
    delete newHeaders['x-amzn-trace-id']
    delete newHeaders['if-none-match']
    delete newHeaders['if-modified-since']

    const res = await fetch(urlstr, {
      method: method ?? 'GET',
      headers: newHeaders,
      body,
      redirect: 'manual',
    })

    const headerObj = headerToObject(res.headers)

    delete headerObj['content-encoding']
    delete headerObj['access-control-allow-origin']
    delete headerObj['cross-orgin-resource-policy']

    if (responseType === 'arraybuffer') {
      return {
        data: await res.arrayBuffer(),
        recvHeaders: headerObj,
        sendHeaders: newHeaders,
        status: res.status,
      }
    }

    if (res.headers.get('content-type')?.includes('application/json')) {
      return {
        data: await res.json(),
        recvHeaders: headerObj,
        sendHeaders: newHeaders,
        status: res.status,
      }
    }

    return {
      data: await res.text(),
      recvHeaders: headerObj,
      sendHeaders: newHeaders,
      status: res.status,
    }
  } catch (err) {
    const { response, cause } = err
    if (response != null) {
      return {
        data: await response.text(),
        recvHeaders: headerToObject(response.headers as Headers),
        sendHeaders: newHeaders,
        status: response.status,
      }
    }

    if (cause != null) {
      return cause
    }

    throw err
  }
}
