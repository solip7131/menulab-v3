export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken } from '../../mypage/_utils'
import { cleanPhone } from '../../../../lib/solapi'

const PLANS: Record<string, { gems: number; price: number; label: string }> = {
  basic_monthly:    { gems: 100, price: 29900, label: '메뉴랩 베이직 월간 구독' },
  basic_yearly:     { gems: 100, price: 19900, label: '메뉴랩 베이직 연간 구독' },
  standard_monthly: { gems: 200, price: 49900, label: '메뉴랩 스탠다드 월간 구독' },
  standard_yearly:  { gems: 200, price: 34900, label: '메뉴랩 스탠다드 연간 구독' },
  pro_monthly:      { gems: 400, price: 89900, label: '메뉴랩 프로 월간 구독' },
  pro_yearly:       { gems: 400, price: 59900, label: '메뉴랩 프로 연간 구독' },
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://menulab-v3.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

    const email = verifySessionToken(token)
    if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

    const { planKey, billingCycle } = await req.json()
    const key = `${planKey}_${billingCycle}` // e.g. 'basic_monthly'
    const plan = PLANS[key]
    if (!plan) return NextResponse.json({ error: '유효하지 않은 플랜이에요' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // 기존 활성 구독 확인
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, plan_key, status')
      .eq('user_email', email)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: '이미 활성 구독이 있어요. 먼저 해지 후 재구독해주세요.' }, { status: 409 })
    }

    // 전화번호 조회
    const { data: tokenRow } = await supabase
      .from('kakao_tokens').select('phone').eq('kakao_email', email).single()
    const recvphone = cleanPhone(tokenRow?.phone ?? '')

    const userId = process.env.PAYAPP_USER_ID
    const apiKey = process.env.PAYAPP_KEY
    if (!userId || !apiKey) return NextResponse.json({ error: '페이앱 설정이 없어요' }, { status: 500 })

    // pending 구독 레코드 생성 (webhook 수신 전)
    const { data: sub } = await supabase
      .from('subscriptions')
      .insert({
        user_email:      email,
        plan_key:        planKey,
        billing_cycle:   billingCycle,
        status:          'pending',
        gems_per_cycle:  plan.gems,
        price_per_cycle: plan.price,
      })
      .select('id')
      .single()

    const subId = sub?.id ?? ''

    const params = new URLSearchParams({
      cmd:             'rebillRegist',
      userid:          userId,
      key:             apiKey,
      goodname:        plan.label,
      goodprice:       String(plan.price),
      rebillCycleType: 'Month',
      rebillExpire:    '9999-12-31',
      feedbackurl:     `${BASE_URL}/api/payapp/webhook`,
      var1:            email,
      var2:            `sub_${key}`,   // e.g. 'sub_basic_monthly' — 구독 식별자
      var3:            subId,           // subscription row id
    })
    if (recvphone.length >= 10) {
      params.set('recvphone', recvphone)
    }

    const res = await fetch(`https://api.payapp.kr/oapi/apiLoad.html?${params}`, { method: 'GET' })
    const text = await res.text()
    const result = new URLSearchParams(text)

    if (result.get('errno') !== '00000') {
      console.error('Payapp rebillRegist error:', text)
      await supabase.from('subscriptions').delete().eq('id', subId)
      return NextResponse.json({ error: `페이앱 오류: ${result.get('errorMessage') ?? text}` }, { status: 400 })
    }

    const payUrl = result.get('payurl')
    if (!payUrl) {
      await supabase.from('subscriptions').delete().eq('id', subId)
      return NextResponse.json({ error: '페이앱 응답에 payurl 없음' }, { status: 500 })
    }

    return NextResponse.json({ url: payUrl, subId, planLabel: plan.label })
  } catch (e) {
    console.error('payapp/subscribe error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
