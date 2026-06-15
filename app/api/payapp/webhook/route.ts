export const dynamic = 'force-dynamic'

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

// 가격으로 젬 수량 역산 (var2 없는 경우 fallback)
const PRICE_TO_GEMS: Record<number, number> = {
  5900:  10,
  24900: 50,
  44900: 100,
  99000: 300,
}

export async function POST(req: NextRequest) {
  try {
    const text   = await req.text()
    const params = new URLSearchParams(text)

    // 디버그: 수신 즉시 모든 파라미터를 Supabase에 기록
    const rawDebug: Record<string, string> = {}
    params.forEach((v, k) => { rawDebug[k] = v })
    await supabase.from('credit_transactions').insert({
      user_email:  'webhook_debug',
      type:        'charge',
      amount:      0,
      description: JSON.stringify(rawDebug),
    }).then(({ error }) => { if (error) console.error('debug log failed:', error.message) })

    const state    = params.get('state')
    const payState = params.get('pay_state')
    const userId   = params.get('userid')
    const price    = params.get('price')
    const var1     = params.get('var1')       // userEmail
    const var2     = params.get('var2')       // packageId or 'sub_basic_monthly' etc.
    const var3     = params.get('var3')       // orderId or subscriptionId
    const payseq   = params.get('payseq')     // 결제 일련번호
    const rebillNo = params.get('rebill_no')  // 정기결제 등록번호

    // 결제 완료 상태 체크 (state=1 또는 pay_state=2)
    const isPaid = state === '1' || payState === '2' || payState === '4' || payState === '8'
    if (!isPaid) {
      console.log('payapp webhook: not paid', { state, payState })
      return new NextResponse('ok', { status: 200 })
    }

    const userEmail = var1
    const packageId = var2

    if (!userEmail) {
      console.error('payapp webhook: missing userEmail')
      return new NextResponse('ok', { status: 200 })
    }

    // userid 검증
    if (userId !== process.env.PAYAPP_USER_ID) {
      console.error('payapp webhook: invalid userid', userId)
      return new NextResponse('ok', { status: 200 })
    }

    // ── 구독 결제 처리 ──────────────────────────────────────────
    if (packageId?.startsWith('sub_')) {
      const subId = var3 ?? ''
      const txKey = `sub:${rebillNo ?? subId}:${payseq ?? Date.now()}`

      // 중복 처리 방지
      const { data: existingTx } = await supabase
        .from('credit_transactions').select('id').eq('description', txKey).maybeSingle()
      if (existingTx) {
        console.log('payapp webhook: duplicate sub tx', txKey)
        return new NextResponse('ok', { status: 200 })
      }

      // 구독 레코드 조회 (subId 또는 rebill_no로)
      let subQuery = supabase.from('subscriptions').select('*')
      if (rebillNo) {
        subQuery = subQuery.eq('rebill_no', rebillNo)
      } else if (subId) {
        subQuery = subQuery.eq('id', subId)
      } else {
        subQuery = subQuery.eq('user_email', userEmail).eq('status', 'pending')
      }
      const { data: sub } = await subQuery.maybeSingle()

      if (!sub) {
        console.error('payapp webhook: subscription not found', { subId, rebillNo, userEmail })
        return new NextResponse('ok', { status: 200 })
      }

      const gems = sub.gems_per_cycle
      const isYearly = sub.billing_cycle === 'yearly'

      // 구독 활성화 / rebill_no 저장 / 다음 결제일 계산
      const nextBilling = new Date()
      if (isYearly) {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1)
      } else {
        nextBilling.setMonth(nextBilling.getMonth() + 1)
      }
      await supabase.from('subscriptions').update({
        status:          'active',
        rebill_no:       rebillNo ?? sub.rebill_no,
        next_billing_at: nextBilling.toISOString(),
      }).eq('id', sub.id)

      // 젬 지급
      const { data: credits } = await supabase
        .from('user_credits').select('balance').eq('user_email', userEmail).maybeSingle()
      const newBalance = (credits?.balance ?? 0) + gems
      await supabase.from('user_credits').upsert(
        { user_email: userEmail, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_email' },
      )
      await supabase.from('credit_transactions').insert({
        user_email:  userEmail,
        type:        'charge',
        amount:      gems,
        won:         Number(price) || sub.price_per_cycle,
        description: txKey,
      })

      console.log(`payapp webhook: sub gems ${gems} → ${userEmail}, balance ${newBalance}`)

      // 구독 결제 완료 알림톡
      const subPhone = params.get('var4') ?? params.get('recvphone')
      if (subPhone && subPhone.replace(/\D/g, '').length >= 10) {
        const templateId = process.env.SOLAPI_TEMPLATE_CHARGE
        if (templateId) {
          try {
            await sendAlimtalk(subPhone, templateId, {
              '#{고객명}': userEmail.split('@')[0],
              '#{상품명}': sub.plan_key === 'basic' ? '베이직' : sub.plan_key === 'standard' ? '스탠다드' : '프로',
              '#{젬수}':   String(gems),
            })
          } catch (e) { console.warn('alimtalk (sub charge) failed:', e) }
        }
      }
      return new NextResponse('ok', { status: 200 })
    }

    // ── 일회성 젬 충전 처리 ────────────────────────────────────
    const orderId = var3 ?? payseq ?? `payapp_${Date.now()}`

    // 젬 수량 결정: packageId 우선, 없으면 가격으로 fallback
    let gems = 0
    let pkgLabel = ''
    if (packageId && GEM_PACKAGES[packageId]) {
      gems     = GEM_PACKAGES[packageId].gems
      pkgLabel = GEM_PACKAGES[packageId].label
    } else if (price) {
      gems     = PRICE_TO_GEMS[Number(price)] ?? 0
      pkgLabel = `${gems}젬 패키지`
    }

    if (gems <= 0) {
      console.error('payapp webhook: cannot determine gems', { packageId, price })
      return new NextResponse('ok', { status: 200 })
    }

    // 중복 처리 방지
    const txKey = `payapp:${orderId}`
    const { data: existingTx } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('description', txKey)
      .maybeSingle()

    if (existingTx) {
      console.log('payapp webhook: duplicate orderId', orderId)
      return new NextResponse('ok', { status: 200 })
    }

    // 잔액 조회 및 업데이트
    const { data: existing } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_email', userEmail)
      .maybeSingle()

    const currentBalance = existing?.balance ?? 0
    const newBalance     = currentBalance + gems

    const { error: upsertErr } = await supabase
      .from('user_credits')
      .upsert(
        { user_email: userEmail, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_email' },
      )
    if (upsertErr) throw upsertErr

    await supabase.from('credit_transactions').insert({
      user_email:  userEmail,
      type:        'charge',
      amount:      gems,
      won:         Number(price) || 0,
      description: txKey,
    })

    console.log(`payapp webhook: credited ${gems} gems to ${userEmail}, new balance ${newBalance}`)

    // 완료 알림톡 (var4 또는 recvphone에서 전화번호)
    const phone = params.get('var4') ?? params.get('recvphone')
    if (phone && phone.replace(/\D/g, '').length >= 10) {
      const templateId = process.env.SOLAPI_TEMPLATE_CHARGE
      if (templateId) {
        try {
          await sendAlimtalk(
            phone,
            templateId,
            {
              '#{고객명}': userEmail.split('@')[0],
              '#{상품명}': pkgLabel,
              '#{젬수}':   String(gems),
            },
          )
        } catch (e) {
          console.warn('alimtalk (charge) failed:', e)
        }
      }
    }

    return new NextResponse('ok', { status: 200 })
  } catch (e) {
    console.error('payapp/webhook error:', e)
    return new NextResponse('ok', { status: 200 })
  }
}
