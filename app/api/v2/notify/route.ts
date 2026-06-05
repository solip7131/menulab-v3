export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyPaymentConfirmed, notifyAiDone } from '../../../../lib/solapi'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { orderId, type } = await req.json()
    if (!orderId || !type) {
      return NextResponse.json({ error: 'orderId, type 필수' }, { status: 400 })
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, customer_phone, customer_name, v2_meta, status, cut_count')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없어요' }, { status: 404 })
    }

    const phone = order.customer_phone
    if (!phone) {
      return NextResponse.json({ error: '전화번호가 없어요' }, { status: 400 })
    }

    if (type === 'payment_confirmed') {
      await notifyPaymentConfirmed({
        phone,
        orderId:      order.id,
        amount:       order.v2_meta?.amount ?? 0,
        customerName: order.customer_name ?? '',
      })
      return NextResponse.json({ success: true })
    }

    if (type === 'ai_done') {
      await notifyAiDone({
        phone,
        orderId: order.id,
        cutCount: order.cut_count,
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: '알 수 없는 알림 유형' }, { status: 400 })
  } catch (e) {
    console.error('notify error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
