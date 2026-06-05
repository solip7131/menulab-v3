import { NextRequest, NextResponse } from 'next/server'
import { verifyOtpCode, createSessionToken } from '../_utils'

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: '이메일과 코드를 입력해주세요' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (!verifyOtpCode(normalizedEmail, code)) {
      return NextResponse.json({ error: '코드가 올바르지 않아요. 다시 확인해주세요.' }, { status: 400 })
    }

    const token = createSessionToken(normalizedEmail)
    return NextResponse.json({ success: true, token, email: normalizedEmail })
  } catch (e) {
    console.error('verify-otp error:', e)
    return NextResponse.json({ error: '인증에 실패했어요' }, { status: 500 })
  }
}
