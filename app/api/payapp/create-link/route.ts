export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '../../mypage/_utils'
import { sendAlimtalk } from '../../../../lib/solapi'

const GEM_PACKAGES = {
  gem10:  { gems: 10,  won: 5900,  label: '10젬 패키지 (사진 1장)'  },
  gem50:  { gems: 50,  won: 24900, label: '50젬 패키지 (사진 5장)'  },
  gem100: { gems: 100, won: 44900, label: '100젬 패키지 (사진 10장)' },
  gem300: { gems: 300, won: 99000, label: '300젬 패키지 (사진 30장)' },
}

const BASE_URL = 'https://menulab-v3.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

    const email = verifySessionToken(token)
    if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

    const { packageId, goodname: rawGoodname, price: rawPrice, recvphone } = await req.json()

    // packageId 방식 (CoinChargeModal) 또는 goodname+price 방식 (어드민/테스트) 모두 지원
    let goodname: string
    let price: number
    let pkgId = packageId ?? ''

    if (packageId) {
      const pkg = GEM_PACKAGES[packageId as keyof typeof GEM_PACKAGES]
      if (!pkg) return NextResponse.json({ error: '유효하지 않은 패키지예요' }, { status: 400 })
      goodname = pkg.label
      price    = pkg.won
    } else if (rawGoodname && rawPrice) {
      goodname = String(rawGoodname)
      price    = Number(rawPrice)
      if (!price || price <= 0) return NextResponse.json({ error: '올바른 금액을 입력해주세요' }, { status: 400 })
    } else {
      return NextResponse.json({ error: 'packageId 또는 goodname+price 필요' }, { status: 400 })
    }

    const userId = process.env.PAYAPP_USER_ID
    const key    = process.env.PAYAPP_KEY
    if (!userId || !key) return NextResponse.json({ error: '페이앱 설정이 없어요' }, { status: 500 })

    const orderId = `${email.replace(/[^a-zA-Z0-9]/g, '_')}_${pkgId || 'custom'}_${Date.now()}`

    const params = new URLSearchParams({
      cmd:       'payrequest',
      userid:    userId,
      key,
      goodname,
      price:     String(price),
      recvphone: recvphone ?? '',
      var1:      email,
      var2:      pkgId,
      var3:      orderId,
      var4:      recvphone ?? '',
    })

    const res  = await fetch(`https://api.payapp.kr/oapi/apiLoad.html?${params}`, { method: 'GET' })
    const text = await res.text()

    // cmd=payrequest 응답: "state=1&errno=00000&payurl=https://...&..."
    const result = new URLSearchParams(text)
    if (result.get('errno') !== '00000') {
      console.error('Payapp error:', text)
      return NextResponse.json({ error: `페이앱 오류: ${result.get('errorMessage') ?? text}` }, { status: 400 })
    }

    const payUrl = result.get('payurl')
    if (!payUrl) {
      return NextResponse.json({ error: '페이앱 응답에 payurl 없음', raw: text }, { status: 500 })
    }

    // 고객 휴대폰 있으면 결제 요청 알림톡 발송
    if (recvphone && recvphone.replace(/\D/g, '').length >= 10) {
      const templateId = process.env.SOLAPI_TEMPLATE_PAY_REQUEST
      if (templateId) {
        try {
          await sendAlimtalk(
            recvphone,
            templateId,
            { '#{상품명}': goodname, '#{금액}': price.toLocaleString() },
            [{ buttonType: 'WL', buttonName: '결제하러 가기', linkMo: payUrl, linkPc: payUrl }],
          )
        } catch (e) {
          console.warn('alimtalk (pay_request) failed:', e)
        }
      }
    }

    return NextResponse.json({ url: payUrl, orderId, goodname, won: price })
  } catch (e) {
    console.error('payapp/create-link error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
