import http2 from 'http2'

export function callHttp2(
  urlstr: string,
  headers: Record<string, string | string[]> = {},
): Promise<{ data: string; headers: Record<string, string>; status: number }> {
  const timeout = 5000
  return new Promise((resolve, reject) => {
    const url = new URL(urlstr)

    const client = http2.connect(url.origin)
    client.on('error', (err) => console.error(err))

    const req = client.request({
      ...headers,
      ':path': url.pathname + url.search,
      ':authority': url.host,
      ':method': 'GET',
      ':scheme': url.protocol.replace(':', ''),
    })

    let resHeaders = {}
    let status = 0
    req.on('response', (rawHeaders, flags) => {
      resHeaders = rawHeaders
      status = rawHeaders[':status']
      delete rawHeaders[':status']
    })

    req.on('headers', (headers) => {
      console.log('headers', JSON.stringify(headers))
    })

    req.setEncoding('utf8')
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', (res) => {
      client.close()
      resolve({ data, headers: resHeaders, status })
    })
    req.end()

    setTimeout(() => {
      client.close()
      reject('timeout')
    }, timeout)
  })
}
