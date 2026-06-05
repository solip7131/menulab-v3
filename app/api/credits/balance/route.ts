import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken } from '../../mypage/_utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ balance: 0 })

  const email = verifySessionToken(token)
  if (!email) return NextResponse.json({ balance: 0 })

  const { data } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_email', email)
    .single()

  return NextResponse.json({ balance: data?.balance ?? 0 })
}
