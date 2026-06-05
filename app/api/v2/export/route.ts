export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let orderId: string
    let finalUrls: string[]

    if (contentType.includes('multipart/form-data')) {
      const fd = await req.formData()
      orderId = fd.get('orderId') as string
      if (!orderId) return NextResponse.json({ error: 'orderId 필수' }, { status: 400 })
      const files = fd.getAll('files') as File[]
      if (!files.length) return NextResponse.json({ error: '파일 없음' }, { status: 400 })

      finalUrls = []
      for (const file of files) {
        const filename = `ai_results/${orderId}_export_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`
        const bytes = await file.arrayBuffer()
        const { data, error } = await supabaseAdmin.storage
          .from('photos')
          .upload(filename, Buffer.from(bytes), { contentType: 'image/jpeg' })
        if (!error && data) {
          const { data: urlData } = supabaseAdmin.storage.from('photos').getPublicUrl(filename)
          finalUrls.push(urlData.publicUrl)
        }
      }
    } else {
      const body = await req.json()
      orderId = body.orderId
      finalUrls = body.urls || []
      if (!orderId) return NextResponse.json({ error: 'orderId 필수' }, { status: 400 })
    }

    if (!finalUrls.length) return NextResponse.json({ error: '내보낼 이미지가 없어요' }, { status: 400 })

    await supabaseAdmin.from('orders').update({
      ai_photo_urls: finalUrls,
      status: 'ai_done',
    }).eq('id', orderId)

    return NextResponse.json({ success: true, finalUrls })
  } catch (e) {
    console.error('export error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
