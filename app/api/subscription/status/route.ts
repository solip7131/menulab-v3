export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken } from '../../mypage/_utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

    const email = verifySessionToken(token)
    if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, plan_key, billing_cycle, status, gems_per_cycle, price_per_cycle, next_billing_at, created_at')
      .eq('user_email', email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle()

    return NextResponse.json({ subscription: sub ?? null })
  } catch (e) {
    console.error('subscription/status error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

    const email = verifySessionToken(token)
    if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, rebill_no')
      .eq('user_email', email)
      .eq('status', 'active')
      .maybeSingle()

    if (!sub) return NextResponse.json({ error: '활성 구독이 없어요' }, { status: 404 })

    // Payapp 정기결제 해지
    if (sub.rebill_no) {
      const userId = process.env.PAYAPP_USER_ID
      const apiKey = process.env.PAYAPP_KEY
      if (userId && apiKey) {
        const params = new URLSearchParams({
          cmd:       'rebillCancel',
          userid:    userId,
          key:       apiKey,
          rebill_no: sub.rebill_no,
        })
        await fetch(`https://api.payapp.kr/oapi/apiLoad.html?${params}`, { method: 'GET' })
          .catch(e => console.warn('rebillCancel fetch failed:', e))
      }
    }

    await supabase.from('subscriptions').update({
      status:       'cancelled',
      cancelled_at: new Date().toISOString(),
    }).eq('id', sub.id)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('subscription/cancel error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
