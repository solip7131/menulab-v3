export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sendSms } from '../../../../lib/solapi'

// 사용법:
// GET /api/payapp/test?secret=ADMIN_PW&phone=01012345678&email=you@example.com&package=gem10
// package: gem10 | gem50 | gem100 | gem300 (기본값: gem10)
// email: 젬을 지급받을 실제 계정 이메일 (필수)

const GEM_PACKAGES = {
  gem10:  { gems: 10,  won: 5900,  label: '10젬 패키지 (사진 1장)'  },
  gem50:  { gems: 50,  won: 24900, label: '50젬 패키지 (사진 5장)'  },
  gem100: { gems: 100, won: 44900, label: '100젬 패키지 (사진 10장)' },
  gem300: { gems: 300, won: 99000, label: '300젬 패키지 (사진 30장)' },
}

const BASE_URL = 'https://menulab-v3.vercel.app'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // 어드민 시크릿 검증
  const secret = searchParams.get('secret')
  if (secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const phone  = searchParams.get('phone')
  const email  = searchParams.get('email')
  const pkgKey = (searchParams.get('package') ?? 'gem10') as keyof typeof GEM_PACKAGES

  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ error: 'phone 파라미터 필요 (예: 01012345678)' }, { status: 400 })
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'email 파라미터 필요 — 젬을 지급받을 실제 계정 이메일' }, { status: 400 })
  }

  const pkg = GEM_PACKAGES[pkgKey]
  if (!pkg) {
    return NextResponse.json({ error: `유효한 package: ${Object.keys(GEM_PACKAGES).join(', ')}` }, { status: 400 })
  }

  const userId = process.env.PAYAPP_USER_ID
  const key    = process.env.PAYAPP_KEY
  if (!userId || !key) {
    return NextResponse.json({ error: '페이앱 환경변수 없음 (PAYAPP_USER_ID, PAYAPP_KEY)' }, { status: 500 })
  }

  const cleanedPhone = phone.replace(/\D/g, '')
  const orderId      = `test_${pkgKey}_${Date.now()}`

  const params = new URLSearchParams({
    cmd:       'payrequest',
    userid:    userId,
    key,
    goodname:  pkg.label,
    price:     String(pkg.won),
    recvphone: cleanedPhone,
    var1:      email,
    var2:      pkgKey,
    var3:      orderId,
    var4:      cleanedPhone,
  })

  const res     = await fetch(`https://api.payapp.kr/oapi/apiLoad.html?${params}`, { method: 'GET' })
  const rawText = await res.text()

  // cmd=payrequest 응답: "state=1&errno=00000&payurl=https://...&..."
  const lines = new URLSearchParams(rawText)
  if (lines.get('errno') !== '00000') {
    return NextResponse.json({ error: `페이앱 오류: ${lines.get('errorMessage') ?? rawText}`, raw: rawText }, { status: 400 })
  }

  const payUrl = lines.get('payurl')
  if (!payUrl) {
    return NextResponse.json({ error: '페이앱 응답에 payurl 없음', raw: rawText }, { status: 500 })
  }

  // SMS로 결제링크 발송 (에러 상세 포함)
  let smsSent   = false
  let smsError: string | null = null
  try {
    const smsText = `[메뉴랩] ${pkg.label} 결제 요청\n금액: ${pkg.won.toLocaleString()}원\n\n결제하러 가기:\n${payUrl}`
    await sendSms(cleanedPhone, smsText)
    smsSent = true
  } catch (e: any) {
    smsError = e?.message ?? String(e)
    console.warn('test SMS failed:', smsError)
  }

  return NextResponse.json({
    ok:       true,
    url:      payUrl,
    orderId,
    package:  pkgKey,
    gems:     pkg.gems,
    won:      pkg.won,
    phone:    cleanedPhone,
    email,
    smsSent,
    smsError,
    note:     smsSent
      ? `SMS 발송 완료 → ${cleanedPhone}`
      : `SMS 실패: ${smsError ?? '원인 불명'}`,
  })
}
