import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSessionToken } from '../../../mypage/_utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/mypage?kakao_error=denied`)
  }

  try {
    const redirectUri = process.env.KAKAO_REDIRECT_URI || `${origin}/api/auth/kakao/callback`

    // 1. 코드 → 액세스 토큰 교환
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_CLIENT_ID!,
      redirect_uri: redirectUri,
      code,
    }
    if (process.env.KAKAO_CLIENT_SECRET) {
      tokenParams.client_secret = process.env.KAKAO_CLIENT_SECRET
    }

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams(tokenParams),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('Kakao token error:', tokenData)
      const detail = encodeURIComponent(tokenData.error_description || tokenData.error || 'unknown')
      return NextResponse.redirect(`${origin}/mypage?kakao_error=token&detail=${detail}`)
    }

    // 2. 유저 정보 조회
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json()

    const kakaoId = String(userData.id)
    const email: string = userData.kakao_account?.email || `kakao:${kakaoId}`
    const nickname: string = userData.kakao_account?.profile?.nickname || userData.properties?.nickname || ''

    // 3. 카카오 토큰 Supabase 저장 (알림 전송용)
    // upsert 대신 update+insert 패턴 사용 — phone 컬럼을 건드리지 않기 위해
    try {
      const { data: existing } = await supabaseAdmin
        .from('kakao_tokens')
        .select('kakao_email')
        .eq('kakao_email', email)
        .maybeSingle()

      if (existing) {
        await supabaseAdmin
          .from('kakao_tokens')
          .update({
            kakao_name: nickname,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            updated_at: new Date().toISOString(),
          })
          .eq('kakao_email', email)
      } else {
        await supabaseAdmin.from('kakao_tokens').insert({
          kakao_email: email,
          kakao_name: nickname,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          updated_at: new Date().toISOString(),
        })
      }
    } catch {}

    // 4. 신규 유저 감지 → 20젬 즉시 지급
    // user_credits 행이 없으면 신규 가입 → insert 성공 시에만 거래 내역 기록
    try {
      const { data: newUser } = await supabaseAdmin
        .from('user_credits')
        .insert({ user_email: email, balance: 20 })
        .select('user_email')
        .single()

      if (newUser) {
        await supabaseAdmin.from('credit_transactions').insert({
          user_email: email,
          type: 'charge',
          amount: 20,
          won: 0,
          description: '신규 가입 보너스',
        })
      }
    } catch {}

    // 5. 세션 토큰 발급
    const sessionToken = createSessionToken(email)
    const sessionPayload = JSON.stringify({ token: sessionToken, email, name: nickname })

    // state에서 returnTo 디코딩 (없으면 쿠키 fallback, 그 다음 /mypage)
    let returnTo = ''
    const stateParam = searchParams.get('state')
    if (stateParam) {
      try {
        const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
        if (decoded.returnTo?.startsWith('/')) returnTo = decoded.returnTo
      } catch {}
    }
    if (!returnTo) {
      const cookieReturnTo = req.cookies.get('kakao_return_to')?.value
      if (cookieReturnTo?.startsWith('/')) returnTo = cookieReturnTo
    }
    if (!returnTo) returnTo = '/v2'

    const res = NextResponse.redirect(`${origin}${returnTo}`)
    res.cookies.delete('kakao_return_to')
    res.cookies.set('ml_kakao_session', sessionPayload, {
      httpOnly: false,
      maxAge: 30,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return res
  } catch (e) {
    console.error('Kakao callback error:', e)
    return NextResponse.redirect(`${origin}/mypage?kakao_error=server`)
  }
}
