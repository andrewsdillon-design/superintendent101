import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getKey(): Buffer {
  const key = process.env.EMAIL_ENCRYPTION_KEY
  if (!key || key.length !== 64) throw new Error('EMAIL_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)')
  return Buffer.from(key, 'hex')
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':')
  if (!ivHex || !encHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', getKey(), iv)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
