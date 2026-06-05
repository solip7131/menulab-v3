import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const photo = formData.get('photo') as File

    if (!photo) return NextResponse.json({ error: 'No photo' }, { status: 400 })

    const filename = `orders/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
    const bytes = await photo.arrayBuffer()

    const uploadPromise = supabaseAdmin.storage
      .from('photos')
      .upload(filename, Buffer.from(bytes), { contentType: 'image/jpeg' })

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Upload timeout')), 15000)
    )

    const { data, error } = await Promise.race([uploadPromise, timeout])

    if (error || !data) throw new Error(error?.message || 'Upload failed')

    const { data: urlData } = supabaseAdmin.storage.from('photos').getPublicUrl(filename)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (e) {
    console.error('upload error:', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
