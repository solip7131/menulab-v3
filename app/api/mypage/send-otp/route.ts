import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { generateOtp } from '../_utils'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '올바른 이메일을 입력해주세요' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const otp = generateOtp(normalizedEmail)

    const gmailUser = process.env.GMAIL_USER
    const gmailPass = process.env.GMAIL_PASS

    if (!gmailUser || !gmailPass || gmailUser === 'your@gmail.com') {
      return NextResponse.json({ error: '이메일 발송 설정이 필요합니다. .env.local에 GMAIL_USER와 GMAIL_PASS를 설정해주세요.' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    })

    await transporter.sendMail({
      from: `메뉴랩 <${gmailUser}>`,
      to: email,
      subject: '[메뉴랩] 로그인 인증 코드',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style="height: 48px; margin-bottom: 32px;" />
          <h2 style="font-size: 22px; font-weight: 900; margin-bottom: 8px; color: #0d0d0d;">마이페이지 로그인 코드</h2>
          <p style="color: #666; font-size: 15px; margin-bottom: 32px; line-height: 1.6;">아래 6자리 코드를 입력해주세요. 코드는 5분간 유효합니다.</p>
          <div style="background: #f5f5f5; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
            <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #FF5C00;">${otp}</span>
          </div>
          <p style="color: #aaa; font-size: 13px;">본인이 요청하지 않으셨다면 이 이메일을 무시하세요.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('send-otp error:', e)
    return NextResponse.json({ error: '이메일 발송에 실패했어요' }, { status: 500 })
  }
}
