export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BG_SURFACE: Record<string, string> = {
  '라이트그레이':         'light gray',
  '아이보리':             'warm ivory',
  '화이트 대리석타일':    'pure white marble',
  '블랙 콘크리트':        'dark charcoal concrete',
  '아이보리 실크':        'warm ivory',
  '아이보리 페이퍼':      'warm ivory',
  '그레이 콘크리트':      'gray concrete',
  '거친 그레이 콘크리트': 'rough gray concrete',
  '화이트 터치드페인트':  'off-white paint',
  '화이트우드':           'white wood',
  '아이보리 우드':        'ivory wood',
  '베이지우드':           'beige wood',
  '브라운우드':           'brown wood',
  '다크브라운 우드':      'dark brown wood',
  '블랙 우드':            'black wood',
  '다크그레이':           'dark gray',
  '레몬':                 'lemon yellow',
  '베이비핑크':           'baby pink',
}

function getSurfaceColor(backgroundName?: string, bgPrompt?: string): string {
  if (backgroundName && BG_SURFACE[backgroundName]) return BG_SURFACE[backgroundName]
  if (bgPrompt) {
    const p = bgPrompt.toLowerCase()
    if (p.includes('흰') || p.includes('화이트') || p.includes('white')) return 'pure white'
    if (p.includes('검') || p.includes('블랙') || p.includes('black'))   return 'dark charcoal'
    if (p.includes('아이보리') || p.includes('ivory'))                   return 'warm ivory'
    if (p.includes('그레이') || p.includes('gray') || p.includes('회색'))return 'light gray'
    if (p.includes('콘크리트') || p.includes('concrete'))                return 'dark charcoal gray'
  }
  return 'neutral light gray'
}

const GEMINI_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9'])
function toGeminiAspect(ratio: string): string {
  return GEMINI_ASPECT_RATIOS.has(ratio) ? ratio : '4:3'
}

async function callGemini(
  parts: unknown[],
  aspectRatio = '1:1',
): Promise<{ data: string; mimeType: string }> {
  const contents = [{
    role: 'user',
    parts: parts.map(p => typeof p === 'string' ? { text: p } : p),
  }]
  const geminiAspect = toGeminiAspect(aspectRatio)
  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: contents as never,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: geminiAspect },
        } as never,
      })
      const resParts: unknown[] = (result as any).candidates?.[0]?.content?.parts ?? []
      for (const part of resParts) {
        const id = (part as any).inlineData
        if (id?.mimeType?.startsWith('image/')) return { data: id.data, mimeType: id.mimeType }
      }
      throw new Error('AI가 이미지를 반환하지 않았어요')
    } catch (err: any) {
      const is503 = err?.message?.includes('503')
      console.error(`Gemini attempt ${attempt}/${MAX_RETRIES}:`, err?.message ?? err)
      if (attempt < MAX_RETRIES && is503) {
        await new Promise(r => setTimeout(r, 3000 * attempt))
        continue
      }
      throw err
    }
  }
  throw new Error('Gemini max retries exceeded')
}

async function uploadBase64(imageBase64: string, folder: string): Promise<string | null> {
  try {
    const rawBuffer = Buffer.from(imageBase64, 'base64')
    const jpegBuffer = await sharp(rawBuffer).jpeg({ quality: 92 }).toBuffer()
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const filePath = `${folder}/${uid}.jpg`
    await supabase.storage.from('photos').upload(filePath, jpegBuffer, { contentType: 'image/jpeg', upsert: false })
    const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
    return data.publicUrl
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminPassword = req.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: '사진 없음' }, { status: 400 })

    const bgImageBase64  = formData.get('bgImageBase64')  as string | undefined
    const bgImageMime    = formData.get('bgImageMime')    as string | undefined
    const backgroundName = formData.get('backgroundName') as string | undefined
    const bgPrompt       = formData.get('bgPrompt')       as string | undefined
    const targetRatio    = (formData.get('targetRatio') as string) || '4:3'
    const angle          = (formData.get('angle') as string) || 'original'

    const arrayBuffer = await photo.arrayBuffer()
    const foodBase64  = Buffer.from(arrayBuffer).toString('base64')
    const foodMime    = photo.type || 'image/jpeg'

    const hasBgImage   = !!(bgImageBase64 && bgImageMime)
    const surfaceColor = getSurfaceColor(backgroundName, bgPrompt)
    const bgName       = backgroundName?.trim() || bgPrompt?.trim() || ''
    const call1BgColor = surfaceColor

    const ANGLE_INSTRUCTIONS: Record<string, string> = {
      original: 'Keep the ORIGINAL camera angle and composition as close as possible to the input photo. Do NOT force 45-degree angle.',
      side45:   'Camera: 45-degree side angle, dish rim visible as ellipse, side of dish clearly visible.',
      topdown:  'Camera: directly overhead (90-degree top-down view), food fills frame naturally.',
    }

    // ── Call 1: 음식 퀄리티 극대화 + 단순 솔리드 배경 ───────────────────────────
    const call1Parts: unknown[] = [
      { inlineData: { data: foodBase64, mimeType: foodMime } },
      [
        ANGLE_INSTRUCTIONS[angle] ?? ANGLE_INSTRUCTIONS.original,
        '이 음식 사진을 최고급 상업용 음식 사진으로 드라마틱하게 업그레이드해줘.',
        '음식의 색감, 질감, 광택, 신선도, 디테일을 극적으로 향상시켜줘.',
        '원본에 없는 재료, 소품, 그릇은 절대 추가하지 말 것. 음식과 그릇은 원본 그대로 유지.',
        `배경: solid ${call1BgColor} only — no texture, no gradient, no shadow on background.`,
        'Lighting: soft studio light from above. Gentle natural shadow directly beneath the dish only.',
        'FRAMING: Dish centered, occupies about 60% of frame. Never crop the dish.',
        'OUTPUT: Enhanced food photo on solid background only.',
      ].join('\n'),
    ]

    console.log(`[two-call-test] Call 1 시작 (1:1, 음식퀄리티, ${call1BgColor} 배경)`)
    const call1 = await callGemini(call1Parts, '1:1')
    const call1Url = await uploadBase64(call1.data, 'ai_results/2call-test/call1')
    console.log('[two-call-test] Call 1 완료')

    // ── Call 2: 실제 배경 합성 + 비율 확장 ──────────────────────────────────────
    const directionHint = (targetRatio === '9:16' || targetRatio === '3:4')
      ? 'top and bottom'
      : 'left and right'

    const call2Parts: unknown[] = [
      { inlineData: { data: call1.data, mimeType: call1.mimeType } },
    ]
    if (hasBgImage) {
      call2Parts.push({ inlineData: { data: bgImageBase64!, mimeType: bgImageMime! } })
    }

    const bgInstruction = hasBgImage
      ? 'Last image is the background texture reference. Replace the solid background with that texture naturally.'
      : `Replace the solid background with: ${surfaceColor} surface${bgName ? ` (${bgName})` : ''}.`

    call2Parts.push([
      `This food photo has a solid ${call1BgColor} background. Do the following:`,
      `1. ${bgInstruction}`,
      `2. Extend the image to ${targetRatio} aspect ratio by expanding the background on the ${directionHint}. Background must continue seamlessly.`,
      'CRITICAL: Keep the food, dish, and composition EXACTLY as-is. Do NOT alter the food in any way.',
      'Never crop the dish.',
      'Lighting on food must remain unchanged.',
      'OUTPUT: Final food photo with background and correct aspect ratio.',
    ].join('\n'))

    console.log(`[two-call-test] Call 2 시작 (${targetRatio}, 배경합성+확장)`)
    const call2 = await callGemini(call2Parts, targetRatio)
    const call2Url = await uploadBase64(call2.data, 'ai_results/2call-test/call2')
    console.log('[two-call-test] Call 2 완료')

    return NextResponse.json({ call1Url, call2Url })
  } catch (e) {
    console.error('[two-call-test] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
