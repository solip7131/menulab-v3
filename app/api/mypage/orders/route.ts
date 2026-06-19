export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken } from '../_utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })
    }

    const email = verifySessionToken(token)
    if (!email) {
      return NextResponse.json({ error: '세션이 만료됐어요. 다시 로그인해주세요.' }, { status: 401 })
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, created_at, order_type, cut_count, menu_names, angle, background, status, photo_urls, ai_photo_urls, customer_name')
      .eq('customer_email', email)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('mypage query error:', error)
      throw error
    }

    return NextResponse.json({ orders: orders || [] })
  } catch (e) {
    console.error('mypage orders error:', e)
    return NextResponse.json({ error: '주문을 불러오지 못했어요' }, { status: 500 })
  }
}
