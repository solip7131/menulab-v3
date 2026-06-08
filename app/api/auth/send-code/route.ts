import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken } from '../../mypage/_utils'
import { sendSms } from '../../../../lib/solapi'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

    const email = verifySessionToken(token)
    if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

    const { phone } = await req.json()
    const digits = phone?.replace(/\D/g, '')
    if (!digits || digits.length < 10) {
      return NextResponse.json({ error: '올바른 전화번호를 입력해주세요' }, { status: 400 })
    }

    const code      = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    await supabase.from('phone_verifications').delete().eq('phone', digits)

    const { error: insertError } = await supabase.from('phone_verifications').insert({
      phone: digits,
      code,
      email,
      expires_at: expiresAt,
    })
    if (insertError) throw insertError

    await sendSms(phone, `[메뉴랩] 인증번호 ${code}\n3분 내 입력해 주세요.`)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('send-code error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
