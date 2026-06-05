import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'KAKAO_CLIENT_ID 환경변수가 설정되지 않았습니다.' }, { status: 500 })
  }

  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/kakao/callback`

  const returnTo = req.nextUrl.searchParams.get('returnTo') || '/mypage'
  const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/mypage'
  const state = Buffer.from(JSON.stringify({ returnTo: safeReturnTo })).toString('base64url')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'profile_nickname,profile_image',
    state,
  })

  const res = NextResponse.redirect(`https://kauth.kakao.com/oauth/authorize?${params}`)
  // cookie fallback — in case Kakao echoes state back differently
  res.cookies.set('kakao_return_to', safeReturnTo, {
    httpOnly: true,
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
