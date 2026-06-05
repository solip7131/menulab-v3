export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cleanPhone } from '../../../../lib/solapi'
import crypto from 'crypto'

function makeAuth(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(16).toString('hex')
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex')
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const phone = searchParams.get('phone') || ''

  const apiKey     = process.env.SOLAPI_API_KEY
  const apiSecret  = process.env.SOLAPI_API_SECRET
  const pfId       = process.env.SOLAPI_PFID
  const sender     = process.env.SOLAPI_SENDER
  const templateId = process.env.SOLAPI_TEMPLATE_ORDER

  const envCheck = {
    SOLAPI_API_KEY:        apiKey     ? `✅ (${apiKey.slice(0, 6)}...)` : '❌ 없음',
    SOLAPI_API_SECRET:     apiSecret  ? `✅ (${apiSecret.slice(0, 4)}...)` : '❌ 없음',
    SOLAPI_PFID:           pfId       ? `✅ (${pfId})` : '❌ 없음',
    SOLAPI_SENDER:         sender     ? `✅ (${sender})` : '❌ 없음',
    SOLAPI_TEMPLATE_ORDER: templateId ? `✅ (${templateId})` : '❌ 없음',
  }

  if (!phone) {
    return NextResponse.json({ envCheck, usage: '?phone=01012345678 으로 호출하면 실제 발송 테스트' })
  }

  if (!apiKey || !apiSecret || !pfId || !sender || !templateId) {
    return NextResponse.json({ envCheck, error: 'env 미설정' }, { status: 400 })
  }

  const to = cleanPhone(phone)

  const variables = {
    '#{고객명}':   '테스트고객',
    '#{주문번호}': 'TEST1234',
    '#{옵션}':    '체험 1장',
    '#{결제금액}': '5000',
  }

  const body = {
    message: {
      to,
      from: cleanPhone(sender),
      type: 'ATA',
      kakaoOptions: { pfId, templateId, variables },
    },
  }

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: makeAuth(apiKey, apiSecret),
    },
    body: JSON.stringify(body),
  })

  const responseBody = await res.json().catch(() => null)

  return NextResponse.json({
    envCheck,
    requestVariables: variables,
    solapiStatus: res.status,
    solapiResponse: responseBody,
  })
}
