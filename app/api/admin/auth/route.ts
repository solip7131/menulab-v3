import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: '비밀번호가 틀렸어요' }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}
