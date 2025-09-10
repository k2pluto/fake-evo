import { createServer } from 'https'
import { readFileSync } from 'fs'
import { WebSocketServer } from 'ws'

const server = createServer({
  cert: readFileSync('./key/cert.pem'),
  key: readFileSync('./key/private.pem'),
})

const wss = new WebSocketServer({ server })

wss.on('connection', function connection(ws) {
  //console.log("connected", ws.url, JSON.stringify(ws));
  console.log('connected', ws.url)
  ws.on('error', console.error)

  ws.on('message', function message(data) {
    console.log('received: %s', data)
  })

  ws.on('upgrade', (req) => {
    console.log('upgrade', req.url, JSON.stringify(req.headers))
  })

  //ws.send("something");
})

server.listen(443)

server.on('upgrade', (req, socket, head) => {
  console.log(
    'upgrade',
    req.httpVersion,
    req.socket.remoteAddress,
    req.socket.remotePort,
    req.socket.remoteFamily,
    req.url,
    req.method,
    req.statusCode,
    req.statusMessage,
    JSON.stringify(req.rawHeaders),
    JSON.stringify(req.rawTrailers),
  )
})

console.log('Server is running on https://localhost:443')
