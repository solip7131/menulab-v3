import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DOWNLOAD_COST = 10

export async function POST(req: NextRequest) {
  try {
    const { imageId, userEmail } = await req.json()

    if (!imageId || !userEmail) {
      return NextResponse.json({ error: '필수 파라미터가 없어요' }, { status: 400 })
    }

    // Check current balance
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_email', userEmail)
      .single()

    const balance = credits?.balance ?? 0

    if (balance < DOWNLOAD_COST) {
      return NextResponse.json(
        { error: 'insufficient', balance, needed: DOWNLOAD_COST },
        { status: 402 },
      )
    }

    // Deduct coins
    const newBalance = balance - DOWNLOAD_COST

    const { error: updateErr } = await supabase
      .from('user_credits')
      .upsert(
        { user_email: userEmail, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_email' },
      )

    if (updateErr) throw updateErr

    await supabase.from('credit_transactions').insert({
      user_email:  userEmail,
      type:        'use',
      amount:      DOWNLOAD_COST,
      description: '사진 다운로드',
    })

    // Get image record
    const { data: imgRecord, error: imgErr } = await supabase
      .from('generated_images')
      .select('image_url')
      .eq('id', imageId)
      .single()

    if (imgErr || !imgRecord) {
      return NextResponse.json({ error: '이미지를 찾을 수 없어요' }, { status: 404 })
    }

    // Create signed URL from storage path — serve original (no watermark) after payment
    const publicUrl  = imgRecord.image_url as string
    const bucketPath = publicUrl.split('/storage/v1/object/public/photos/')[1]

    if (!bucketPath) {
      return NextResponse.json({ url: publicUrl, balance: newBalance })
    }

    // Derive original path from watermarked path
    const origPath = bucketPath.includes('ai_results/wm/')
      ? bucketPath.replace('ai_results/wm/', 'ai_results/orig/')
      : bucketPath

    const { data: signedData, error: signErr } = await supabase.storage
      .from('photos')
      .createSignedUrl(origPath, 300)

    if (signErr || !signedData) {
      return NextResponse.json({ url: publicUrl, balance: newBalance })
    }

    return NextResponse.json({ url: signedData.signedUrl, balance: newBalance })
  } catch (e) {
    console.error('credits/download error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
