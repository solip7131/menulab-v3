import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionFull } from '../../mypage/_utils'
import { notifySignup } from '../../../../lib/solapi'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

    const session = verifySessionFull(token)
    if (!session) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

    const { email, kakaoId } = session
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

    // 이메일 형태 변동 대응: email + kakao:id 두 가지로 기존 row 탐색
    const fallbackEmail = kakaoId ? `kakao:${kakaoId}` : null
    const searchEmails = fallbackEmail && email !== fallbackEmail
      ? [email, fallbackEmail]
      : [email]

    const { data: existingRows } = await supabase
      .from('kakao_tokens')
      .select('kakao_email')
      .in('kakao_email', searchEmails)
      .limit(1)

    if (existingRows && existingRows.length > 0) {
      await supabase
        .from('kakao_tokens')
        .update({ phone: digits })
        .eq('kakao_email', existingRows[0].kakao_email)
    } else {
      await supabase.from('kakao_tokens').insert({ kakao_email: email, phone: digits })
    }

    await supabase.from('phone_verifications').delete().eq('phone', digits)

    try {
      const { data: tokenRows } = await supabase
        .from('kakao_tokens').select('kakao_name').in('kakao_email', searchEmails).limit(1)
      await notifySignup({ phone: digits, customerName: tokenRows?.[0]?.kakao_name || '' })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('verify-code error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
