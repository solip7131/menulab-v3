import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionFull } from '../../mypage/_utils'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ hasPhone: false })

  const session = verifySessionFull(token)
  if (!session) return NextResponse.json({ hasPhone: false, invalidSession: true })

  const { email, kakaoId } = session

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // email + kakao:id 두 가지 형태로 검색 (이메일 스코프 변동 대응)
  const searchEmails = kakaoId && email !== `kakao:${kakaoId}`
    ? [email, `kakao:${kakaoId}`]
    : [email]

  const { data } = await supabase
    .from('kakao_tokens')
    .select('phone')
    .in('kakao_email', searchEmails)
    .not('phone', 'is', null)
    .limit(1)

  return NextResponse.json({ hasPhone: !!(data?.[0]?.phone) })
}
