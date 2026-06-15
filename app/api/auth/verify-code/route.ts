import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken } from '../../mypage/_utils'
import { notifySignup } from '../../../../lib/solapi'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

    const email = verifySessionToken(token)
    if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

    const { phone, code } = await req.json()
    const digits = phone?.replace(/\D/g, '')
    if (!digits || !code) return NextResponse.json({ error: '잘못된 요청이에요' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone', digits)
      .eq('email', email)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!data) {
      return NextResponse.json({ error: '인증번호가 만료됐거나 존재하지 않아요' }, { status: 400 })
    }
    if (data.code !== code) {
      return NextResponse.json({ error: '인증번호가 틀렸어요' }, { status: 400 })
    }

    await supabase.from('kakao_tokens').update({ phone: digits }).eq('kakao_email', email)
    await supabase.from('phone_verifications').delete().eq('phone', digits)

    // 환영 알림톡 발송 (이름 조회 후)
    try {
      const { data: tokenRow } = await supabase
        .from('kakao_tokens').select('kakao_name').eq('kakao_email', email).single()
      await notifySignup({ phone: digits, customerName: tokenRow?.kakao_name || '' })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('verify-code error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
