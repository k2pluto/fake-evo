import crypto from 'node:crypto'

export function hashMd5(data: string): string {
  const md5 = crypto.createHash('md5')
  //return md5.update(data).digest('base64')
  return md5.update(data).digest('hex')
}

export function hashMd5Base64(data: string): string {
  const md5 = crypto.createHash('md5')
  return md5.update(data).digest('base64')
}

export function hashSha256(data: string): string {
  const sha256 = crypto.createHash('sha256')
  //return sha256.update(data).digest('base64')
  return sha256.update(data).digest('hex')
}

export function hmacSha1HBase64(data: string, key: crypto.BinaryLike | crypto.KeyObject): string {
  const hmac = crypto.createHmac('sha1', key)
  return hmac.update(data).digest('base64')
}

export function hmacDESCBCBase64(data: string, key: any): string {
  //crypto.getCiphers().map((cipher) => console.log(cipher))

  const IV = Buffer.alloc(8)
  const hmac = crypto.createCipheriv('des-cbc', key, IV)
  //return md5.update(data).digest('base64')
  return hmac.update(data).toString('base64')
}

/**
 * Encrypts a single block of text using DES algorithm.
 * @param {Buffer} block - The block of text to be encrypted.
 * @param {Buffer} key - The encryption key.
 * @returns {Buffer} - The encrypted block.
 */
function desEncryptBlock(block: crypto.BinaryLike, key: crypto.CipherKey) {
  const cipher = crypto.createCipheriv('des-ecb', key, null)
  cipher.setAutoPadding(false)
  let encrypted = cipher.update(block)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return encrypted
}

/**
 * XORs two buffers.
 * @param {Buffer} buf1 - The first buffer.
 * @param {Buffer} buf2 - The second buffer.
 * @returns {Buffer} - The result of XORing the two buffers.
 */
function xorBuffers(buf1: Buffer, buf2: Buffer) {
  const result = Buffer.alloc(buf1.length)
  for (let i = 0; i < buf1.length; i++) {
    result[i] = buf1[i] ^ buf2[i]
  }
  return result
}
/**
 * Encrypts a given text using DES-CBC algorithm.
 * @param {string} text - The text to be encrypted.
 * @param {string} key - The encryption key (must be 8 bytes long for DES).
 * @param {string} iv - The initialization vector (must be 8 bytes long for DES).
 * @returns {string} - The encrypted text in hex format.
 */
export function desCbcEncrypt(text: string, key: string, iv: string) {
  if (key.length !== 8) {
    throw new Error('Key must be 8 bytes long for DES.')
  }
  if (iv.length !== 8) {
    throw new Error('Initialization vector (IV) must be 8 bytes long for DES.')
  }

  // Convert text to buffer and pad it to be a multiple of 8 bytes
  let buffer = Buffer.from(text, 'utf8')
  const padLength = 8 - (buffer.length % 8)
  const padding = Buffer.alloc(padLength, padLength)
  buffer = Buffer.concat([buffer, padding])

  const keyBuffer = Buffer.from(key)
  let previousBlock = Buffer.from(iv)
  let encryptedBuffer = Buffer.alloc(0)

  for (let i = 0; i < buffer.length; i += 8) {
    let block = buffer.slice(i, i + 8)
    block = xorBuffers(block, previousBlock)
    const encryptedBlock = desEncryptBlock(block, keyBuffer)
    encryptedBuffer = Buffer.concat([encryptedBuffer, encryptedBlock])
    previousBlock = encryptedBlock as any
  }

  return encryptedBuffer.toString('hex')
}

export function randomString(e = 10) {
  let t = ''
  for (; t.length < e; )
    t += Math.random()
      .toString(36)
      .slice(2, 2 + e - t.length)
  return t
}

export function randomHexString(e = 10) {
  let t = ''
  for (; t.length < e; )
    t += Math.random()
      .toString(16)
      .slice(2, 2 + e - t.length)
  return t
}
export function randomNumberString(e = 10) {
  let t = ''
  for (; t.length < e; )
    t += Math.random()
      .toString(10)
      .slice(2, 2 + e - t.length)
  return t
}

// AES-ECB Encryption
export function aesEcbEncrypt(data: string, key: string): string {
  const buffer = Buffer.from(key, 'utf-8')

  if (buffer.length !== 16) {
    throw new Error('Key must be 16 bytes long for AES encryption')
  }

  const cipher = crypto.createCipheriv('aes-128-ecb', buffer, null)
  let encrypted = cipher.update(data, 'utf-8', 'base64')
  encrypted += cipher.final('base64')

  return encrypted
}

// AES-ECB Decryption
export function aesEcbDecrypt(encryptedData: string, key: string): string {
  const buffer = Buffer.from(key, 'utf-8')

  if (buffer.length !== 16) {
    throw new Error('Key must be 16 bytes long for AES decryption')
  }

  const decipher = crypto.createDecipheriv('aes-128-ecb', buffer, null)
  decipher.setAutoPadding(true)

  let decrypted = decipher.update(encryptedData, 'base64', 'utf-8')
  decrypted += decipher.final('utf-8')

  return decrypted
}

/**
 * Decodes a JWT token and returns its header, payload, and signature.
 * @param {string} token - The JWT token to decode.
 * @returns {any} - An object containing the decoded header, payload, and signature.
 */
export function decodeJWT(token: string): any {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token')
  }

  const payload = Buffer.from(parts[1], 'base64').toString('utf-8')

  return JSON.parse(payload)
}

export function PokerGamesDecrypt(param: string, desKey: string): string {
  const cipherChunks: string[] = []
  const decipher = crypto.createDecipheriv('aes-128-ecb', desKey, null)
  decipher.setAutoPadding(true)

  cipherChunks.push(decipher.update(param, 'base64', 'utf8'))
  cipherChunks.push(decipher.final('utf8'))

  return cipherChunks.join('')
}

export function PokerGamesEncrypt(param: string, desKey: string): string {
  const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(desKey, 'utf8'), null)
  cipher.setAutoPadding(true)

  let encrypted = cipher.update(param, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  return encrypted
}

export function InplayEncryptAES(data: string, key: string, iv: string): string {
  const keyBuffer = Buffer.from(key, 'utf-8')
  const ivBuffer = Buffer.from(iv, 'utf-8')

  if (keyBuffer.length !== 16) {
    throw new Error('Key must be 16 bytes long for AES encryption')
  }

  const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer, ivBuffer)
  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  return encrypted
}

export function InplayDecryptAES(encryptedData: string, key: string, iv: string): string {
  const keyBuffer = Buffer.from(key, 'utf-8')
  const ivBuffer = Buffer.from(iv, 'utf-8')

  if (keyBuffer.length !== 16) {
    throw new Error('Key must be 16 bytes long for AES decryption')
  }

  const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuffer, ivBuffer)
  decipher.setAutoPadding(true)

  let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function generateInplayTimestamp(data: string, key: string): string {
  const md5Key = crypto.createHash('md5').update(key, 'utf8').digest()

  const cipher = crypto.createCipheriv('aes-128-ecb', md5Key, null)
  cipher.setAutoPadding(true)
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])

  return encrypted.toString('base64')
}

export function encodeBase64(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64')
}

export function decodeBase64(input: string): string {
  return Buffer.from(input, 'base64').toString('utf-8')
}

/**
 * Decrypt AES-256 encrypted data in ECB mode with PKCS7 padding.
 * @param data The Base64-encoded encrypted string.
 * @param key The key used for decryption.
 * @returns The decrypted JSON object.
 */
export function aes256Decryption(data: string, key: string): Record<string, any> {
  // Create the decipher for AES-256 in ECB mode
  const decipher = crypto.createDecipheriv('aes-256-ecb', key, null)
  decipher.setAutoPadding(true) // Use PKCS7 padding (enabled by default)

  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()])

  return JSON.parse(decrypted.toString('utf8'))
}

/**
 * Decrypt AES-256 encrypted data in ECB mode with PKCS7 padding.
 * @param data The Base64-encoded encrypted string.
 * @param key The key used for decryption.
 * @returns The decrypted JSON object.
 */
export function aes256Encryption(data: string, key: string): string {
  // Create the cipher for AES-256 in ECB mode
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null)
  cipher.setAutoPadding(true) // Use PKCS7 padding (enabled by default)

  // Encrypt the plaintext and return the Base64 encoded ciphertext
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])
  return encrypted.toString('base64')
}
