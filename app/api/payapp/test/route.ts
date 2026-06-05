export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sendAlimtalk } from '../../../../lib/solapi'

// 사용법:
// GET /api/payapp/test?secret=ADMIN_PW&phone=01012345678&package=gem10
// package: gem10 | gem50 | gem100 | gem300 (기본값: gem10)

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
  const pkgKey = (searchParams.get('package') ?? 'gem10') as keyof typeof GEM_PACKAGES

  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ error: 'phone 파라미터 필요 (예: 01012345678)' }, { status: 400 })
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

  const orderId = `test_${pkgKey}_${Date.now()}`

  const params = new URLSearchParams({
    cmd:         'payrequest',
    userid:      userId,
    key,
    goodname:    pkg.label,
    price:       String(pkg.won),
    recvphone:   phone.replace(/\D/g, ''),
    feedbackurl: `${BASE_URL}/api/payapp/webhook`,
    var1:        'test@menulab.kr',
    var2:        pkgKey,
    var3:        orderId,
    var4:        phone.replace(/\D/g, ''),
  })

  const res  = await fetch(`https://api.payapp.kr/oapi/apiLoad.html?${params}`, { method: 'GET' })
  const text = await res.text()

  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines[0] !== '0') {
    return NextResponse.json({ error: `페이앱 오류: ${lines[1] ?? text}`, raw: text }, { status: 400 })
  }

  const payUrl = lines[1]

  // 알림톡 발송 (템플릿 있으면)
  let alimtalkSent = false
  const templateId = process.env.SOLAPI_TEMPLATE_PAY_REQUEST
  if (templateId) {
    try {
      await sendAlimtalk(
        phone,
        templateId,
        { '#{상품명}': pkg.label, '#{금액}': pkg.won.toLocaleString() },
        [{ buttonType: 'WL', buttonName: '결제하러 가기', linkMo: payUrl, linkPc: payUrl }],
      )
      alimtalkSent = true
    } catch (e) {
      console.warn('test alimtalk failed:', e)
    }
  }

  return NextResponse.json({
    ok:          true,
    url:         payUrl,
    orderId,
    package:     pkgKey,
    gems:        pkg.gems,
    won:         pkg.won,
    phone,
    alimtalkSent,
    note:        alimtalkSent
      ? '알림톡 발송 완료'
      : 'SOLAPI_TEMPLATE_PAY_REQUEST 없음 — 링크만 생성됨',
  })
}
