import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken } from '../../mypage/_utils'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ hasPhone: false })

  const email = verifySessionToken(token)
  if (!email) return NextResponse.json({ hasPhone: false, invalidSession: true })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await supabase
    .from('kakao_tokens')
    .select('phone')
    .eq('kakao_email', email)
    .not('phone', 'is', null)
    .limit(1)

  return NextResponse.json({ hasPhone: !!(data?.[0]?.phone) })
}
