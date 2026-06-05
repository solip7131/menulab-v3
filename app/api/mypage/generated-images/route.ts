import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken } from '../_utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

  const email = verifySessionToken(token)
  if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

  const { data, error } = await supabase
    .from('generated_images')
    .select('id, image_url, category, platform, background_name, created_at')
    .eq('user_email', email)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('generated-images GET error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }

  return NextResponse.json({ images: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

  const email = verifySessionToken(token)
  if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

  const { imageId } = await req.json()
  if (!imageId) return NextResponse.json({ error: 'imageId 필요' }, { status: 400 })

  // Verify ownership
  const { data: img } = await supabase
    .from('generated_images')
    .select('image_url')
    .eq('id', imageId)
    .eq('user_email', email)
    .single()

  if (!img) return NextResponse.json({ error: '이미지를 찾을 수 없어요' }, { status: 404 })

  const { error: delErr } = await supabase
    .from('generated_images')
    .delete()
    .eq('id', imageId)

  if (delErr) return NextResponse.json({ error: String(delErr) }, { status: 500 })

  // Best-effort Storage deletion
  try {
    const path = (img.image_url as string).split('/storage/v1/object/public/photos/')[1]
    if (path) await supabase.storage.from('photos').remove([path])
  } catch {}

  return NextResponse.json({ ok: true })
}
