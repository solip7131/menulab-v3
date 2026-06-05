import crypto from 'crypto'

const SECRET = () => process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(0, 32)

export function generateOtp(email: string): string {
  const window = Math.floor(Date.now() / 300000)
  const hmac = crypto.createHmac('sha256', SECRET()).update(`${email}:${window}`).digest('hex')
  return parseInt(hmac.slice(0, 8), 16).toString().slice(-6).padStart(6, '0')
}

export function verifyOtpCode(email: string, code: string): boolean {
  const currentWindow = Math.floor(Date.now() / 300000)
  return [currentWindow, currentWindow - 1].some(w => {
    const hmac = crypto.createHmac('sha256', SECRET()).update(`${email}:${w}`).digest('hex')
    const expected = parseInt(hmac.slice(0, 8), 16).toString().slice(-6).padStart(6, '0')
    return expected === code.trim()
  })
}

export function createSessionToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySessionToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.')
    const expected = crypto.createHmac('sha256', SECRET()).update(payload).digest('base64url')
    if (sig !== expected) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (data.exp < Date.now()) return null
    return data.email as string
  } catch {
    return null
  }
}
