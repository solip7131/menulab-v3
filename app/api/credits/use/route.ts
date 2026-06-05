import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { userEmail, amount, description } = await req.json()

    if (!userEmail || !amount || amount <= 0) {
      return NextResponse.json({ error: '필수 파라미터가 없어요' }, { status: 400 })
    }

    // 현재 잔액 조회
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_email', userEmail)
      .single()

    const balance = credits?.balance ?? 0

    if (balance < amount) {
      return NextResponse.json(
        { error: 'insufficient', balance, needed: amount },
        { status: 402 },
      )
    }

    const newBalance = balance - amount

    // 잔액 차감
    const { error: updateErr } = await supabase
      .from('user_credits')
      .upsert(
        { user_email: userEmail, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_email' },
      )

    if (updateErr) throw updateErr

    // 거래 내역 기록
    const { error: txErr } = await supabase
      .from('credit_transactions')
      .insert({
        user_email:  userEmail,
        type:        'use',
        amount,
        description: description || `${amount}콩 사용`,
      })

    if (txErr) throw txErr

    return NextResponse.json({ balance: newBalance })
  } catch (e) {
    console.error('credits/use error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
