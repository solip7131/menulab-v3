import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAlimtalk } from '../../../../lib/solapi'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const GEM_PACKAGES: Record<string, { gems: number; won: number; label: string }> = {
  gem10:  { gems: 10,  won: 5900,  label: '10젬 패키지' },
  gem50:  { gems: 50,  won: 24900, label: '50젬 패키지' },
  gem100: { gems: 100, won: 44900, label: '100젬 패키지' },
  gem300: { gems: 300, won: 99000, label: '300젬 패키지' },
}

export async function POST(req: NextRequest) {
  try {
    // 페이앱 웹훅 파라미터 (x-www-form-urlencoded)
    const text = await req.text()
    const params = new URLSearchParams(text)

    const state     = params.get('state')      // '1' = 결제 완료
    const userId    = params.get('userid')
    const price     = params.get('price')
    const var1      = params.get('var1')       // userEmail
    const var2      = params.get('var2')       // packageId
    const var3      = params.get('var3')       // orderId
    const payseq    = params.get('payseq')     // 페이앱 결제 일련번호

    // 결제 완료 상태만 처리
    if (state !== '1') {
      return new NextResponse('ok', { status: 200 })
    }

    const userEmail = var1
    const packageId = var2
    const orderId   = var3

    if (!userEmail || !packageId) {
      console.error('payapp webhook missing params:', { userEmail, packageId, orderId })
      return new NextResponse('ok', { status: 200 })
    }

    // 페이앱 API 키 검증
    const expectedUserId = process.env.PAYAPP_USER_ID
    if (userId !== expectedUserId) {
      console.error('payapp webhook invalid userid:', userId)
      return new NextResponse('ok', { status: 200 })
    }

    const pkg = GEM_PACKAGES[packageId]
    if (!pkg) {
      console.error('payapp webhook unknown packageId:', packageId)
      return new NextResponse('ok', { status: 200 })
    }

    // 중복 처리 방지: orderId로 이미 처리된 거래인지 확인
    const { data: existingTx } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('description', `payapp:${orderId}`)
      .single()

    if (existingTx) {
      return new NextResponse('ok', { status: 200 })
    }

    // 현재 잔액 조회
    const { data: existing } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_email', userEmail)
      .single()

    const currentBalance = existing?.balance ?? 0
    const newBalance     = currentBalance + pkg.gems

    // 잔액 업데이트
    const { error: upsertErr } = await supabase
      .from('user_credits')
      .upsert(
        { user_email: userEmail, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_email' },
      )

    if (upsertErr) throw upsertErr

    // 거래 내역 기록
    await supabase.from('credit_transactions').insert({
      user_email:  userEmail,
      type:        'charge',
      amount:      pkg.gems,
      won:         pkg.won,
      description: `payapp:${orderId}`,
    })

    // 솔라피 알림톡 발송 (선택: 전화번호가 var4에 있을 경우)
    const phone = params.get('recvphone') ?? params.get('var4')
    if (phone && phone.length >= 10) {
      try {
        await sendAlimtalk(
          phone,
          process.env.SOLAPI_TEMPLATE_CHARGE ?? '',
          {
            '#{이름}':   userEmail.split('@')[0],
            '#{젬수량}': String(pkg.gems),
            '#{잔액}':   String(newBalance),
          },
        )
      } catch (e) {
        console.warn('alimtalk send failed:', e)
      }
    }

    return new NextResponse('ok', { status: 200 })
  } catch (e) {
    console.error('payapp/webhook error:', e)
    return new NextResponse('ok', { status: 200 })
  }
}
