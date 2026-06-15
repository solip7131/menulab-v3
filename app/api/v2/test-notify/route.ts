export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sendAlimtalk, cleanPhone } from '../../../../lib/solapi'
import crypto from 'crypto'

function makeAuth(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(16).toString('hex')
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex')
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

const TEMPLATES = {
  order: {
    envKey: 'SOLAPI_TEMPLATE_ORDER',
    label: '주문 완료',
    variables: { '#{고객명}': '테스트고객', '#{주문번호}': 'TEST1234', '#{옵션}': '메뉴 리터치 1장', '#{결제금액}': '5,000' },
  },
  payment: {
    envKey: 'SOLAPI_TEMPLATE_PAYMENT',
    label: '입금 확인',
    variables: { '#{고객명}': '테스트고객', '#{주문번호}': 'TEST1234', '#{금액}': '5,000원' },
  },
  ai_done: {
    envKey: 'SOLAPI_TEMPLATE_AI_DONE',
    label: 'AI 완료',
    variables: { '#{주문번호}': 'TEST1234', '#{컷수}': '1' },
    buttons: [{ buttonType: 'WL' as const, buttonName: '결과물 확인하기', linkMo: 'https://menulab.kr/mypage', linkPc: 'https://menulab.kr/mypage' }],
  },
  charge: {
    envKey: 'SOLAPI_TEMPLATE_CHARGE',
    label: '젬 충전 완료',
    variables: { '#{이름}': '테스트고객', '#{젬수량}': '100', '#{잔액}': '120' },
  },
  pay_request: {
    envKey: 'SOLAPI_TEMPLATE_PAY_REQUEST',
    label: '결제 요청',
    variables: { '#{상품명}': '메뉴랩 베이직 플랜', '#{금액}': '9,900' },
    buttons: [{ buttonType: 'WL' as const, buttonName: '결제하러 가기', linkMo: 'https://menulab.kr', linkPc: 'https://menulab.kr' }],
  },
} as const

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const phone    = searchParams.get('phone') || ''
  const template = searchParams.get('template') || ''

  // 환경변수 전체 점검
  const envCheck: Record<string, string> = {
    SOLAPI_API_KEY:             process.env.SOLAPI_API_KEY     ? `✅ (${process.env.SOLAPI_API_KEY.slice(0,6)}...)` : '❌ 없음',
    SOLAPI_API_SECRET:          process.env.SOLAPI_API_SECRET  ? `✅ (${process.env.SOLAPI_API_SECRET.slice(0,4)}...)` : '❌ 없음',
    SOLAPI_PFID:                process.env.SOLAPI_PFID        ? `✅ (${process.env.SOLAPI_PFID})` : '❌ 없음',
    SOLAPI_SENDER:              process.env.SOLAPI_SENDER      ? `✅ (${process.env.SOLAPI_SENDER})` : '❌ 없음',
    SOLAPI_TEMPLATE_ORDER:      process.env.SOLAPI_TEMPLATE_ORDER      ? `✅ (${process.env.SOLAPI_TEMPLATE_ORDER})` : '❌ 없음',
    SOLAPI_TEMPLATE_PAYMENT:    process.env.SOLAPI_TEMPLATE_PAYMENT    ? `✅ (${process.env.SOLAPI_TEMPLATE_PAYMENT})` : '❌ 없음',
    SOLAPI_TEMPLATE_AI_DONE:    process.env.SOLAPI_TEMPLATE_AI_DONE    ? `✅ (${process.env.SOLAPI_TEMPLATE_AI_DONE})` : '❌ 없음',
    SOLAPI_TEMPLATE_CHARGE:     process.env.SOLAPI_TEMPLATE_CHARGE     ? `✅ (${process.env.SOLAPI_TEMPLATE_CHARGE})` : '❌ 없음',
    SOLAPI_TEMPLATE_PAY_REQUEST: process.env.SOLAPI_TEMPLATE_PAY_REQUEST ? `✅ (${process.env.SOLAPI_TEMPLATE_PAY_REQUEST})` : '❌ 없음',
  }

  if (!phone) {
    return NextResponse.json({
      envCheck,
      usage: {
        '단일 테스트': '?phone=01012345678&template=order',
        '전체 테스트': '?phone=01012345678&template=all',
        '템플릿 목록': Object.keys(TEMPLATES).join(', '),
      },
    })
  }

  const to = cleanPhone(phone)
  const targets = template === 'all' ? Object.keys(TEMPLATES) : [template]
  const results: Record<string, unknown> = {}

  for (const key of targets) {
    const tpl = TEMPLATES[key as keyof typeof TEMPLATES]
    if (!tpl) { results[key] = '❌ 알 수 없는 템플릿'; continue }

    const templateId = process.env[tpl.envKey]
    if (!templateId) { results[key] = `❌ ${tpl.envKey} 환경변수 없음`; continue }

    try {
      await sendAlimtalk(to, templateId, { ...tpl.variables }, 'buttons' in tpl ? [...tpl.buttons] : undefined)
      results[key] = `✅ ${tpl.label} 발송 성공`
    } catch (e) {
      results[key] = `❌ ${tpl.label} 발송 실패: ${String(e)}`
    }
  }

  return NextResponse.json({ envCheck, phone: to, results })
}
