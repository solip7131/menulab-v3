import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '../../mypage/_utils'

// 젬 패키지 정의
const GEM_PACKAGES: Record<string, { gems: number; won: number; label: string }> = {
  gem10:  { gems: 10,  won: 5900,  label: '10젬 패키지 (사진 1장)' },
  gem50:  { gems: 50,  won: 24900, label: '50젬 패키지 (사진 5장)' },
  gem100: { gems: 100, won: 44900, label: '100젬 패키지 (사진 10장)' },
  gem300: { gems: 300, won: 99000, label: '300젬 패키지 (사진 30장)' },
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

    const email = verifySessionToken(token)
    if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

    const { packageId } = await req.json()
    const pkg = GEM_PACKAGES[packageId]
    if (!pkg) return NextResponse.json({ error: '유효하지 않은 패키지예요' }, { status: 400 })

    const userId   = process.env.PAYAPP_USER_ID
    const key      = process.env.PAYAPP_KEY
    const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://menulab.vercel.app'

    if (!userId || !key) {
      return NextResponse.json({ error: '페이앱 설정이 없어요' }, { status: 500 })
    }

    // orderId: 이메일 + 패키지 + 타임스탬프
    const orderId = `${email.replace(/[^a-zA-Z0-9]/g, '_')}_${packageId}_${Date.now()}`

    const params = new URLSearchParams({
      cmd:        'paymentRequest',
      userid:     userId,
      goodname:   pkg.label,
      price:      String(pkg.won),
      recvphone:  '',
      feedbackurl: `${baseUrl}/api/payapp/webhook`,
      var1:       email,
      var2:       packageId,
      var3:       orderId,
    })

    const res = await fetch(
      `https://api.payapp.kr/oapi/apiLoad.html?${params.toString()}`,
      { method: 'GET' },
    )

    const text = await res.text()

    // 페이앱 응답 파싱: "0\r\n{결제URL}\r\n..."
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines[0] !== '0') {
      console.error('Payapp error:', text)
      return NextResponse.json({ error: `페이앱 오류: ${lines[1] ?? text}` }, { status: 400 })
    }

    const payUrl = lines[1]
    return NextResponse.json({ url: payUrl, orderId, gems: pkg.gems, won: pkg.won })
  } catch (e) {
    console.error('payapp/create-link error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
