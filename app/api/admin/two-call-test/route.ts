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

const VESSEL_LABELS: Record<string, string> = {
  'white-noodle-bowl': 'white ceramic noodle bowl',
  'black-noodle-bowl': 'dark matte black noodle bowl',
  'white-plate':       'round white ceramic plate',
  'black-plate':       'round black ceramic plate',
  'ttukbbaeki':        'Korean earthenware ttukbaegi pot',
  'black-pot':         'black cast iron hot pot',
  'cold-noodle-bowl':  'stainless steel cold noodle bowl',
  'pasta-bowl':        'wide rimmed white pasta bowl',
}

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

const BG_TONE: Record<string, string> = {
  '라이트그레이':         'light gray',
  '아이보리':             'ivory',
  '화이트 대리석타일':    'white',
  '블랙 콘크리트':        'black',
  '아이보리 실크':        'ivory',
  '아이보리 페이퍼':      'ivory',
  '그레이 콘크리트':      'light gray',
  '거친 그레이 콘크리트': 'light gray',
  '화이트 터치드페인트':  'white',
  '화이트우드':           'white',
  '아이보리 우드':        'ivory',
  '베이지우드':           'beige',
  '브라운우드':           'brown',
  '다크브라운 우드':      'dark brown',
  '블랙 우드':            'black',
  '다크그레이':           'dark gray',
  '레몬':                 'light yellow',
  '베이비핑크':           'light pink',
}

function getCall1BgTone(backgroundName?: string, bgPrompt?: string): string {
  if (backgroundName && BG_TONE[backgroundName]) return BG_TONE[backgroundName]
  if (bgPrompt) {
    const p = bgPrompt.toLowerCase()
    if (p.includes('블랙') || p.includes('black') || p.includes('검')) return 'black'
    if (p.includes('다크') || p.includes('dark'))                       return 'dark gray'
    if (p.includes('화이트') || p.includes('white') || p.includes('흰')) return 'white'
    if (p.includes('아이보리') || p.includes('ivory'))                   return 'ivory'
    if (p.includes('그레이') || p.includes('gray') || p.includes('회색'))return 'light gray'
  }
  return 'light gray'
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
    const vessel         = (formData.get('vessel') as string) || 'original'

    const arrayBuffer = await photo.arrayBuffer()
    const foodBase64  = Buffer.from(arrayBuffer).toString('base64')
    const foodMime    = photo.type || 'image/jpeg'

    const hasBgImage   = !!(bgImageBase64 && bgImageMime)
    const surfaceColor = getSurfaceColor(backgroundName, bgPrompt)
    const bgName       = backgroundName?.trim() || bgPrompt?.trim() || ''
    const call1BgColor = getCall1BgTone(backgroundName, bgPrompt)

    const ANGLE_KO: Record<string, string> = {
      original: '',
      side45:   '구도는 45도 사이드뷰',
      topdown:  '구도는 top down view',
    }

    // ── Call 1: 음식 퀄리티 극대화 (최소 프롬프트) ──────────────────────────────
    const call1Lines = ['음식사진 업그레이드 해줘']
    const angleKo = ANGLE_KO[angle]
    if (angleKo) call1Lines.push(angleKo)
    call1Lines.push(`배경: ${call1BgColor}`)

    const call1Parts: unknown[] = [
      { inlineData: { data: foodBase64, mimeType: foodMime } },
      call1Lines.join('\n'),
    ]

    const enc = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: object) =>
          controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'))

        try {
          console.log(`[two-call-test] Call 1 시작 (1:1, ${call1BgColor} 배경)`)
          const call1 = await callGemini(call1Parts, '1:1')
          const call1Url = await uploadBase64(call1.data, 'ai_results/2call-test/call1')
          console.log('[two-call-test] Call 1 완료')
          send({ type: 'call1', url: call1Url })

          // ── Call 2: 배경 합성 + 비율 확장 ────────────────────────────────────
          const directionHint = (targetRatio === '9:16' || targetRatio === '3:4')
            ? 'top and bottom'
            : 'left and right'

          console.log(`[two-call-test] Call 2 hasBgImage: ${hasBgImage}, bgName: ${bgName}, surfaceColor: ${surfaceColor}`)

          const call2Parts: unknown[] = [
            { inlineData: { data: call1.data, mimeType: call1.mimeType } },
          ]
          if (hasBgImage) {
            call2Parts.push({ inlineData: { data: bgImageBase64!, mimeType: bgImageMime! } })
          }

          const bgTextureRef = hasBgImage
            ? 'Image 2 is the background texture reference.'
            : ''
          const bgFillDesc = hasBgImage
            ? 'Replace the solid background AND fill extended areas with the Image 2 texture.'
            : `Replace the solid background AND fill extended areas with: ${surfaceColor}${bgName ? ` (${bgName})` : ''} texture.`

          const vesselLabel = VESSEL_LABELS[vessel]
          const vesselLine  = vesselLabel
            ? `Change the bowl/dish to ${vesselLabel}. Keep ALL food ingredients exactly the same.`
            : ''

          call2Parts.push([
            `This is a 1:1 food photo on a solid ${call1BgColor} background.${bgTextureRef ? ' ' + bgTextureRef : ''}`,
            vesselLine,
            `${bgFillDesc} The background must change — the solid color becomes a textured surface.`,
            `Extend the canvas to ${targetRatio} by expanding the background on the ${directionHint} only.`,
            'CRITICAL: The food must stay at the EXACT same size, position, and scale. Do NOT shrink or reposition the food.',
            'Never crop the dish.',
            'OUTPUT: Food photo with updated dish (if changed), textured background, and extended ratio.',
          ].filter(Boolean).join('\n'))

          console.log(`[two-call-test] Call 2 시작 (${targetRatio})`)
          const call2 = await callGemini(call2Parts, targetRatio)
          const call2Url = await uploadBase64(call2.data, 'ai_results/2call-test/call2')
          console.log('[two-call-test] Call 2 완료')
          send({ type: 'call2', url: call2Url })
        } catch (e) {
          console.error('[two-call-test] stream error:', e)
          send({ type: 'error', message: String(e) })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    console.error('[two-call-test] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
