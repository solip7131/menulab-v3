import crypto from 'crypto'

const SOLAPI_ENDPOINT = 'https://api.solapi.com/messages/v4/send'

// Required env vars:
// SOLAPI_API_KEY, SOLAPI_API_SECRET
// SOLAPI_SENDER  — 발신번호 (Solapi에 등록된 번호)
// SOLAPI_PFID    — 카카오채널 pfId (KA01PF...)
// SOLAPI_TEMPLATE_ORDER    — 주문 완료 알림 templateId
// SOLAPI_TEMPLATE_PAYMENT  — 입금 확인 알림 templateId
// SOLAPI_TEMPLATE_COMPLETE — AI 완료 알림 templateId
// SOLAPI_TEMPLATE_WELCOME  — 회원가입 완료 알림 templateId

function makeAuth(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(16).toString('hex')
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex')
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

export function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

export interface AlimtalkButton {
  buttonType: 'WL' | 'AL' | 'DS' | 'BK' | 'MD'
  buttonName: string
  linkMo?: string
  linkPc?: string
}

export async function sendAlimtalk(
  phone: string,
  templateId: string,
  variables: Record<string, string>,
  buttons?: AlimtalkButton[]
): Promise<void> {
  const apiKey    = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  const pfId      = process.env.SOLAPI_PFID
  const sender    = process.env.SOLAPI_SENDER

  if (!apiKey || !apiSecret || !pfId || !sender) {
    console.warn('[Solapi] env vars not configured — skipping alimtalk')
    return
  }

  const to = cleanPhone(phone)
  if (!to || to.length < 10) {
    console.warn('[Solapi] invalid phone:', phone)
    return
  }

  const kakaoOptions: Record<string, unknown> = { pfId, templateId, variables }
  if (buttons?.length) kakaoOptions.buttons = buttons

  const res = await fetch(SOLAPI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: makeAuth(apiKey, apiSecret),
    },
    body: JSON.stringify({
      message: { to, from: cleanPhone(sender), type: 'ATA', kakaoOptions },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Solapi ${res.status}: ${text}`)
  }
}

export async function sendSms(phone: string, text: string): Promise<void> {
  const apiKey    = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  const sender    = process.env.SOLAPI_SENDER

  if (!apiKey || !apiSecret || !sender) {
    console.warn('[Solapi] env vars not configured — skipping SMS')
    return
  }

  const to = cleanPhone(phone)
  if (!to || to.length < 10) {
    console.warn('[Solapi] invalid phone:', phone)
    return
  }

  // 90바이트 초과 시 LMS, 이하 SMS
  const type = Buffer.byteLength(text, 'utf8') > 90 ? 'LMS' : 'SMS'

  const res = await fetch(SOLAPI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  makeAuth(apiKey, apiSecret),
    },
    body: JSON.stringify({
      message: { to, from: cleanPhone(sender), type, text },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Solapi SMS ${res.status}: ${body}`)
  }
}

// ── 알림 유형별 헬퍼 ──

const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://menulab-solip7131s-projects.vercel.app'

export async function notifyOrderCreated(params: {
  phone: string
  orderId: string
  customerName: string
  planLabel: string
  amount: number
}) {
  const templateId = process.env.SOLAPI_TEMPLATE_ORDER
  if (!templateId) return
  await sendAlimtalk(params.phone, templateId, {
    '#{고객명}':    params.customerName,
    '#{주문번호}':  params.orderId.slice(-8).toUpperCase(),
    '#{옵션}':     params.planLabel,
    '#{결제금액}':  params.amount.toLocaleString(),
  })
}

export async function notifyPaymentConfirmed(params: {
  phone: string
  orderId: string
  amount: number
  customerName: string
}) {
  const templateId = process.env.SOLAPI_TEMPLATE_PAYMENT
  if (!templateId) return
  await sendAlimtalk(params.phone, templateId, {
    '#{고객명}':  params.customerName,
    '#{주문번호}': params.orderId.slice(-8).toUpperCase(),
    '#{금액}':    `${params.amount.toLocaleString()}원`,
  })
}

export async function notifySignup(params: {
  phone: string
  customerName: string
}) {
  const templateId = process.env.SOLAPI_TEMPLATE_WELCOME
  if (!templateId) return
  const siteUrl = SITE_URL()
  await sendAlimtalk(
    params.phone,
    templateId,
    { '#{고객명}': params.customerName },
    [{
      buttonType: 'WL',
      buttonName: '메뉴랩 시작하기',
      linkMo: siteUrl,
      linkPc: siteUrl,
    }]
  )
}

export async function notifyAiDone(params: {
  phone: string
  customerName?: string
  orderId?: string
  cutCount?: string | number
}) {
  const templateId = process.env.SOLAPI_TEMPLATE_COMPLETE
  if (!templateId) return
  const siteUrl = SITE_URL()
  await sendAlimtalk(
    params.phone,
    templateId,
    { '#{고객명}': params.customerName ?? '' },
    [{
      buttonType: 'WL',
      buttonName: '결과물 확인하기',
      linkMo: `${siteUrl}/mypage`,
      linkPc: `${siteUrl}/mypage`,
    }]
  )
}
