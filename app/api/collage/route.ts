export const maxDuration = 180
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { notifyAiDone } from '../../../lib/solapi'
import { verifySessionToken } from '../mypage/_utils'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BG_SURFACE: Record<string, string> = {
  '라이트그레이': 'light gray', '아이보리': 'warm ivory',
  '화이트 대리석타일': 'pure white marble', '블랙 콘크리트': 'dark charcoal concrete',
  '아이보리 실크': 'warm ivory', '아이보리 페이퍼': 'warm ivory',
  '그레이 콘크리트': 'gray concrete', '거친 그레이 콘크리트': 'rough gray concrete',
  '화이트 터치드페인트': 'off-white paint', '화이트우드': 'white wood',
  '아이보리 우드': 'ivory wood', '베이지우드': 'beige wood',
  '브라운우드': 'brown wood', '다크브라운 우드': 'dark brown wood',
  '블랙 우드': 'black wood', '다크그레이': 'dark gray',
  '레몬': 'lemon yellow', '베이비핑크': 'baby pink',
}

function getSurfaceColor(backgroundName?: string): string {
  if (backgroundName && BG_SURFACE[backgroundName]) return BG_SURFACE[backgroundName]
  return 'neutral light gray'
}

function buildWmSvg(w: number, h: number): Buffer {
  const tileW = 150, tileH = 90
  let t = ''
  for (let r = -1; r <= Math.ceil(h / tileH) + 1; r++)
    for (let c = -1; c <= Math.ceil(w / tileW) + 1; c++) {
      const cx = c * tileW + tileW / 2, cy = r * tileH + tileH / 2
      t += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-35,${cx},${cy})" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="rgba(255,255,255,0.4)" stroke="rgba(0,0,0,0.1)" stroke-width="0.5">Menulab</text>`
    }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${t}</svg>`)
}

async function callGemini(parts: unknown[]): Promise<{ data: string; mimeType: string }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image',
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as never,
  })
  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(parts as never)
      const candidates = result.response.candidates?.[0]?.content?.parts ?? []
      for (const part of candidates) {
        const id = (part as { inlineData?: { mimeType: string; data: string } }).inlineData
        if (id?.mimeType?.startsWith('image/')) return { data: id.data, mimeType: id.mimeType }
      }
      throw new Error('AI가 이미지를 반환하지 않았어요')
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const is503 = errMsg.includes('503')
      if (attempt < MAX_RETRIES && is503) { await new Promise(r => setTimeout(r, 3000 * attempt)); continue }
      throw err
    }
  }
  throw new Error('Gemini max retries exceeded')
}

async function uploadWithWatermark(imageBase64: string): Promise<{ wmUrl: string; origPath: string; wmPath: string } | null> {
  try {
    const rawBuffer = Buffer.from(imageBase64, 'base64')
    const meta = await sharp(rawBuffer).metadata()
    const w = meta.width ?? 800, h = meta.height ?? 600
    const wmBuffer = await sharp(rawBuffer)
      .composite([{ input: buildWmSvg(w, h), top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer()
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const origPath = `ai_results/orig/${uid}.jpg`
    const wmPath = `ai_results/wm/${uid}.jpg`
    await supabase.storage.from('photos').upload(origPath, rawBuffer, { contentType: 'image/jpeg', upsert: false })
    const { error } = await supabase.storage.from('photos').upload(wmPath, wmBuffer, { contentType: 'image/jpeg', upsert: false })
    if (error) return null
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(wmPath)
    return { wmUrl: urlData.publicUrl, origPath, wmPath }
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })
    const email = verifySessionToken(token)
    if (!email) return NextResponse.json({ error: '세션이 만료됐어요' }, { status: 401 })

    const body = await req.json()
    const foodImages = body.foodImages as { base64: string; mime: string }[]
    const backgroundName = body.backgroundName as string | undefined
    const bgImageBase64 = body.bgImageBase64 as string | undefined
    const bgImageMime = body.bgImageMime as string | undefined
    const angle = (body.angle as string | undefined) ?? 'topdown'

    if (!foodImages || foodImages.length < 2) {
      return NextResponse.json({ error: '음식 사진을 최소 2장 업로드해주세요' }, { status: 400 })
    }

    const { data: credits } = await supabase
      .from('user_credits').select('balance').eq('user_email', email).single()
    const balance = credits?.balance ?? 0
    if (balance < 40) {
      return NextResponse.json({ error: 'insufficient', balance, needed: 40 }, { status: 402 })
    }
    const newBalance = balance - 40
    await supabase.from('user_credits').upsert(
      { user_email: email, balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: 'user_email' },
    )
    await supabase.from('credit_transactions').insert({
      user_email: email, type: 'use', amount: 40, description: '모음컷 생성',
    })

    const surfaceColor = getSurfaceColor(backgroundName)
    const angleInstruction = angle === 'topdown'
      ? 'Camera angle: directly overhead (top-down flat lay view)'
      : 'Camera angle: 45-degree side angle, natural table setting view'

    const COLLAGE_PROMPT = `You are a professional food photographer.
These ${foodImages.length} images show different food dishes.
Create a single beautiful collage image that naturally arranges ALL these food dishes together on one surface.
${angleInstruction}.
Background surface: ${surfaceColor} studio background.
Arrange all dishes in a natural, aesthetically pleasing composition.
Each dish should be clearly visible and proportionally sized.
Enhance colors and lighting for professional food photography.
No extra props (chopsticks, napkins etc.) unless already in the photos.
Output: single composited collage image, 1280x960 pixels.`

    const parts: unknown[] = foodImages.map(img => ({
      inlineData: { data: img.base64, mimeType: img.mime }
    }))

    if (bgImageBase64 && bgImageMime) {
      parts.push({ inlineData: { data: bgImageBase64, mimeType: bgImageMime } })
    }
    parts.push(COLLAGE_PROMPT)

    const img = await callGemini(parts)
    const upload = await uploadWithWatermark(img.data)
    if (!upload) throw new Error('이미지 저장에 실패했어요')

    try {
      await supabase.from('generated_images').insert({
        user_email: email,
        image_url: upload.wmUrl,
        category: '모음컷',
        platform: '기본',
        background_name: backgroundName ?? null,
      })
    } catch {}

    try {
      const { data: tokenRows } = await supabase
        .from('kakao_tokens').select('phone, kakao_name').eq('kakao_email', email).not('phone', 'is', null).limit(1)
      const tokenRow = tokenRows?.[0]
      if (tokenRow?.phone) {
        await notifyAiDone({ phone: tokenRow.phone, customerName: tokenRow.kakao_name ?? '' })
      }
    } catch {}

    return NextResponse.json({ imageBase64: img.data, imageMime: img.mimeType, wmUrl: upload.wmUrl, newBalance })
  } catch (e: unknown) {
    console.error('collage error:', e)
    const errMsg = e instanceof Error ? e.message : String(e)
    if (errMsg.includes('insufficient')) {
      return NextResponse.json({ error: 'insufficient' }, { status: 402 })
    }
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
